import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = { id: string };

@Injectable()
export class MessagingService {
  constructor(private readonly supabase: SupabaseService) {}

  // Tables are introduced by a staged migration and intentionally accessed
  // through the server client, not the browser's Supabase client.
  private get db(): any { return this.supabase.client; }

  private async requireMembership(userId: string, institutionId: string) {
    const [{ data: membership, error }, { data: institution, error: institutionError }] = await Promise.all([
      this.db.from('institution_members').select('user_id').eq('institution_id', institutionId).eq('user_id', userId).maybeSingle(),
      this.db.from('institutions').select('owner_user_id').eq('id', institutionId).maybeSingle(),
    ]);
    if (error || institutionError || (!membership && institution?.owner_user_id !== userId)) {
      throw new ForbiddenException('Accès à cet établissement refusé.');
    }
  }

  private async requireParticipant(userId: string, threadId: string) {
    const { data: participant, error } = await this.db.from('message_participants')
      .select('user_id').eq('thread_id', threadId).eq('user_id', userId).maybeSingle();
    if (error || !participant) throw new ForbiddenException('Conversation inaccessible.');
    const { data: thread, error: threadError } = await this.db.from('message_threads')
      .select('id, institution_id, created_at').eq('id', threadId).maybeSingle();
    if (threadError || !thread) throw new NotFoundException('Conversation introuvable.');
    await this.requireMembership(userId, thread.institution_id);
    return thread;
  }

  async directory(user: AuthUser, institutionId: string, search = '') {
    await this.requireMembership(user.id, institutionId);
    const { data: members, error } = await this.db.from('institution_members')
      .select('user_id, role').eq('institution_id', institutionId).limit(300);
    if (error) throw new BadRequestException('Annuaire indisponible.');
    const { data: institution } = await this.db.from('institutions')
      .select('owner_user_id').eq('id', institutionId).maybeSingle();
    const ids = [...new Set([...(members ?? []).map((m: any) => m.user_id), institution?.owner_user_id]
      .filter((id: string) => id && id !== user.id))];
    if (!ids.length) return { members: [] };
    const { data: profiles, error: profileError } = await this.db.from('profiles')
      .select('id, fullname, email').in('id', ids).limit(300);
    if (profileError) throw new BadRequestException('Annuaire indisponible.');
    const needle = search.trim().toLocaleLowerCase('fr').slice(0, 80);
    return { members: (profiles ?? [])
      .filter((p: any) => !needle || String(p.fullname ?? '').toLocaleLowerCase('fr').includes(needle))
      .map((p: any) => ({ id: p.id, name: p.fullname || 'Membre', role: members?.find((m: any) => m.user_id === p.id)?.role ?? 'owner' }))
      .slice(0, 100) };
  }

  async list(user: AuthUser, institutionId: string) {
    await this.requireMembership(user.id, institutionId);
    const { data: participants, error } = await this.db.from('message_participants')
      .select('thread_id').eq('user_id', user.id);
    if (error) throw new BadRequestException('Conversations indisponibles.');
    const ids = (participants ?? []).map((row: any) => row.thread_id);
    if (!ids.length) return { threads: [] };
    const { data, error: threadsError } = await this.db.from('message_threads')
      .select('id, institution_id, created_at, last_message_at').eq('institution_id', institutionId)
      .in('id', ids).order('last_message_at', { ascending: false }).limit(50);
    if (threadsError) throw new BadRequestException('Conversations indisponibles.');
    if (!(data ?? []).length) return { threads: [] };
    const { data: peers, error: peersError } = await this.db.from('message_participants')
      .select('thread_id, user_id, last_read_at').in('thread_id', (data ?? []).map((t: any) => t.id));
    if (peersError) throw new BadRequestException('Participants indisponibles.');
    const peerIds = [...new Set((peers ?? []).map((p: any) => p.user_id).filter((id: string) => id !== user.id))];
    let profiles: any[] = [];
    if (peerIds.length) {
      const { data: profileRows, error: profileError } = await this.db.from('profiles').select('id, fullname').in('id', peerIds);
      if (profileError) throw new BadRequestException('Profils indisponibles.');
      profiles = profileRows ?? [];
    }
    return { threads: (data ?? []).map((thread: any) => {
      const participants = (peers ?? []).filter((p: any) => p.thread_id === thread.id);
      const other = participants.filter((p: any) => p.user_id !== user.id);
      return { ...thread, recipients: other.map((p: any) => ({
        id: p.user_id, name: profiles.find((v: any) => v.id === p.user_id)?.fullname ?? 'Membre',
      })), lastReadAt: participants.find((p: any) => p.user_id === user.id)?.last_read_at ?? null };
    }) };
  }

