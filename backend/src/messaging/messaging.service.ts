import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async list(user: AuthUser, institutionId: string) {
    await this.requireMembership(user.id, institutionId);
    const { data: participants, error } = await this.db.from('message_participants')
      .select('thread_id').eq('user_id', user.id);
    if (error) throw new BadRequestException('Conversations indisponibles.');
    const ids = (participants ?? []).map((row: any) => row.thread_id);
    if (!ids.length) return { threads: [] };
    const { data, error: threadsError } = await this.db.from('message_threads')
      .select('id, institution_id, created_at').eq('institution_id', institutionId)
      .in('id', ids).order('created_at', { ascending: false }).limit(50);
    if (threadsError) throw new BadRequestException('Conversations indisponibles.');
    return { threads: data ?? [] };
  }

  async create(user: AuthUser, institutionId: string, recipientId: string) {
    if (!institutionId || !recipientId || recipientId === user.id) {
      throw new BadRequestException('Destinataire invalide.');
    }
    await Promise.all([
      this.requireMembership(user.id, institutionId),
      this.requireMembership(recipientId, institutionId),
    ]);
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
      .select('id, sender_id, body, created_at').eq('thread_id', threadId)
      .order('created_at', { ascending: true }).limit(100);
    if (error) throw new BadRequestException('Messages indisponibles.');
    return { messages: data ?? [] };
  }

  async send(user: AuthUser, threadId: string, body: string) {
    await this.requireParticipant(user.id, threadId);
    const content = typeof body === 'string' ? body.trim() : '';
    if (!content || content.length > 4000) throw new BadRequestException('Message invalide (1 à 4000 caractères).');
    const { data, error } = await this.db.from('private_messages')
      .insert({ thread_id: threadId, sender_id: user.id, body: content })
      .select('id, sender_id, body, created_at').single();
    if (error || !data) throw new BadRequestException('Envoi impossible.');
    return { message: data };
  }
}
