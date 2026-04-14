import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

type InstitutionRole = 'owner' | 'admin' | 'teacher' | 'student';
type RoomRole = 'teacher' | 'student' | 'assistant';

@Injectable()
export class InstitutionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getMyInstitutions(user: AuthUser) {
    const role = await this.resolveGlobalRole(user.id, user.role);

    if (role === 'institution') {
      const { data, error } = await this.supabaseService.client
        .from('institutions')
        .select('*')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw new BadRequestException(error.message);
      }

      return data ?? [];
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .select(
        `
          role,
          joined_at,
          institutions (
            id,
            name,
            slug,
            contact_email,
            institution_type,
            description,
            subscription_status,
            plan_name,
            max_students,
            max_rooms,
            created_at
          )
        `,
      )
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((row: any) => ({
      membershipRole: row.role,
      joinedAt: row.joined_at,
      ...(Array.isArray(row.institutions) ? row.institutions[0] : row.institutions),
    }));
  }

  async createInstitution(
    user: AuthUser,
    payload: {
      name: string;
      slug?: string;
      contact_email?: string;
      institution_type?: string;
      description?: string;
      country?: string;
      plan_name?: string;
      max_students?: number;
      max_rooms?: number;
    },
  ) {
    const globalRole = await this.resolveGlobalRole(user.id, user.role);

    if (!['institution', 'admin'].includes(globalRole ?? '')) {
      throw new ForbiddenException(
        "Seuls les comptes etablissement peuvent creer un espace institutionnel.",
      );
    }

    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException("Le nom de l'etablissement est obligatoire.");
    }

    const slug = this.buildSlug(payload.slug || name);
    const maxStudents = Number(payload.max_students ?? 100);
    const maxRooms = Number(payload.max_rooms ?? 10);

    if (Number.isNaN(maxStudents) || maxStudents < 1) {
      throw new BadRequestException('Le nombre maximal etudiants est invalide.');
    }

    if (Number.isNaN(maxRooms) || maxRooms < 1) {
      throw new BadRequestException('Le nombre maximal de salles est invalide.');
    }

    const { data: institution, error } = await this.supabaseService.client
      .from('institutions')
      .insert({
        name,
        slug,
        owner_user_id: user.id,
        contact_email: payload.contact_email?.trim() || null,
        institution_type: payload.institution_type?.trim() || null,
        description: payload.description?.trim() || null,
        country: payload.country?.trim() || 'Cameroun',
        plan_name: payload.plan_name?.trim() || 'starter',
        max_students: maxStudents,
        max_rooms: maxRooms,
      })
      .select('*')
      .single();

    if (error || !institution) {
      throw new BadRequestException(
        error?.message ?? "Impossible de creer l'etablissement.",
      );
    }

    const { error: memberError } = await this.supabaseService.client
      .from('institution_members')
      .upsert(
        {
          institution_id: institution.id,
          user_id: user.id,
          role: 'owner',
        },
        { onConflict: 'institution_id,user_id' },
      );

    if (memberError) {
      throw new BadRequestException(
        memberError.message ??
          "L'etablissement a ete cree mais le compte proprietaire n'a pas ete rattache.",
      );
    }

    return institution;
  }

  async getInstitutionDetails(user: AuthUser, institutionId: string) {
    await this.assertInstitutionAccess(user.id, institutionId);

    const [institutionRes, roomsRes, membersRes, assignmentsRes, invitesRes] = await Promise.all([
      this.supabaseService.client
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .single(),
      this.supabaseService.client
        .from('rooms')
        .select('id, name, slug, description, created_at')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false }),
      this.supabaseService.client
        .from('institution_members')
        .select('id, role, joined_at, profiles ( id, fullname, email, role )')
        .eq('institution_id', institutionId)
        .order('joined_at', { ascending: false }),
      this.supabaseService.client
        .from('assignments')
        .select('id, title, status, due_at, room_id, created_at')
        .in(
          'room_id',
          await this.getInstitutionRoomIds(institutionId),
        )
        .order('created_at', { ascending: false }),
      this.supabaseService.client
        .from('room_invites')
        .select(
          'id, room_id, token, invite_role, expires_at, max_uses, used_count, is_active, created_at',
        )
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false }),
    ]);

    if (institutionRes.error || !institutionRes.data) {
      throw new NotFoundException('Etablissement introuvable.');
    }

    if (roomsRes.error) {
      throw new BadRequestException(roomsRes.error.message);
    }

    if (membersRes.error) {
      throw new BadRequestException(membersRes.error.message);
    }

    if (assignmentsRes.error) {
      throw new BadRequestException(assignmentsRes.error.message);
    }

    if (invitesRes.error) {
      throw new BadRequestException(invitesRes.error.message);
    }

    return {
      ...institutionRes.data,
      rooms: roomsRes.data ?? [],
      members: (membersRes.data ?? []).map((row: any) => ({
        id: row.id,
        role: row.role,
        joinedAt: row.joined_at,
        profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
      })),
      assignments: assignmentsRes.data ?? [],
      invites: invitesRes.data ?? [],
    };
  }

  async addInstitutionMember(
    user: AuthUser,
    institutionId: string,
    payload: { user_id: string; role: 'admin' | 'teacher' | 'student' },
  ) {
    await this.assertInstitutionStaff(user.id, institutionId, ['owner', 'admin']);

    if (!payload.user_id?.trim()) {
      throw new BadRequestException("L'identifiant utilisateur est obligatoire.");
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .upsert(
        {
          institution_id: institutionId,
          user_id: payload.user_id.trim(),
          role: payload.role,
        },
        { onConflict: 'institution_id,user_id' },
      )
      .select('id, institution_id, user_id, role, joined_at')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible d'ajouter le membre a l'etablissement.",
      );
    }

    return data;
  }

  async createRoom(
    user: AuthUser,
    institutionId: string,
    payload: { name: string; slug?: string; description?: string },
  ) {
    await this.assertInstitutionStaff(user.id, institutionId, ['owner', 'admin', 'teacher']);

    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom de la salle est obligatoire.');
    }

    const { data, error } = await this.supabaseService.client
      .from('rooms')
      .insert({
        institution_id: institutionId,
        name,
        slug: payload.slug?.trim() ? this.buildSlug(payload.slug) : this.buildSlug(name),
        description: payload.description?.trim() || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? 'Impossible de creer la salle.',
      );
    }

    return data;
  }

  async getRoomDetails(user: AuthUser, roomId: string) {
    const room = await this.getRoomOrThrow(roomId);
    await this.assertInstitutionAccess(user.id, room.institution_id);

    const [roomMembersRes, roomCoursesRes, assignmentsRes, invitesRes] =
      await Promise.all([
        this.supabaseService.client
          .from('room_members')
          .select('id, role, joined_at, profiles ( id, fullname, email, role )')
          .eq('room_id', roomId)
          .order('joined_at', { ascending: false }),
        this.supabaseService.client
          .from('room_courses')
          .select(
            'id, created_at, courses ( id, title, description, short_description, price_fcfa )',
          )
          .eq('room_id', roomId)
          .order('created_at', { ascending: false }),
        this.supabaseService.client
          .from('assignments')
          .select('id, title, instructions, status, due_at, created_at, max_score')
          .eq('room_id', roomId)
          .order('created_at', { ascending: false }),
        this.supabaseService.client
          .from('room_invites')
          .select(
            'id, token, invite_role, expires_at, max_uses, used_count, is_active, created_at',
          )
          .eq('room_id', roomId)
          .order('created_at', { ascending: false }),
      ]);

    if (roomMembersRes.error) {
      throw new BadRequestException(roomMembersRes.error.message);
    }

    if (roomCoursesRes.error) {
      throw new BadRequestException(roomCoursesRes.error.message);
    }

    if (assignmentsRes.error) {
      throw new BadRequestException(assignmentsRes.error.message);
    }

    if (invitesRes.error) {
      throw new BadRequestException(invitesRes.error.message);
    }

    return {
      ...room,
      members: (roomMembersRes.data ?? []).map((row: any) => ({
        id: row.id,
        role: row.role,
        joinedAt: row.joined_at,
        profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
      })),
      courses: (roomCoursesRes.data ?? []).map((row: any) => ({
        id: row.id,
        assignedAt: row.created_at,
        course: Array.isArray(row.courses) ? row.courses[0] : row.courses,
      })),
      assignments: assignmentsRes.data ?? [],
      invites: invitesRes.data ?? [],
    };
  }

  async addRoomMember(
    user: AuthUser,
    roomId: string,
    payload: { user_id: string; role: RoomRole },
  ) {
    const room = await this.getRoomOrThrow(roomId);
    await this.assertInstitutionStaff(user.id, room.institution_id, [
      'owner',
      'admin',
      'teacher',
    ]);

    const { data, error } = await this.supabaseService.client
      .from('room_members')
      .upsert(
        {
          room_id: roomId,
          user_id: payload.user_id.trim(),
          role: payload.role,
        },
        { onConflict: 'room_id,user_id' },
      )
      .select('id, room_id, user_id, role, joined_at')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible d'ajouter le membre a la salle.",
      );
    }

    return data;
  }

  async assignCourseToRoom(
    user: AuthUser,
    roomId: string,
    payload: { course_id: string },
  ) {
    const room = await this.getRoomOrThrow(roomId);
    await this.assertInstitutionStaff(user.id, room.institution_id, [
      'owner',
      'admin',
      'teacher',
    ]);

    const courseId = payload.course_id?.trim();
    if (!courseId) {
      throw new BadRequestException("L'identifiant du cours est obligatoire.");
    }

    const { data, error } = await this.supabaseService.client
      .from('room_courses')
      .upsert(
        {
          room_id: roomId,
          course_id: courseId,
          assigned_by: user.id,
        },
        { onConflict: 'room_id,course_id' },
      )
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible d'assigner le cours a la salle.",
      );
    }

    return data;
  }

  async createAssignment(
    user: AuthUser,
    roomId: string,
    payload: {
      course_id?: string;
      lesson_id?: string;
      title: string;
      instructions?: string;
      due_at?: string;
      max_score?: number;
    },
  ) {
    const room = await this.getRoomOrThrow(roomId);
    await this.assertInstitutionStaff(user.id, room.institution_id, [
      'owner',
      'admin',
      'teacher',
    ]);

    const title = payload.title?.trim();
    if (!title) {
      throw new BadRequestException("Le titre de l'exercice est obligatoire.");
    }

    const dueAt = payload.due_at?.trim() ? new Date(payload.due_at) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException("La date limite de l'exercice est invalide.");
    }

    const maxScore =
      payload.max_score === undefined || payload.max_score === null
        ? null
        : Number(payload.max_score);

    if (maxScore !== null && (Number.isNaN(maxScore) || maxScore < 0)) {
      throw new BadRequestException("La note maximale est invalide.");
    }

    const { data, error } = await this.supabaseService.client
      .from('assignments')
      .insert({
        room_id: roomId,
        course_id: payload.course_id?.trim() || null,
        lesson_id: payload.lesson_id?.trim() || null,
        created_by: user.id,
        title,
        instructions: payload.instructions?.trim() || null,
        due_at: dueAt ? dueAt.toISOString() : null,
        max_score: maxScore,
        status: 'published',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible de creer l'exercice.",
      );
    }

    return data;
  }

  async createRoomInvite(
    user: AuthUser,
    roomId: string,
    payload: {
      invite_role: RoomRole;
      expires_at?: string;
      max_uses?: number;
    },
  ) {
    const room = await this.getRoomOrThrow(roomId);
    await this.assertInstitutionStaff(user.id, room.institution_id, [
      'owner',
      'admin',
      'teacher',
    ]);

    const maxUses = Number(payload.max_uses ?? 1);
    if (Number.isNaN(maxUses) || maxUses < 1) {
      throw new BadRequestException("Le nombre d'utilisations est invalide.");
    }

    const expiresAt = payload.expires_at?.trim() ? new Date(payload.expires_at) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException("La date d'expiration est invalide.");
    }

    const token = this.buildInviteToken();
    const { data, error } = await this.supabaseService.client
      .from('room_invites')
      .insert({
        institution_id: room.institution_id,
        room_id: roomId,
        token,
        invite_role: payload.invite_role,
        created_by: user.id,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        max_uses: maxUses,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible de creer le lien d'invitation.",
      );
    }

    return data;
  }

  async redeemInvite(user: AuthUser, token: string) {
    const cleanToken = token.trim();
    if (!cleanToken) {
      throw new BadRequestException("Le token d'invitation est obligatoire.");
    }

    const { data: invite, error } = await this.supabaseService.client
      .from('room_invites')
      .select('*')
      .eq('token', cleanToken)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!invite) {
      throw new NotFoundException("Invitation introuvable.");
    }

    if (!invite.is_active) {
      throw new ForbiddenException("Cette invitation n'est plus active.");
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new ForbiddenException("Cette invitation a expire.");
    }

    if (Number(invite.used_count ?? 0) >= Number(invite.max_uses ?? 1)) {
      throw new ForbiddenException("Cette invitation a atteint sa limite d'utilisation.");
    }

    const room = await this.getRoomOrThrow(String(invite.room_id));

    const memberRole = invite.invite_role === 'assistant' ? 'teacher' : invite.invite_role;
    const roomRole = invite.invite_role as RoomRole;

    const { error: institutionMemberError } = await this.supabaseService.client
      .from('institution_members')
      .upsert(
        {
          institution_id: room.institution_id,
          user_id: user.id,
          role: memberRole,
        },
        { onConflict: 'institution_id,user_id' },
      );

    if (institutionMemberError) {
      throw new BadRequestException(
        institutionMemberError.message ??
          "Impossible de rattacher l'utilisateur a l'etablissement.",
      );
    }

    const { error: roomMemberError } = await this.supabaseService.client
      .from('room_members')
      .upsert(
        {
          room_id: room.id,
          user_id: user.id,
          role: roomRole,
        },
        { onConflict: 'room_id,user_id' },
      );

    if (roomMemberError) {
      throw new BadRequestException(
        roomMemberError.message ??
          "Impossible de rattacher l'utilisateur a la salle.",
      );
    }

    const { error: inviteUpdateError } = await this.supabaseService.client
      .from('room_invites')
      .update({
        used_count: Number(invite.used_count ?? 0) + 1,
        is_active:
          Number(invite.used_count ?? 0) + 1 < Number(invite.max_uses ?? 1),
      })
      .eq('id', invite.id);

    if (inviteUpdateError) {
      throw new BadRequestException(inviteUpdateError.message);
    }

    return {
      message: 'Invitation acceptee avec succes.',
      institutionId: room.institution_id,
      roomId: room.id,
      roomName: room.name,
      role: roomRole,
    };
  }

  private async resolveGlobalRole(userId: string, fallbackRole?: string) {
    if (fallbackRole) {
      return fallbackRole;
    }

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data?.role ?? null;
  }

  private async assertInstitutionAccess(userId: string, institutionId: string) {
    const role = await this.getInstitutionRole(userId, institutionId);

    if (!role) {
      throw new ForbiddenException(
        "Tu n'as pas acces a cet etablissement.",
      );
    }

    return role;
  }

  private async assertInstitutionStaff(
    userId: string,
    institutionId: string,
    allowedRoles: InstitutionRole[],
  ) {
    const role = await this.getInstitutionRole(userId, institutionId);

    if (!role || !allowedRoles.includes(role)) {
      throw new ForbiddenException(
        'Cette action est reservee au personnel autorise de cet etablissement.',
      );
    }

    return role;
  }

  private async getInstitutionRole(
    userId: string,
    institutionId: string,
  ): Promise<InstitutionRole | null> {
    const { data: institution, error: institutionError } =
      await this.supabaseService.client
        .from('institutions')
        .select('owner_user_id')
        .eq('id', institutionId)
        .maybeSingle();

    if (institutionError) {
      throw new BadRequestException(institutionError.message);
    }

    if (institution?.owner_user_id === userId) {
      return 'owner';
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .select('role')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data?.role as InstitutionRole | undefined) ?? null;
  }

  private async getRoomOrThrow(roomId: string) {
    const { data, error } = await this.supabaseService.client
      .from('rooms')
      .select('id, institution_id, name')
      .eq('id', roomId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Salle introuvable.');
    }

    return data;
  }

  private async getInstitutionRoomIds(institutionId: string) {
    const { data, error } = await this.supabaseService.client
      .from('rooms')
      .select('id')
      .eq('institution_id', institutionId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const ids = (data ?? []).map((room: any) => room.id).filter(Boolean);
    return ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'];
  }

  private buildSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private buildInviteToken() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}
