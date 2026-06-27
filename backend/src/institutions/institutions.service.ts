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
type ManagedInstitutionRole = 'admin' | 'teacher' | 'student';

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
    const roomIds = await this.getInstitutionRoomIds(institutionId);
    const assignmentIds = await this.getAssignmentIdsForRooms(roomIds);

    const [
      institutionRes,
      roomsRes,
      membersRes,
      assignmentsRes,
      invitesRes,
      roomCoursesRes,
      submissionsRes,
      managedUsersRes,
    ] = await Promise.all([
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
        .in('room_id', roomIds)
        .order('created_at', { ascending: false }),
      this.supabaseService.client
        .from('room_invites')
        .select(
          'id, room_id, token, invite_role, expires_at, max_uses, used_count, is_active, created_at',
        )
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false }),
      this.supabaseService.client
        .from('room_courses')
        .select('id, room_id, course_id')
        .in('room_id', roomIds),
      assignmentIds.length > 0
        ? this.supabaseService.client
            .from('assignment_submissions')
            .select('id, status')
            .in('assignment_id', assignmentIds)
        : Promise.resolve({ data: [], error: null }),
      this.loadManagedUsers(institutionId),
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

    if (roomCoursesRes.error) {
      throw new BadRequestException(roomCoursesRes.error.message);
    }

    if (submissionsRes.error) {
      throw new BadRequestException(submissionsRes.error.message);
    }

    if (managedUsersRes.error) {
      throw new BadRequestException(managedUsersRes.error.message);
    }

    const members = (membersRes.data ?? []).map((row: any) => ({
      id: row.id,
      role: row.role,
      joinedAt: row.joined_at,
      profile: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
    }));
    const invites = invitesRes.data ?? [];
    const assignments = assignmentsRes.data ?? [];
    const roomCourses = roomCoursesRes.data ?? [];
    const submissions = submissionsRes.data ?? [];
    const managedUsers = managedUsersRes.data ?? [];
    const ownersCount = members.filter((member: any) => member.role === 'owner').length;
    const adminsCount = members.filter((member: any) => member.role === 'admin').length;
    const teachersCount = members.filter((member: any) => member.role === 'teacher').length;
    const studentsCount = members.filter((member: any) => member.role === 'student').length;
    const maxStudents = Number(institutionRes.data.max_students ?? 0);
    const maxRooms = Number(institutionRes.data.max_rooms ?? 0);

    return {
      ...institutionRes.data,
      rooms: roomsRes.data ?? [],
      members,
      assignments,
      invites,
      managedUsers,
      stats: {
        roomsCount: roomsRes.data?.length ?? 0,
        assignmentsCount: assignments.length,
        assignedCoursesCount: roomCourses.length,
        totalMembers: members.length,
        ownersCount,
        adminsCount,
        teachersCount,
        studentsCount,
        activeInvitesCount: invites.filter((invite: any) => invite.is_active).length,
        totalSubmissions: submissions.length,
        reviewedSubmissions: submissions.filter(
          (submission: any) => submission.status === 'reviewed',
        ).length,
        pendingSubmissions: submissions.filter((submission: any) =>
          ['submitted', 'returned'].includes(String(submission.status ?? '')),
        ).length,
        managedAccountsCount: managedUsers.length,
        roomUsagePercentage:
          maxRooms > 0 ? Math.round(((roomsRes.data?.length ?? 0) / maxRooms) * 100) : 0,
        studentUsagePercentage:
          maxStudents > 0 ? Math.round((studentsCount / maxStudents) * 100) : 0,
      },
    };
  }

  async provisionManagedUser(
    user: AuthUser,
    institutionId: string,
    payload: {
      fullname: string;
      role: ManagedInstitutionRole;
      email?: string;
      level?: string;
      expertise?: string;
      bio?: string;
      room_ids?: string[];
    },
  ) {
    await this.assertInstitutionStaff(user.id, institutionId, ['owner', 'admin']);

    const institution = await this.getInstitutionOrThrow(institutionId);
    const fullname = payload.fullname?.trim();
    if (!fullname) {
      throw new BadRequestException("Le nom complet est obligatoire.");
    }

    const role = payload.role;
    if (!['admin', 'teacher', 'student'].includes(role)) {
      throw new BadRequestException('Le role fourni est invalide.');
    }

    const loginEmail = await this.buildManagedLoginEmail(
      institution,
      fullname,
      payload.email,
    );
    const temporaryPassword = this.buildTemporaryPassword();

    const authAdmin = this.supabaseService.client.auth?.admin;
    if (!authAdmin?.createUser) {
      throw new BadRequestException(
        "La creation admin des comptes n'est pas disponible sur cette configuration Supabase.",
      );
    }

    const { data: createdUser, error: createUserError } = await authAdmin.createUser({
      email: loginEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        fullname,
        role: role === 'teacher' ? 'teacher' : role === 'admin' ? 'institution' : 'student',
        country: institution.country ?? 'Cameroun',
        level: payload.level?.trim() || null,
        school_name: institution.name ?? null,
        expertise: payload.expertise?.trim() || null,
        bio: payload.bio?.trim() || null,
        institution_id: institutionId,
        managed_by_institution: true,
      },
    });

    if (createUserError || !createdUser?.user?.id) {
      throw new BadRequestException(
        createUserError?.message ?? 'Impossible de creer ce compte gere.',
      );
    }

    const userId = createdUser.user.id;
    const globalRole =
      role === 'teacher' ? 'teacher' : role === 'admin' ? 'institution' : 'student';

    const { error: profileError } = await this.supabaseService.client.from('profiles').upsert(
      {
        id: userId,
        email: loginEmail,
        fullname,
        role: globalRole,
        country: institution.country ?? 'Cameroun',
        level: payload.level?.trim() || null,
        school_name: institution.name ?? null,
        expertise: payload.expertise?.trim() || null,
        bio: payload.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      throw new BadRequestException(
        profileError.message ?? 'Impossible de creer le profil du compte gere.',
      );
    }

    const institutionMemberRole: InstitutionRole =
      role === 'admin' ? 'admin' : role === 'teacher' ? 'teacher' : 'student';

    const { error: institutionMemberError } = await this.supabaseService.client
      .from('institution_members')
      .upsert(
        {
          institution_id: institutionId,
          user_id: userId,
          role: institutionMemberRole,
        },
        { onConflict: 'institution_id,user_id' },
      );

    if (institutionMemberError) {
      throw new BadRequestException(
        institutionMemberError.message ??
          "Impossible de rattacher ce compte a l'etablissement.",
      );
    }

    await this.persistManagedUserRecord({
      institutionId,
      userId,
      loginEmail,
      fullname,
      role,
      createdBy: user.id,
      source: 'manual',
    });

    const roomIds = Array.isArray(payload.room_ids)
      ? payload.room_ids.filter((roomId) => String(roomId ?? '').trim())
      : [];

    if (roomIds.length > 0) {
      for (const roomId of roomIds) {
        const room = await this.getRoomOrThrow(roomId);
        if (room.institution_id !== institutionId) {
          continue;
        }

        const roomRole: RoomRole =
          role === 'teacher' ? 'teacher' : role === 'admin' ? 'assistant' : 'student';

        const { error: roomMemberError } = await this.supabaseService.client
          .from('room_members')
          .upsert(
            {
              room_id: roomId,
              user_id: userId,
              role: roomRole,
            },
            { onConflict: 'room_id,user_id' },
          );

        if (roomMemberError) {
          throw new BadRequestException(
            roomMemberError.message ??
              "Impossible de rattacher le compte gere a la salle.",
          );
        }
      }
    }

    return {
      userId,
      loginEmail,
      temporaryPassword,
      fullname,
      role,
      mustResetPassword: true,
      roomIds,
      message:
        "Compte genere avec succes. Remets l'identifiant et le mot de passe provisoire a l'apprenant ou au professeur.",
    };
  }

  async resetManagedUserPassword(
    user: AuthUser,
    institutionId: string,
    managedUserId: string,
  ) {
    await this.assertInstitutionStaff(user.id, institutionId, ['owner', 'admin']);

    const managedUser = await this.getManagedUserOrThrow(institutionId, managedUserId);
    const authAdmin = this.supabaseService.client.auth?.admin;
    if (!authAdmin?.updateUserById) {
      throw new BadRequestException(
        'La reinitialisation admin du mot de passe est indisponible.',
      );
    }

    const temporaryPassword = this.buildTemporaryPassword();
    const { error } = await authAdmin.updateUserById(managedUser.user_id, {
      password: temporaryPassword,
      user_metadata: {
        must_reset_password: true,
      },
    });

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de reinitialiser ce mot de passe.',
      );
    }

    if (!(await this.managedUserTableExists())) {
      return {
        loginEmail: managedUser.login_email,
        temporaryPassword,
        message: 'Mot de passe provisoire regenere.',
      };
    }

    await this.supabaseService.client
      .from('institution_managed_users')
      .update({
        must_reset_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', managedUserId);

    return {
      loginEmail: managedUser.login_email,
      temporaryPassword,
      message: 'Mot de passe provisoire regenere.',
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

    const assignmentIds = await this.getRoomAssignmentIds(roomId);

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

    const submissionsRes = assignmentIds.length
      ? await this.supabaseService.client
          .from('assignment_submissions')
          .select(
            `
              id,
              assignment_id,
              status,
              submitted_at,
              score,
              assignments ( title ),
              profiles:student_id ( fullname, email )
            `,
          )
          .in('assignment_id', assignmentIds)
          .order('submitted_at', { ascending: false })
      : { data: [], error: null };

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

    if (submissionsRes.error) {
      throw new BadRequestException(submissionsRes.error.message);
    }

    const submissions = submissionsRes.data ?? [];

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
      assignments: (assignmentsRes.data ?? []).map((assignment: any) => {
        const assignmentSubmissions = submissions.filter(
          (submission: any) => submission.assignment_id === assignment.id,
        );

        return {
          ...assignment,
          submissionCount: assignmentSubmissions.length,
          reviewedCount: assignmentSubmissions.filter(
            (submission: any) => submission.status === 'reviewed',
          ).length,
          pendingCount: assignmentSubmissions.filter(
            (submission: any) =>
              submission.status === 'submitted' || submission.status === 'returned',
          ).length,
        };
      }),
      invites: invitesRes.data ?? [],
      submissionSummary: {
        total: submissions.length,
        reviewed: submissions.filter((submission: any) => submission.status === 'reviewed')
          .length,
        pending: submissions.filter(
          (submission: any) =>
            submission.status === 'submitted' || submission.status === 'returned',
        ).length,
      },
      recentSubmissions: submissions.slice(0, 8).map((submission: any) => ({
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submitted_at,
        score: submission.score,
        assignmentTitle:
          (Array.isArray(submission.assignments)
            ? submission.assignments[0]
            : submission.assignments)?.title ?? 'Devoir',
        studentName:
          (Array.isArray(submission.profiles)
            ? submission.profiles[0]
            : submission.profiles)?.fullname ??
          (Array.isArray(submission.profiles)
            ? submission.profiles[0]
            : submission.profiles)?.email ??
          'Etudiant',
      })),
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

  async reviewAssignmentSubmission(
    user: AuthUser,
    submissionId: string,
    payload: {
      score?: number;
      feedback?: string;
      status?: 'reviewed' | 'returned';
    },
  ) {
    const { data: submission, error } = await this.supabaseService.client
      .from('assignment_submissions')
      .select(
        `
          id,
          assignment_id,
          assignments (
            id,
            room_id
          )
        `,
      )
      .eq('id', submissionId)
      .maybeSingle();

    if (error || !submission) {
      throw new NotFoundException('Remise introuvable.');
    }

    const assignment = Array.isArray(submission.assignments)
      ? submission.assignments[0]
      : submission.assignments;

    if (!assignment?.room_id) {
      throw new BadRequestException('Salle liee a la remise introuvable.');
    }

    const room = await this.getRoomOrThrow(String(assignment.room_id));
    await this.assertInstitutionStaff(user.id, room.institution_id, [
      'owner',
      'admin',
      'teacher',
    ]);

    const nextStatus = payload.status === 'returned' ? 'returned' : 'reviewed';
    const score =
      payload.score === undefined || payload.score === null
        ? null
        : Number(payload.score);

    if (score !== null && Number.isNaN(score)) {
      throw new BadRequestException('La note saisie est invalide.');
    }

    const { data: updated, error: updateError } = await this.supabaseService.client
      .from('assignment_submissions')
      .update({
        status: nextStatus,
        score,
        feedback: payload.feedback?.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select('id, status, score, feedback, reviewed_at')
      .single();

    if (updateError || !updated) {
      throw new BadRequestException(
        updateError?.message ?? 'Impossible de corriger la remise.',
      );
    }

    return updated;
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

  private async getInstitutionOrThrow(institutionId: string) {
    const { data, error } = await this.supabaseService.client
      .from('institutions')
      .select('id, name, slug, country')
      .eq('id', institutionId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Etablissement introuvable.');
    }

    return data;
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

  private async getRoomAssignmentIds(roomId: string) {
    const { data, error } = await this.supabaseService.client
      .from('assignments')
      .select('id')
      .eq('room_id', roomId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((assignment: any) => assignment.id).filter(Boolean);
  }

  private async getAssignmentIdsForRooms(roomIds: string[]) {
    if (roomIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabaseService.client
      .from('assignments')
      .select('id')
      .in('room_id', roomIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data ?? []).map((assignment: any) => assignment.id).filter(Boolean);
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

  private async loadManagedUsers(institutionId: string) {
    if (!(await this.managedUserTableExists())) {
      return { data: [], error: null };
    }

    return this.supabaseService.client
      .from('institution_managed_users')
      .select(
        `
          id,
          institution_id,
          user_id,
          login_email,
          full_name,
          managed_role,
          source,
          status,
          must_reset_password,
          created_at,
          profiles:user_id (
            id,
            fullname,
            email,
            level,
            expertise,
            school_name
          )
        `,
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });
  }

  private async persistManagedUserRecord(payload: {
    institutionId: string;
    userId: string;
    loginEmail: string;
    fullname: string;
    role: ManagedInstitutionRole;
    createdBy: string;
    source: 'manual' | 'csv' | 'api';
  }) {
    if (!(await this.managedUserTableExists())) {
      return;
    }

    const { error } = await this.supabaseService.client
      .from('institution_managed_users')
      .upsert(
        {
          institution_id: payload.institutionId,
          user_id: payload.userId,
          login_email: payload.loginEmail,
          full_name: payload.fullname,
          managed_role: payload.role,
          source: payload.source,
          status: 'active',
          must_reset_password: true,
          created_by: payload.createdBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'institution_id,user_id' },
      );

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de stocker le compte gere.',
      );
    }
  }

  private async getManagedUserOrThrow(institutionId: string, managedUserId: string) {
    if (!(await this.managedUserTableExists())) {
      throw new NotFoundException(
        "La table des comptes geres n'est pas encore disponible.",
      );
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_managed_users')
      .select('id, institution_id, user_id, login_email')
      .eq('institution_id', institutionId)
      .eq('id', managedUserId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Compte gere introuvable.');
    }

    return data;
  }

  private async managedUserTableExists() {
    const { error } = await this.supabaseService.client
      .from('institution_managed_users')
      .select('id')
      .limit(1);

    return !this.isMissingManagedTableError(error);
  }

  private isMissingManagedTableError(error: { message?: string } | null | undefined) {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes("could not find the table") ||
      message.includes('schema cache') ||
      message.includes('institution_managed_users')
    );
  }

  private async buildManagedLoginEmail(
    institution: { slug?: string | null },
    fullname: string,
    preferredEmail?: string,
  ) {
    const explicitEmail = preferredEmail?.trim().toLowerCase();
    if (explicitEmail) {
      return explicitEmail;
    }

    const baseName = this.buildSlug(fullname || 'compte-campus') || 'compte-campus';
    const scope = this.buildSlug(institution.slug || 'campus') || 'campus';

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const suffix = attempt === 0 ? '' : `-${Math.random().toString(36).slice(2, 6)}`;
      const candidate = `${baseName}${suffix}@${scope}.kalatty.app`;
      const { data } = await this.supabaseService.client
        .from('profiles')
        .select('id')
        .eq('email', candidate)
        .maybeSingle();

      if (!data?.id) {
        return candidate;
      }
    }

    return `${Date.now().toString(36)}@${scope}.kalatty.app`;
  }

  private buildTemporaryPassword() {
    const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
    const stamp = Date.now().toString(36).slice(-4);
    return `Kalatty!${seed}${stamp}`;
  }
}