  async create(user: AuthUser, institutionId: string, recipientId: string) {
    if (!institutionId || !recipientId || recipientId === user.id) {
      throw new BadRequestException('Destinataire invalide.');
    }
    await Promise.all([
      this.requireMembership(user.id, institutionId),
      this.requireMembership(recipientId, institutionId),
    ]);
    const { threads: existing } = await this.list(user, institutionId);
    const direct = existing.find((t: any) => t.recipients?.length === 1 && t.recipients[0].id === recipientId);
    if (direct) return { thread: direct };
    const { data: thread, error } = await this.db.from('message_threads')
      .insert({ institution_id: institutionId, created_by: user.id })
      .select('id, institution_id, created_at').single();
    if (error || !thread) throw new BadRequestException('Création impossible.');
    const { error: membersError } = await this.db.from('message_participants').insert([
      { thread_id: thread.id, user_id: user.id },
      { thread_id: thread.id, user_id: recipientId },
    ]);
    if (membersError) {
      await this.db.from('message_threads').delete().eq('id', thread.id);
      throw new BadRequestException('Création des participants impossible.');
    }
    return { thread };
  }

  async messages(user: AuthUser, threadId: string) {
    await this.requireParticipant(user.id, threadId);
    const { data, error } = await this.db.from('private_messages')
      .select('id, sender_id, body, created_at, deleted_at, attachment_path, attachment_name, attachment_type, attachment_size').eq('thread_id', threadId)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException('Messages indisponibles.');
    return { messages: (data ?? []).filter((m: any) => !m.deleted_at).reverse() };
  }

  async send(user: AuthUser, threadId: string, body: string) {
    await this.requireParticipant(user.id, threadId);
    const content = typeof body === 'string' ? body.trim() : '';
    if (!content || content.length > 4000) throw new BadRequestException('Message invalide (1 à 4000 caractères).');
    const { data, error } = await this.db.from('private_messages')
      .insert({ thread_id: threadId, sender_id: user.id, body: content })
      .select('id, sender_id, body, created_at').single();
    if (error || !data) throw new BadRequestException('Envoi impossible.');
    await this.db.from('message_threads').update({ last_message_at: data.created_at }).eq('id', threadId);
    await this.notifyOtherParticipants(user.id, threadId).catch(() => undefined);
    return { message: data };
  }
  private async notifyOtherParticipants(senderId: string, threadId: string) {
    const { data: participants } = await this.db.from('message_participants')
      .select('user_id').eq('thread_id', threadId);
    const recipients = (participants ?? []).filter((p: any) => p.user_id !== senderId);
    if (!recipients.length) return;
    const { data: profile } = await this.db.from('profiles')
      .select('fullname').eq('id', senderId).maybeSingle();
    await this.db.from('notifications').insert(recipients.map((p: any) => ({
      user_id: p.user_id, type: 'system', title: 'Nouveau message',
      message: `Message de ${profile?.fullname ?? 'un membre de votre établissement'}`,
      href: '/establishment',
    })));
  }

  async markRead(user: AuthUser, threadId: string) {
    await this.requireParticipant(user.id, threadId);
    const { error } = await this.db.from('message_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId).eq('user_id', user.id);
    if (error) throw new BadRequestException('Lecture non enregistrée.');
    return { status: 'read' };
  }

  async attach(user: AuthUser, threadId: string, file: {
    buffer: Buffer; mimetype: string; originalname: string; size: number;
  }) {
    await this.requireParticipant(user.id, threadId);
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
    if (!file?.buffer || !allowed.includes(file.mimetype) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Fichier non autorisé (PDF ou image, 10 Mo maximum).');
    }
    const path = `${threadId}/${randomUUID()}`;
    const { error: uploadError } = await this.db.storage.from('private-messaging')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) throw new BadRequestException('Transfert impossible.');
    const { data, error } = await this.db.from('private_messages').insert({
      thread_id: threadId, sender_id: user.id, body: '',
      attachment_path: path, attachment_name: file.originalname.slice(0, 180),
      attachment_type: file.mimetype, attachment_size: file.size,
    }).select('id, sender_id, body, created_at, attachment_name').single();
    if (error || !data) {
      await this.db.storage.from('private-messaging').remove([path]);
      throw new BadRequestException('Pièce jointe non enregistrée.');
    }
    await this.db.from('message_threads').update({ last_message_at: data.created_at }).eq('id', threadId);
    await this.notifyOtherParticipants(user.id, threadId);
    return { message: data };
  }

  async download(user: AuthUser, threadId: string, messageId: string) {
    await this.requireParticipant(user.id, threadId);
    const { data: message } = await this.db.from('private_messages')
      .select('attachment_path, attachment_name').eq('thread_id', threadId)
      .eq('id', messageId).is('deleted_at', null).maybeSingle();
    if (!message?.attachment_path) throw new NotFoundException('Fichier introuvable.');
    const { data, error } = await this.db.storage.from('private-messaging')
      .createSignedUrl(message.attachment_path, 60, { download: message.attachment_name });
    if (error || !data?.signedUrl) throw new BadRequestException('Téléchargement indisponible.');
    return { url: data.signedUrl };
  }

}
