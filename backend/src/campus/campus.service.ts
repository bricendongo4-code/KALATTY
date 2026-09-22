import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  EndSessionDto,
  MarkAttendanceDto,
  StartSessionDto,
} from './dto/session-actions.dto';

type AuthUser = { id: string; role?: string };

type CampusRole = 'etudiant' | 'professeur' | 'pedagogie' | 'direction';

const ROLE_MAP: Record<string, CampusRole> = {
  owner: 'direction',
  admin: 'direction',
  pedagogy: 'pedagogie',
  teacher: 'professeur',
  student: 'etudiant',
};

const WEEKDAY_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Espace Etablissement v2 : agregation des accueils par role et actions de
 * seance (demarrer, appel, cahier de texte). S'appuie sur les tables
 * existantes (rooms, room_members, assignments...) et sur celles ajoutees
 * par la migration 2026-09-22 (formations, subjects, room_subjects,
 * room_attendance_sessions etendue, absence_justifications, announcements).
 */
@Injectable()
export class CampusService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get client() {
    return this.supabaseService.client;
  }

  // ------------------------------------------------------------ contexte
  async getContext(user: AuthUser) {
    const { data: profile, error: profileError } = await this.client
      .from('profiles')
      .select('id, fullname, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      throw new BadRequestException(profileError.message);
    }

    const { data: memberships, error: membershipError } = await this.client
      .from('institution_members')
      .select('institution_id, role, institutions ( id, name, updated_at )')
      .eq('user_id', user.id);

    if (membershipError) {
      throw new BadRequestException(membershipError.message);
    }

    if (!memberships || memberships.length === 0) {
      throw new NotFoundException(
        "Tu n'es rattache a aucun etablissement pour l'instant.",
      );
    }

    // Un compte peut appartenir a plusieurs etablissements (proprietaire de
    // plusieurs campus, par exemple) : on retient celui touche le plus
    // recemment plutot qu'un ordre arbitraire.
    const membership = [...memberships].sort((a: any, b: any) => {
      const instA = Array.isArray(a.institutions) ? a.institutions[0] : a.institutions;
      const instB = Array.isArray(b.institutions) ? b.institutions[0] : b.institutions;
      return String(instB?.updated_at ?? '').localeCompare(String(instA?.updated_at ?? ''));
    })[0];

    const institution = Array.isArray(membership.institutions)
      ? membership.institutions[0]
      : membership.institutions;
    const campusRole = ROLE_MAP[String(membership.role)];

    if (!campusRole) {
      throw new ForbiddenException(
        "Ce role d'etablissement n'est pas encore pris en charge par l'Espace Etablissement.",
      );
    }

    return {
      userId: user.id,
      displayName: String(profile?.fullname ?? profile?.email ?? 'Utilisateur'),
      institutionId: String(membership.institution_id),
      institutionName: String(institution?.name ?? 'Etablissement'),
      institutionRole: String(membership.role),
      campusRole,
    };
  }

  async getHome(user: AuthUser) {
    const context = await this.getContext(user);
    switch (context.campusRole) {
      case 'etudiant':
        return { context, data: await this.getStudentHome(context) };
      case 'professeur':
        return { context, data: await this.getTeacherHome(context) };
      case 'pedagogie':
        return { context, data: await this.getPedagogyHome(context) };
      case 'direction':
        return { context, data: await this.getDirectionHome(context) };
      default:
        throw new ForbiddenException('Role non pris en charge.');
    }
  }

  async getStudentOverview(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'etudiant') {
      throw new ForbiddenException('Espace réservé aux étudiants.');
    }

    const { data: memberships, error: membershipError } = await this.client
      .from('room_members')
      .select('room_id')
      .eq('user_id', user.id)
      .eq('role', 'student');
    if (membershipError) throw new BadRequestException(membershipError.message);
    const memberRoomIds = [...new Set((memberships ?? []).map((row: any) => String(row.room_id)))];
    if (!memberRoomIds.length) return { context, rooms: [], schedule: [], courses: [], grades: [] };

    const { data: rooms, error: roomError } = await this.client
      .from('rooms')
      .select('id, name, description, institution_id')
      .in('id', memberRoomIds)
      .eq('institution_id', context.institutionId);
    if (roomError) throw new BadRequestException(roomError.message);
    const roomIds = (rooms ?? []).map((room: any) => String(room.id));
    if (!roomIds.length) return { context, rooms: [], schedule: [], courses: [], grades: [] };

    const [scheduleResult, coursesResult, teachersResult, gradesResult] = await Promise.all([
      this.client.from('room_schedule_items')
        .select('id, room_id, title, weekday, starts_at, ends_at, location')
        .in('room_id', roomIds)
        .order('weekday', { ascending: true })
        .order('starts_at', { ascending: true }),
      this.client.from('room_courses')
        .select('id, room_id, courses ( id, title, description, short_description )')
        .in('room_id', roomIds),
      this.client.from('room_members')
        .select('room_id, profiles ( fullname )')
        .in('room_id', roomIds)
        .eq('role', 'teacher'),
      this.client.from('assignment_submissions')
        .select('id, status, score, feedback, submitted_at, reviewed_at, assignments ( title, max_score, room_id )')
        .eq('student_id', user.id)
        .eq('status', 'reviewed')
        .eq('published', true)
        .order('submitted_at', { ascending: false })
        .limit(50),
    ]);
    for (const result of [scheduleResult, coursesResult, teachersResult, gradesResult]) {
      if (result.error) throw new BadRequestException(result.error.message);
    }

    const names = new Map((rooms ?? []).map((room: any) => [String(room.id), String(room.name)]));
    const teachers = new Map<string, string[]>();
    for (const row of teachersResult.data ?? []) {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      if (!profile?.fullname) continue;
      const roomId = String(row.room_id);
      teachers.set(roomId, [...(teachers.get(roomId) ?? []), String(profile.fullname)]);
    }

    return {
      context,
      rooms: (rooms ?? []).map((room: any) => ({ id: room.id, name: room.name, description: room.description ?? '', teachers: teachers.get(String(room.id)) ?? [] })),
      schedule: (scheduleResult.data ?? []).map((row: any) => ({ id: row.id, roomId: row.room_id, roomName: names.get(String(row.room_id)), title: row.title, weekday: Number(row.weekday), startsAt: String(row.starts_at).slice(0, 5), endsAt: row.ends_at ? String(row.ends_at).slice(0, 5) : null, location: row.location ?? '' })),
      courses: (coursesResult.data ?? []).flatMap((row: any) => {
        const course = Array.isArray(row.courses) ? row.courses[0] : row.courses;
        return course?.id ? [{ id: course.id, title: course.title, description: course.short_description ?? course.description ?? '', roomName: names.get(String(row.room_id)) }] : [];
      }),
      grades: (gradesResult.data ?? []).flatMap((row: any) => {
        const assignment = Array.isArray(row.assignments) ? row.assignments[0] : row.assignments;
        return assignment && roomIds.includes(String(assignment.room_id)) && row.score !== null
          ? [{ id: row.id, title: assignment.title, roomName: names.get(String(assignment.room_id)), score: Number(row.score), maxScore: Number(assignment.max_score ?? 0), feedback: row.feedback ?? '', reviewedAt: row.reviewed_at }]
          : [];
      }),
    };
  }

  async getStudentAnnouncements(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'etudiant') {
      throw new ForbiddenException('Espace réservé aux étudiants.');
    }
    const { data: memberships, error: membershipError } = await this.client
      .from('room_members').select('room_id').eq('user_id', user.id).eq('role', 'student');
    if (membershipError) throw new BadRequestException(membershipError.message);
    const roomIds = (memberships ?? []).map((row: any) => String(row.room_id));
    const { data: rooms, error: roomsError } = roomIds.length
      ? await this.client.from('rooms').select('id').in('id', roomIds).eq('institution_id', context.institutionId)
      : { data: [], error: null };
    if (roomsError) throw new BadRequestException(roomsError.message);
    const allowedRooms = new Set((rooms ?? []).map((row: any) => String(row.id)));
    const { data, error } = await this.client.from('announcements')
      .select('id, title, body, room_id, created_at')
      .eq('institution_id', context.institutionId)
      .in('audience', ['all', 'students'])
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException(error.message);
    return { announcements: (data ?? []).filter((row: any) => !row.room_id || allowedRooms.has(String(row.room_id)))
      .map((row: any) => ({ id: row.id, title: row.title, body: row.body, createdAt: row.created_at, roomId: row.room_id })) };
  }

  // ------------------------------------------------------------ horloge partagee (fuseau Europe/Paris)
  private nowParts(date: Date = new Date()) {
    const parts = WEEKDAY_TIME_FORMAT.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const weekdayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const minutes = Number(map.hour) * 60 + Number(map.minute);
    return { isoWeekday: weekdayMap[map.weekday] ?? 1, minutes };
  }

  private toMinutes(value: string) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (Number.isFinite(m) ? m : 0);
  }

  private sessionStatus(
    startsAt: string,
    endsAt: string | null,
    nowMinutes: number,
  ) {
    const start = this.toMinutes(startsAt);
    const end = endsAt ? this.toMinutes(endsAt) : start + 90;
    if (nowMinutes < start - 10) return 'upcoming' as const;
    if (nowMinutes > end) return 'done' as const;
    return 'live' as const;
  }

  // ------------------------------------------------------------ etudiant
  private async getStudentHome(ctx: { userId: string; institutionId: string }) {
    const { data: memberships } = await this.client
      .from('room_members')
      .select('room_id')
      .eq('user_id', ctx.userId)
      .eq('role', 'student');
    const memberRoomIds = (memberships ?? []).map((m: any) => String(m.room_id));

    if (memberRoomIds.length === 0) {
      return this.emptyStudentHome();
    }

    const { isoWeekday, minutes } = this.nowParts();

    const { data: rooms } = await this.client
      .from('rooms')
      .select('id, name')
      .in('id', memberRoomIds)
      .eq('institution_id', ctx.institutionId);
    const roomIds = (rooms ?? []).map((room: any) => String(room.id));
    if (!roomIds.length) return this.emptyStudentHome();
    const roomName = new Map(
      (rooms ?? []).map((r: any) => [String(r.id), String(r.name)]),
    );

    const { data: scheduleItems } = await this.client
      .from('room_schedule_items')
      .select('id, room_id, title, starts_at, ends_at, location')
      .in('room_id', roomIds)
      .eq('weekday', isoWeekday)
      .order('starts_at', { ascending: true });

    const today = (scheduleItems ?? []).map((item: any) => ({
      id: String(item.id),
      title: String(item.title),
      room: roomName.get(String(item.room_id)) ?? 'Salle',
      location: item.location ?? null,
      startsAt: String(item.starts_at).slice(0, 5),
      endsAt: item.ends_at ? String(item.ends_at).slice(0, 5) : null,
      status: this.sessionStatus(item.starts_at, item.ends_at, minutes),
    }));

    const { data: assignments } = await this.client
      .from('assignments')
      .select('id, room_id, title, due_at, status')
      .in('room_id', roomIds)
      .eq('status', 'published');

    const { data: submissions } = await this.client
      .from('assignment_submissions')
      .select(
        'assignment_id, status, score, max_score:assignments(max_score), published, feedback',
      )
      .eq('student_id', ctx.userId);
    const submissionByAssignment = new Map(
      (submissions ?? []).map((s: any) => [String(s.assignment_id), s]),
    );

    const pendingWork = (assignments ?? [])
      .filter((a: any) => {
        const sub = submissionByAssignment.get(String(a.id));
        return !sub || sub.status === 'draft';
      })
      .map((a: any) => ({
        id: String(a.id),
        title: String(a.title),
        room: roomName.get(String(a.room_id)) ?? 'Salle',
        dueAt: a.due_at ?? null,
      }))
      .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));

    const upcomingEvalCount = (assignments ?? []).filter(
      (a: any) => a.due_at && new Date(a.due_at).getTime() > Date.now(),
    ).length;

    const { data: progressRows } = await this.client
      .from('progress')
      .select('status')
      .eq('user_id', ctx.userId);
    const progressPct = progressRows?.length
      ? Math.round(
          (progressRows.filter((p: any) => p.status === 'completed').length /
            progressRows.length) *
            100,
        )
      : 0;

    const { data: notifications } = await this.client
      .from('notifications')
      .select('id, title, message, created_at')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: announcements } = await this.client
      .from('announcements')
      .select('id, title, body, room_id, created_at')
      .eq('institution_id', ctx.institutionId)
      .in('audience', ['all', 'students'])
      .order('created_at', { ascending: false })
      .limit(30);

    const visibleAnnouncement = (announcements ?? []).find((item: any) => !item.room_id || roomIds.includes(String(item.room_id)));

    return {
      today,
      todayCount: today.length,
      pendingWork,
      pendingWorkCount: pendingWork.length,
      upcomingEvalCount,
      progressPct,
      messages: (notifications ?? []).map((n: any) => ({
        id: String(n.id),
        title: String(n.title),
        body: String(n.message ?? ''),
        createdAt: n.created_at,
      })),
      announcement: visibleAnnouncement
        ? {
            title: String(visibleAnnouncement.title),
            body: String(visibleAnnouncement.body),
          }
        : null,
    };
  }

  private emptyStudentHome() {
    return {
      today: [],
      todayCount: 0,
      pendingWork: [],
      pendingWorkCount: 0,
      upcomingEvalCount: 0,
      progressPct: 0,
      messages: [],
      announcement: null,
    };
  }

  // ------------------------------------------------------------ professeur
  async getTeacherSchedule(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'professeur') {
      throw new ForbiddenException('Espace réservé aux professeurs.');
    }
    const { data: memberships, error: membershipError } = await this.client
      .from('room_members').select('room_id').eq('user_id', user.id).eq('role', 'teacher');
    if (membershipError) throw new BadRequestException(membershipError.message);
    const ids = (memberships ?? []).map((row: any) => String(row.room_id));
    if (!ids.length) return { schedule: [] };
    const { data: rooms, error: roomError } = await this.client.from('rooms')
      .select('id, name').in('id', ids).eq('institution_id', context.institutionId);
    if (roomError) throw new BadRequestException(roomError.message);
    const roomIds = (rooms ?? []).map((room: any) => String(room.id));
    if (!roomIds.length) return { schedule: [] };
    const names = new Map((rooms ?? []).map((room: any) => [String(room.id), String(room.name)]));
    const { data, error } = await this.client.from('room_schedule_items')
      .select('id, room_id, title, weekday, starts_at, ends_at, location')
      .in('room_id', roomIds).order('weekday', { ascending: true }).order('starts_at', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return { schedule: (data ?? []).map((item: any) => ({
      id: item.id, title: item.title, roomName: names.get(String(item.room_id)),
      weekday: Number(item.weekday), startsAt: String(item.starts_at).slice(0, 5),
      endsAt: item.ends_at ? String(item.ends_at).slice(0, 5) : null, location: item.location ?? '',
    })) };
  }

  async getStaffSchedule(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'pedagogie' && context.campusRole !== 'direction') {
      throw new ForbiddenException('Planning réservé au personnel autorisé.');
    }
    let roomIds: string[];
    if (context.campusRole === 'pedagogie') {
      roomIds = await this.pedagogyScopeRoomIds(user.id, context.institutionId);
    } else {
      const { data: allRooms, error: listError } = await this.client.from('rooms')
        .select('id').eq('institution_id', context.institutionId);
      if (listError) throw new BadRequestException(listError.message);
      roomIds = (allRooms ?? []).map((room: any) => String(room.id));
    }
    if (!roomIds.length) return { schedule: [] };
    const [roomsResult, scheduleResult] = await Promise.all([
      this.client.from('rooms').select('id, name').in('id', roomIds).eq('institution_id', context.institutionId),
      this.client.from('room_schedule_items').select('id, room_id, title, weekday, starts_at, ends_at, location')
        .in('room_id', roomIds).order('weekday', { ascending: true }).order('starts_at', { ascending: true }),
    ]);
    if (roomsResult.error) throw new BadRequestException(roomsResult.error.message);
    if (scheduleResult.error) throw new BadRequestException(scheduleResult.error.message);
    const names = new Map((roomsResult.data ?? []).map((room: any) => [String(room.id), String(room.name)]));
    return { schedule: (scheduleResult.data ?? []).filter((item: any) => names.has(String(item.room_id))).map((item: any) => ({
      id: item.id, title: item.title, roomName: names.get(String(item.room_id)), weekday: Number(item.weekday),
      startsAt: String(item.starts_at).slice(0, 5), endsAt: item.ends_at ? String(item.ends_at).slice(0, 5) : null,
      location: item.location ?? '',
    })) };
  }

  async getAnnouncements(user: AuthUser) {
    const context = await this.getContext(user);
    const { data: memberships, error: membershipError } = await this.client.from('room_members')
      .select('room_id').eq('user_id', user.id);
    if (membershipError) throw new BadRequestException(membershipError.message);
    const ownIds = new Set((memberships ?? []).map((row: any) => String(row.room_id)));
    const { data: rooms, error: roomsError } = await this.client.from('rooms').select('id')
      .eq('institution_id', context.institutionId);
    if (roomsError) throw new BadRequestException(roomsError.message);
    const institutionIds = new Set((rooms ?? []).map((row: any) => String(row.id)));
    const { data, error } = await this.client.from('announcements')
      .select('id, title, body, room_id, audience, created_at')
      .eq('institution_id', context.institutionId).order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException(error.message);
    const permittedAudience = context.campusRole === 'etudiant' ? ['all', 'students', 'room']
      : context.campusRole === 'professeur' ? ['all', 'teachers', 'room'] : ['all', 'teachers', 'students', 'room'];
    return { announcements: (data ?? []).filter((row: any) => permittedAudience.includes(row.audience)
      && (row.audience !== 'room' || !!row.room_id)
      && (!row.room_id || (institutionIds.has(String(row.room_id)) &&
        (context.campusRole === 'direction' || context.campusRole === 'pedagogie' || ownIds.has(String(row.room_id))))))
      .map((row: any) => ({ id: row.id, title: row.title, body: row.body, roomId: row.room_id, createdAt: row.created_at })) };
  }

  async createAnnouncement(user: AuthUser, payload: { title?: string; body?: string; audience?: string; roomId?: string }) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'direction') throw new ForbiddenException('Publication réservée à la direction.');
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    const audience = payload.audience ?? 'all';
    if (!title || !body || title.length > 160 || body.length > 5000 || !['all', 'students', 'teachers', 'room'].includes(audience) || (audience === 'room' && !payload.roomId)) {
      throw new BadRequestException('Titre, message ou audience invalide.');
    }
    if (payload.roomId) {
      const { data: room, error: roomError } = await this.client.from('rooms').select('id')
        .eq('id', payload.roomId).eq('institution_id', context.institutionId).maybeSingle();
      if (roomError) throw new BadRequestException(roomError.message);
      if (!room) throw new NotFoundException('Classe introuvable dans cet établissement.');
    }
    const { data, error } = await this.client.from('announcements').insert({
      institution_id: context.institutionId, author_id: user.id, title, body,
      audience, room_id: payload.roomId ?? null,
    }).select('id, title, body, audience, room_id, created_at').single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getDocuments(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'pedagogie' && context.campusRole !== 'direction') {
      throw new ForbiddenException('Documents réservés au personnel autorisé.');
    }
    const { data, error } = await this.client.from('institution_documents')
      .select('id, title, category, file_path, created_at').eq('institution_id', context.institutionId)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException(error.message);
    const documents = await Promise.all((data ?? []).map(async (item: any) => {
      const path = String(item.file_path);
      if (!path.startsWith(`${context.institutionId}/`)) return null;
      const { data: signed, error: signError } = await this.client.storage.from('institution-documents')
        .createSignedUrl(path, 60 * 15);
      return { id: item.id, title: item.title, category: item.category,
        createdAt: item.created_at, url: signError ? null : signed?.signedUrl ?? null };
    }));
    return { documents: documents.filter(Boolean) };
  }

  async getStaffAssignments(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole === 'etudiant') throw new ForbiddenException('Accès réservé au personnel.');
    const { data: rooms, error: roomError } = await this.client.from('rooms')
      .select('id, name').eq('institution_id', context.institutionId);
    if (roomError) throw new BadRequestException(roomError.message);
    const eligible = new Set((rooms ?? []).map((room: any) => String(room.id)));
    if (context.campusRole === 'professeur') {
      const { data: memberships, error } = await this.client.from('room_members').select('room_id')
        .eq('user_id', user.id).eq('role', 'teacher');
      if (error) throw new BadRequestException(error.message);
      const own = new Set((memberships ?? []).map((row: any) => String(row.room_id)));
      for (const id of eligible) if (!own.has(id)) eligible.delete(id);
    } else if (context.campusRole === 'pedagogie') {
      const scope = new Set(await this.pedagogyScopeRoomIds(user.id, context.institutionId));
      for (const id of eligible) if (!scope.has(id)) eligible.delete(id);
    }
    const ids = [...eligible];
    if (!ids.length) return { assignments: [] };
    const names = new Map((rooms ?? []).map((room: any) => [String(room.id), String(room.name)]));
    const { data, error } = await this.client.from('assignments')
      .select('id, title, room_id, status, due_at, max_score, created_at').in('room_id', ids)
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException(error.message);
    return { assignments: (data ?? []).map((item: any) => ({ id: item.id, title: item.title,
      roomName: names.get(String(item.room_id)), status: item.status, dueAt: item.due_at,
      maxScore: item.max_score, createdAt: item.created_at })) };
  }

  async getJustifications(user: AuthUser) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'pedagogie' && context.campusRole !== 'direction') {
      throw new ForbiddenException('Vie scolaire réservée au personnel autorisé.');
    }
    const scope = context.campusRole === 'pedagogie'
      ? await this.pedagogyScopeRoomIds(user.id, context.institutionId)
      : (await this.client.from('rooms').select('id').eq('institution_id', context.institutionId)).data?.map((row: any) => String(row.id)) ?? [];
    if (!scope.length) return { justifications: [] };
    const { data: records, error: recordsError } = await this.client.from('room_attendance_records')
      .select('id, room_id').in('room_id', scope);
    if (recordsError) throw new BadRequestException(recordsError.message);
    const allowed = new Set((records ?? []).map((row: any) => String(row.id)));
    if (!allowed.size) return { justifications: [] };
    const { data, error } = await this.client.from('absence_justifications')
      .select('id, record_id, reason, status, review_note, created_at, profiles:student_id ( fullname )')
      .eq('institution_id', context.institutionId).in('record_id', [...allowed])
      .order('created_at', { ascending: false }).limit(100);
    if (error) throw new BadRequestException(error.message);
    return { justifications: (data ?? []).map((item: any) => ({
      id: item.id, reason: item.reason, status: item.status, note: item.review_note,
      createdAt: item.created_at, studentName: (Array.isArray(item.profiles) ? item.profiles[0] : item.profiles)?.fullname ?? 'Étudiant',
    })) };
  }

  async reviewJustification(user: AuthUser, id: string, payload: { status?: string; note?: string }) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'pedagogie' && context.campusRole !== 'direction') throw new ForbiddenException('Décision non autorisée.');
    if (!['approved', 'rejected'].includes(payload.status ?? '')) throw new BadRequestException('Décision invalide.');
    const { data: item, error: itemError } = await this.client.from('absence_justifications')
      .select('id, record_id, status').eq('id', id).eq('institution_id', context.institutionId).maybeSingle();
    if (itemError) throw new BadRequestException(itemError.message);
    if (!item) throw new NotFoundException('Justificatif introuvable.');
    if (item.status !== 'pending') throw new BadRequestException('Ce justificatif a déjà été traité.');
    const { data: record, error: recordError } = await this.client.from('room_attendance_records')
      .select('room_id').eq('id', item.record_id).maybeSingle();
    if (recordError) throw new BadRequestException(recordError.message);
    if (!record) throw new NotFoundException('Présence associée introuvable.');
    const { data: room } = await this.client.from('rooms').select('institution_id')
      .eq('id', record.room_id).maybeSingle();
    if (!room || room.institution_id !== context.institutionId) throw new ForbiddenException('Justificatif hors établissement.');
    if (context.campusRole === 'pedagogie') {
      const scope = await this.pedagogyScopeRoomIds(user.id, context.institutionId);
      if (!scope.includes(String(record.room_id))) throw new ForbiddenException('Justificatif hors périmètre.');
    }
    const { data, error } = await this.client.from('absence_justifications').update({
      status: payload.status, review_note: payload.note?.trim() || null,
      reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'pending').select('id, status').maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new BadRequestException('Ce justificatif vient d’être traité.');
    return data;
  }

  async uploadDocument(user: AuthUser, file: { buffer: Buffer; mimetype: string; originalname: string; size: number }, payload: { title?: string; category?: string }) {
    const context = await this.getContext(user);
    if (context.campusRole !== 'direction') throw new ForbiddenException('Publication réservée à la direction.');
    const title = payload.title?.trim();
    if (!title || title.length > 160 || !file?.buffer?.length || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Titre ou fichier invalide (10 Mo maximum).');
    }
    const extensions: Record<string, string> = {
      'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    const ext = extensions[file.mimetype];
    if (!ext) throw new BadRequestException('Format accepté : PDF, image ou Word.');
    const path = `${context.institutionId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await this.client.storage.from('institution-documents')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) throw new BadRequestException(uploadError.message);
    const { data, error } = await this.client.from('institution_documents').insert({
      institution_id: context.institutionId, title, category: payload.category?.trim() || 'general',
      file_path: path, uploaded_by: user.id,
    }).select('id, title, category, created_at').single();
    if (error) {
      await this.client.storage.from('institution-documents').remove([path]);
      throw new BadRequestException(error.message);
    }
    return data;
  }

  private async getTeacherHome(ctx: { userId: string; institutionId: string }) {
    const { data: teacherRooms } = await this.client
      .from('room_members')
      .select('room_id')
      .eq('user_id', ctx.userId)
      .eq('role', 'teacher');
    const memberRoomIds = [
      ...new Set((teacherRooms ?? []).map((r: any) => String(r.room_id))),
    ];

    if (memberRoomIds.length === 0) {
      return this.emptyTeacherHome();
    }

    const { data: rooms } = await this.client
      .from('rooms')
      .select('id, name')
      .in('id', memberRoomIds)
      .eq('institution_id', ctx.institutionId);
    const roomIds = (rooms ?? []).map((room: any) => String(room.id));
    if (!roomIds.length) return this.emptyTeacherHome();
    const roomName = new Map(
      (rooms ?? []).map((r: any) => [String(r.id), String(r.name)]),
    );

    const { data: roomSubjects } = await this.client
      .from('room_subjects')
      .select('id, room_id, subject_id, subjects ( name )')
      .in('room_id', roomIds)
      .eq('teacher_id', ctx.userId);

    const subjectName = (rs: any) =>
      String(
        (Array.isArray(rs.subjects) ? rs.subjects[0] : rs.subjects)?.name ??
          'Matiere',
      );

    const { data: roomMembers } = await this.client
      .from('room_members')
      .select('room_id, user_id, role')
      .in('room_id', roomIds);
    const studentsByRoom = new Map<string, string[]>();
    for (const m of roomMembers ?? []) {
      if (m.role !== 'student') continue;
      const list = studentsByRoom.get(String(m.room_id)) ?? [];
      list.push(String(m.user_id));
      studentsByRoom.set(String(m.room_id), list);
    }

    const { data: assignments } = await this.client
      .from('assignments')
      .select('id, room_id, due_at, status')
      .in('room_id', roomIds);

    const { data: submissions } = await this.client
      .from('assignment_submissions')
      .select('id, assignment_id, status')
      .in(
        'assignment_id',
        (assignments ?? []).map((a: any) => a.id),
      );

    const assignmentRoom = new Map(
      (assignments ?? []).map((a: any) => [String(a.id), String(a.room_id)]),
    );
    const submissionsByRoom = new Map<string, any[]>();
    for (const s of submissions ?? []) {
      const roomId = assignmentRoom.get(String(s.assignment_id));
      if (!roomId) continue;
      const list = submissionsByRoom.get(roomId) ?? [];
      list.push(s);
      submissionsByRoom.set(roomId, list);
    }

    const classes = roomIds.map((roomId) => {
      const rs = (roomSubjects ?? []).find(
        (x: any) => String(x.room_id) === roomId,
      );
      const total = submissionsByRoom.get(roomId)?.length ?? 0;
      const reviewed = (submissionsByRoom.get(roomId) ?? []).filter(
        (s: any) => s.status === 'reviewed',
      ).length;
      return {
        roomId,
        roomSubjectId: rs ? String(rs.id) : null,
        name: roomName.get(roomId) ?? 'Classe',
        subject: rs ? subjectName(rs) : 'Matiere non affectee',
        studentsCount: studentsByRoom.get(roomId)?.length ?? 0,
        progressPct: total > 0 ? Math.round((reviewed / total) * 100) : 0,
      };
    });

    const totalStudents = new Set([...studentsByRoom.values()].flat()).size;
    const toCorrect = (submissions ?? []).filter(
      (s: any) => s.status === 'submitted',
    ).length;
    const upcomingEvalCount = (assignments ?? []).filter(
      (a: any) => a.due_at && new Date(a.due_at).getTime() > Date.now(),
    ).length;

    const { isoWeekday, minutes } = this.nowParts();
    const { data: scheduleItems } = await this.client
      .from('room_schedule_items')
      .select('id, room_id, title, starts_at, ends_at')
      .in('room_id', roomIds)
      .eq('weekday', isoWeekday)
      .order('starts_at', { ascending: true });

    const todayCount = scheduleItems?.length ?? 0;
    const nextItem = (scheduleItems ?? []).find(
      (it: any) =>
        this.sessionStatus(it.starts_at, it.ends_at, minutes) !== 'done',
    );

    let nextCourse: Record<string, unknown> | null = null;
    if (nextItem) {
      const rs = (roomSubjects ?? []).find(
        (x: any) => String(x.room_id) === String(nextItem.room_id),
      );
      const { data: liveSession } = await this.client
        .from('room_attendance_sessions')
        .select('id, status')
        .eq('room_id', nextItem.room_id)
        .eq('session_date', new Date().toISOString().slice(0, 10))
        .in('status', ['live', 'scheduled'])
        .maybeSingle();

      nextCourse = {
        roomId: String(nextItem.room_id),
        title: String(nextItem.title),
        room: roomName.get(String(nextItem.room_id)) ?? 'Salle',
        startsAt: String(nextItem.starts_at).slice(0, 5),
        endsAt: nextItem.ends_at ? String(nextItem.ends_at).slice(0, 5) : null,
        status: this.sessionStatus(
          nextItem.starts_at,
          nextItem.ends_at,
          minutes,
        ),
        studentsCount:
          studentsByRoom.get(String(nextItem.room_id))?.length ?? 0,
        roomSubjectId: rs ? String(rs.id) : null,
        sessionId: liveSession ? String(liveSession.id) : null,
        sessionStatus: liveSession ? String(liveSession.status) : null,
      };
    }

    // Etudiants a suivre : heuristique reelle sur l'assiduite recente.
    const allStudentIds = [...new Set([...studentsByRoom.values()].flat())];
    const watch: Array<{
      id: string;
      name: string;
      reason: string;
      kind: 'bad' | 'warn' | 'ok';
    }> = [];
    if (allStudentIds.length) {
      const { data: names } = await this.client
        .from('profiles')
        .select('id, fullname')
        .in('id', allStudentIds);
      const nameById = new Map(
        (names ?? []).map((n: any) => [String(n.id), String(n.fullname)]),
      );

      const { data: records } = await this.client
        .from('room_attendance_records')
        .select('student_id, status, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(200);

      for (const studentId of allStudentIds) {
        const recent = (records ?? [])
          .filter((r: any) => String(r.student_id) === studentId)
          .slice(0, 5);
        const issues = recent.filter(
          (r: any) => r.status === 'absent' || r.status === 'late',
        ).length;
        if (issues >= 2) {
          watch.push({
            id: studentId,
            name: nameById.get(studentId) ?? 'Etudiant',
            reason: `${issues} absence(s)/retard(s) recents`,
            kind: 'bad',
          });
        } else if (issues === 1) {
          watch.push({
            id: studentId,
            name: nameById.get(studentId) ?? 'Etudiant',
            reason: '1 absence ou retard recent',
            kind: 'warn',
          });
        }
      }
    }

    return {
      classes,
      todayCount,
      totalStudents,
      toCorrect,
      upcomingEvalCount,
      nextCourse,
      watch,
    };
  }

  private emptyTeacherHome() {
    return {
      classes: [],
      todayCount: 0,
      totalStudents: 0,
      toCorrect: 0,
      upcomingEvalCount: 0,
      nextCourse: null,
      watch: [],
    };
  }

  // ------------------------------------------------------------ perimetre pedagogie/direction
  private async pedagogyScopeRoomIds(userId: string, institutionId: string) {
    const { data: scopes } = await this.client
      .from('institution_pedagogy_scopes')
      .select('formation_id')
      .eq('user_id', userId)
      .eq('institution_id', institutionId);

    if (!scopes || scopes.length === 0) {
      // Perimetre par defaut V1 : etablissement entier (voir migration).
      const { data: rooms } = await this.client
        .from('rooms')
        .select('id')
        .eq('institution_id', institutionId);
      return (rooms ?? []).map((r: any) => String(r.id));
    }

    const formationIds = scopes.map((s: any) => String(s.formation_id));
    const { data: rooms } = await this.client
      .from('rooms')
      .select('id')
      .in('formation_id', formationIds)
      .eq('institution_id', institutionId);
    return (rooms ?? []).map((r: any) => String(r.id));
  }

  private async institutionAggregate(institutionId: string, roomIds: string[]) {
    const { data: formations } = await this.client
      .from('formations')
      .select('id, name')
      .eq('institution_id', institutionId);

    const { data: rooms } = await this.client
      .from('rooms')
      .select('id, name, formation_id')
      .in(
        'id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      );

    const { data: roomMembers } = await this.client
      .from('room_members')
      .select('room_id, user_id, role')
      .in(
        'room_id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      );

    const studentIds = new Set(
      (roomMembers ?? [])
        .filter((m: any) => m.role === 'student')
        .map((m: any) => String(m.user_id)),
    );

    const { data: teacherMembers } = await this.client
      .from('institution_members')
      .select('user_id')
      .eq('institution_id', institutionId)
      .eq('role', 'teacher');

    const { data: roomSubjects } = await this.client
      .from('room_subjects')
      .select('id, room_id, subject_id, subjects ( name )')
      .in(
        'room_id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      );

    const { data: sessions } = await this.client
      .from('room_attendance_sessions')
      .select('id, room_id, room_subject_id, status, session_date')
      .in(
        'room_id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      );

    const progressBySubject = (roomSubjects ?? []).map((rs: any) => {
      const relevant = (sessions ?? []).filter(
        (s: any) => String(s.room_subject_id) === String(rs.id),
      );
      const done = relevant.filter((s: any) => s.status === 'done').length;
      const pct = relevant.length
        ? Math.round((done / relevant.length) * 100)
        : 0;
      return {
        subject: String(
          (Array.isArray(rs.subjects) ? rs.subjects[0] : rs.subjects)?.name ??
            'Matiere',
        ),
        pct,
      };
    });

    const overallProgress = progressBySubject.length
      ? Math.round(
          progressBySubject.reduce((sum, p) => sum + p.pct, 0) /
            progressBySubject.length,
        )
      : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: records } = await this.client
      .from('room_attendance_records')
      .select(
        'status, session_id, room_attendance_sessions!inner(session_date, room_id)',
      )
      .in(
        'room_attendance_sessions.room_id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      )
      .gte('room_attendance_sessions.session_date', thirtyDaysAgo);

    const present = (records ?? []).filter(
      (r: any) => r.status === 'present',
    ).length;
    const late = (records ?? []).filter((r: any) => r.status === 'late').length;
    const absent = (records ?? []).filter(
      (r: any) => r.status === 'absent',
    ).length;
    const totalRecords = present + late + absent;
    const attendancePct = totalRecords
      ? Math.round((present / totalRecords) * 100)
      : 0;

    const { count: pendingJustifications } = await this.client
      .from('absence_justifications')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('status', 'pending');

    return {
      formations: (formations ?? []).map((f: any) => ({
        id: String(f.id),
        name: String(f.name),
      })),
      formationsCount: formations?.length ?? 0,
      classesCount: rooms?.length ?? 0,
      studentsCount: studentIds.size,
      teachersCount: new Set(
        (teacherMembers ?? []).map((m: any) => String(m.user_id)),
      ).size,
      overallProgress,
      progressBySubject,
      attendancePct,
      attendance: { present, late, absent },
      pendingJustifications: pendingJustifications ?? 0,
      rooms: (rooms ?? []).map((r: any) => ({
        id: String(r.id),
        name: String(r.name),
        formationId: r.formation_id ? String(r.formation_id) : null,
        studentsCount: (roomMembers ?? []).filter(
          (m: any) =>
            String(m.room_id) === String(r.id) && m.role === 'student',
        ).length,
      })),
    };
  }

  // ------------------------------------------------------------ pedagogie
  private async getPedagogyHome(ctx: {
    userId: string;
    institutionId: string;
  }) {
    const roomIds = await this.pedagogyScopeRoomIds(
      ctx.userId,
      ctx.institutionId,
    );
    const agg = await this.institutionAggregate(ctx.institutionId, roomIds);

    const { data: notifications } = await this.client
      .from('notifications')
      .select('id, title, message, created_at')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: documents } = await this.client
      .from('institution_documents')
      .select('id, title, category, created_at')
      .eq('institution_id', ctx.institutionId)
      .order('created_at', { ascending: false })
      .limit(3);

    const lowProgressClasses = agg.progressBySubject.filter(
      (p) => p.pct < 50,
    ).length;

    return {
      ...agg,
      lowProgressClasses,
      messages: (notifications ?? []).map((n: any) => ({
        id: String(n.id),
        title: String(n.title),
        body: String(n.message ?? ''),
        createdAt: n.created_at,
      })),
      documents: (documents ?? []).map((d: any) => ({
        id: String(d.id),
        title: String(d.title),
        category: String(d.category),
        createdAt: d.created_at,
      })),
    };
  }

  // ------------------------------------------------------------ direction
  private async getDirectionHome(ctx: {
    userId: string;
    institutionId: string;
  }) {
    const { data: rooms } = await this.client
      .from('rooms')
      .select('id')
      .eq('institution_id', ctx.institutionId);
    const roomIds = (rooms ?? []).map((r: any) => String(r.id));
    const agg = await this.institutionAggregate(ctx.institutionId, roomIds);

    const { data: managedUsers } = await this.client
      .from('institution_managed_users')
      .select('id, full_name, managed_role, status, created_at')
      .eq('institution_id', ctx.institutionId)
      .order('created_at', { ascending: false })
      .limit(5);

    const byFormation = new Map<string, { name: string; value: number }>();
    for (const r of agg.rooms) {
      const key = r.formationId ?? 'none';
      const label =
        agg.formations.find((f) => f.id === r.formationId)?.name ??
        'Sans formation';
      const entry = byFormation.get(key) ?? { name: label, value: 0 };
      entry.value += r.studentsCount;
      byFormation.set(key, entry);
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data: recentSessions } = await this.client
      .from('room_attendance_sessions')
      .select('session_date, status')
      .in(
        'room_id',
        roomIds.length ? roomIds : ['00000000-0000-0000-0000-000000000000'],
      )
      .eq('status', 'done')
      .gte('session_date', sevenDaysAgo);

    const activityByDay = new Map<string, number>();
    for (const s of recentSessions ?? []) {
      const day = String(s.session_date);
      activityByDay.set(day, (activityByDay.get(day) ?? 0) + 1);
    }
    const activityLabels: string[] = [];
    const activityValues: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const key = d.toISOString().slice(0, 10);
      activityLabels.push(
        new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
          .format(d)
          .replace('.', ''),
      );
      activityValues.push(activityByDay.get(key) ?? 0);
    }

    // institution_managed_users.status vaut 'active' | 'invited' | 'suspended'
    // (pas 'pending') : 'invited' est le compte cree mais jamais encore connecte.
    const pendingManagedUsers = (managedUsers ?? []).filter(
      (m: any) => m.status === 'invited',
    ).length;
    const lowProgressClasses = agg.progressBySubject.filter(
      (p) => p.pct < 50,
    ).length;

    return {
      ...agg,
      lowProgressClasses,
      inscriptions: (managedUsers ?? []).map((m: any) => ({
        id: String(m.id),
        name: String(m.full_name),
        role: String(m.managed_role),
        status: String(m.status),
        createdAt: m.created_at,
      })),
      pendingManagedUsers,
      effectifsParFormation: [...byFormation.values()],
      activity: { labels: activityLabels, values: activityValues },
    };
  }

  // ------------------------------------------------------------ actions de seance (mode Classe)
  private async assertTeacherOfRoom(userId: string, roomId: string) {
    const { data, error } = await this.client
      .from('room_members')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data || data.role !== 'teacher') {
      throw new ForbiddenException("Tu n'es pas professeur de cette classe.");
    }
  }

  async startSession(user: AuthUser, roomId: string, body: StartSessionDto) {
    await this.assertTeacherOfRoom(user.id, roomId);

    const { data: roomSubject, error: rsError } = await this.client
      .from('room_subjects')
      .select('id, room_id, subject_id, subjects ( name )')
      .eq('id', body.room_subject_id)
      .eq('teacher_id', user.id)
      .maybeSingle();
    if (rsError) throw new BadRequestException(rsError.message);
    if (!roomSubject || String(roomSubject.room_id) !== roomId) {
      throw new NotFoundException('Matiere introuvable pour cette classe.');
    }

    const { data: room } = await this.client
      .from('rooms')
      .select('institution_id')
      .eq('id', roomId)
      .maybeSingle();

    if (!room) {
      throw new NotFoundException('Salle introuvable.');
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await this.client
      .from('room_attendance_sessions')
      .select('id, status')
      .eq('room_id', roomId)
      .eq('room_subject_id', body.room_subject_id)
      .eq('session_date', today)
      .maybeSingle();

    if (
      existing &&
      existing.status !== 'done' &&
      existing.status !== 'cancelled'
    ) {
      await this.client
        .from('room_attendance_sessions')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
          teacher_id: user.id,
        })
        .eq('id', existing.id);
      return { id: String(existing.id), status: 'live' };
    }

    const subjectName = String(
      (Array.isArray(roomSubject.subjects)
        ? roomSubject.subjects[0]
        : roomSubject.subjects
      )?.name ?? 'Seance',
    );

    const { data: created, error: createError } = await this.client
      .from('room_attendance_sessions')
      .insert({
        room_id: roomId,
        institution_id: room?.institution_id,
        title: subjectName,
        session_date: today,
        room_subject_id: body.room_subject_id,
        teacher_id: user.id,
        status: 'live',
        started_at: new Date().toISOString(),
      })
      .select('id, status')
      .single();

    if (createError || !created) {
      throw new BadRequestException(
        createError?.message ?? 'Impossible de demarrer la seance.',
      );
    }

    return { id: String(created.id), status: created.status };
  }

  async getSessionRoster(user: AuthUser, sessionId: string) {
    const { data: session, error } = await this.client
      .from('room_attendance_sessions')
      .select('id, room_id, teacher_id, status, content_done, homework')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!session) throw new NotFoundException('Seance introuvable.');
    if (String(session.teacher_id) !== user.id) {
      await this.assertTeacherOfRoom(user.id, String(session.room_id));
    }

    const { data: members } = await this.client
      .from('room_members')
      .select('user_id, profiles ( id, fullname )')
      .eq('room_id', session.room_id)
      .eq('role', 'student');

    const { data: records } = await this.client
      .from('room_attendance_records')
      .select('student_id, status, note')
      .eq('session_id', sessionId);
    const recordByStudent = new Map(
      (records ?? []).map((r: any) => [String(r.student_id), r]),
    );

    const roster = (members ?? []).map((m: any) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      const record = recordByStudent.get(String(m.user_id));
      return {
        studentId: String(m.user_id),
        name: String(profile?.fullname ?? 'Etudiant'),
        status: record ? String(record.status) : null,
        note: record?.note ?? null,
      };
    });

    return {
      sessionId: String(session.id),
      status: String(session.status),
      contentDone: session.content_done ?? '',
      homework: session.homework ?? '',
      roster,
    };
  }

  async markAttendance(
    user: AuthUser,
    sessionId: string,
    body: MarkAttendanceDto,
  ) {
    const { data: session, error } = await this.client
      .from('room_attendance_sessions')
      .select('id, room_id, teacher_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!session) throw new NotFoundException('Seance introuvable.');
    if (String(session.teacher_id) !== user.id) {
      await this.assertTeacherOfRoom(user.id, String(session.room_id));
    }

    for (const record of body.records) {
      const { error: upsertError } = await this.client
        .from('room_attendance_records')
        .upsert(
          {
            session_id: sessionId,
            room_id: session.room_id,
            student_id: record.student_id,
            status: record.status,
            note: record.note ?? null,
            marked_by: user.id,
          },
          { onConflict: 'session_id,student_id' },
        );
      if (upsertError) {
        throw new BadRequestException(upsertError.message);
      }
    }

    return { message: 'Presences enregistrees.' };
  }

  async endSession(user: AuthUser, sessionId: string, body: EndSessionDto) {
    const { data: session, error } = await this.client
      .from('room_attendance_sessions')
      .select('id, room_id, teacher_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!session) throw new NotFoundException('Seance introuvable.');
    if (String(session.teacher_id) !== user.id) {
      await this.assertTeacherOfRoom(user.id, String(session.room_id));
    }

    const { data: updated, error: updateError } = await this.client
      .from('room_attendance_sessions')
      .update({
        status: 'done',
        ended_at: new Date().toISOString(),
        content_done: body.content_done ?? null,
        homework: body.homework ?? null,
      })
      .eq('id', sessionId)
      .select('id, status')
      .single();

    if (updateError || !updated) {
      throw new BadRequestException(
        updateError?.message ?? 'Impossible de cloturer la seance.',
      );
    }

    return { id: String(updated.id), status: updated.status };
  }

  // ------------------------------------------------------------ formations & classes (direction)
  private async assertInstitutionStaff(
    userId: string,
    institutionId: string,
    allowedRoles: string[] = ['owner', 'admin'],
  ) {
    const { data, error } = await this.client
      .from('institution_members')
      .select('role')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data || !allowedRoles.includes(String(data.role))) {
      throw new ForbiddenException(
        'Cette action est reservee au personnel autorise de cet etablissement.',
      );
    }
    return String(data.role);
  }

  async listFormations(user: AuthUser, institutionId: string) {
    // Lecture ouverte au personnel de direction et au responsable pedagogique
    // (perimetre entier en V1, voir migration) ; creation/rattachement reste
    // reserve a owner/admin (methodes suivantes, garde par defaut).
    await this.assertInstitutionStaff(user.id, institutionId, [
      'owner',
      'admin',
      'pedagogy',
    ]);

    const { data: formations, error } = await this.client
      .from('formations')
      .select('id, name, level, created_at')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);

    const { data: rooms } = await this.client
      .from('rooms')
      .select('id, name, formation_id')
      .eq('institution_id', institutionId);

    const { data: roomMembers } = await this.client
      .from('room_members')
      .select('room_id, user_id, role, profiles ( fullname )')
      .in(
        'room_id',
        (rooms ?? []).map((r: any) => r.id).length
          ? (rooms ?? []).map((r: any) => r.id)
          : ['00000000-0000-0000-0000-000000000000'],
      );

    const roomSummary = (roomId: string) => {
      const members = (roomMembers ?? []).filter(
        (m: any) => String(m.room_id) === roomId,
      );
      return {
        studentsCount: members.filter((m: any) => m.role === 'student')
          .length,
        teacherNames: members
          .filter((m: any) => m.role === 'teacher')
          .map(
            (m: any) =>
              String(
                (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles)
                  ?.fullname ?? 'Professeur',
              ),
          ),
      };
    };

    const roomPayload = (room: any) => ({
      id: String(room.id),
      name: String(room.name),
      ...roomSummary(String(room.id)),
    });

    const grouped = (formations ?? []).map((f: any) => ({
      id: String(f.id),
      name: String(f.name),
      level: f.level ?? null,
      rooms: (rooms ?? [])
        .filter((r: any) => String(r.formation_id) === String(f.id))
        .map(roomPayload),
    }));

    const unassignedRooms = (rooms ?? [])
      .filter((r: any) => !r.formation_id)
      .map(roomPayload);

    return { formations: grouped, unassignedRooms };
  }

  async createFormation(
    user: AuthUser,
    institutionId: string,
    payload: { name: string; level?: string },
  ) {
    await this.assertInstitutionStaff(user.id, institutionId);
    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom de la formation est obligatoire.');
    }

    const { data, error } = await this.client
      .from('formations')
      .insert({
        institution_id: institutionId,
        name,
        level: payload.level?.trim() || null,
        created_by: user.id,
      })
      .select('id, name, level')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? 'Impossible de creer la formation.',
      );
    }
    return data;
  }

  async createRoomInFormation(
    user: AuthUser,
    formationId: string,
    payload: { name: string; description?: string },
  ) {
    const { data: formation, error: formationError } = await this.client
      .from('formations')
      .select('id, institution_id')
      .eq('id', formationId)
      .maybeSingle();
    if (formationError) throw new BadRequestException(formationError.message);
    if (!formation) throw new NotFoundException('Formation introuvable.');

    await this.assertInstitutionStaff(
      user.id,
      String(formation.institution_id),
    );

    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Le nom de la classe est obligatoire.');
    }

    const { data, error } = await this.client
      .from('rooms')
      .insert({
        institution_id: formation.institution_id,
        formation_id: formationId,
        name,
        description: payload.description?.trim() || null,
        created_by: user.id,
      })
      .select('id, name')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? 'Impossible de creer la classe.',
      );
    }
    return data;
  }

  async assignRoomToFormation(
    user: AuthUser,
    roomId: string,
    formationId: string,
  ) {
    const { data: room, error: roomError } = await this.client
      .from('rooms')
      .select('id, institution_id')
      .eq('id', roomId)
      .maybeSingle();
    if (roomError) throw new BadRequestException(roomError.message);
    if (!room) throw new NotFoundException('Classe introuvable.');

    const { data: formation, error: formationError } = await this.client
      .from('formations')
      .select('id, institution_id')
      .eq('id', formationId)
      .maybeSingle();
    if (formationError) throw new BadRequestException(formationError.message);
    if (!formation) throw new NotFoundException('Formation introuvable.');

    if (String(formation.institution_id) !== String(room.institution_id)) {
      throw new BadRequestException(
        'La formation et la classe doivent appartenir au meme etablissement.',
      );
    }

    await this.assertInstitutionStaff(user.id, String(room.institution_id));

    const { error } = await this.client
      .from('rooms')
      .update({ formation_id: formationId })
      .eq('id', roomId);
    if (error) throw new BadRequestException(error.message);

    return { message: 'Classe rattachee a la formation.' };
  }

  // ------------------------------------------------------------ mes travaux (etudiant, toutes classes)
  async listMyAssignments(user: AuthUser) {
    const { data: memberships } = await this.client
      .from('room_members')
      .select('room_id')
      .eq('user_id', user.id)
      .eq('role', 'student');
    const roomIds = [...new Set((memberships ?? []).map((m: any) => String(m.room_id)))];
    if (roomIds.length === 0) return { assignments: [] };

    const { data: rooms } = await this.client
      .from('rooms')
      .select('id, name')
      .in('id', roomIds);
    const roomName = new Map((rooms ?? []).map((r: any) => [String(r.id), String(r.name)]));

    const { data: assignments } = await this.client
      .from('assignments')
      .select('id, room_id, title, instructions, due_at, max_score, status')
      .in('room_id', roomIds)
      .eq('status', 'published')
      .order('due_at', { ascending: true, nullsFirst: false });

    const { data: submissions } = await this.client
      .from('assignment_submissions')
      .select('id, assignment_id, status, content, file_path, score, feedback, published, submitted_at')
      .eq('student_id', user.id);
    const submissionByAssignment = new Map(
      (submissions ?? []).map((s: any) => [String(s.assignment_id), s]),
    );

    return {
      assignments: (assignments ?? []).map((a: any) => {
        const sub = submissionByAssignment.get(String(a.id));
        return {
          id: String(a.id),
          roomId: String(a.room_id),
          roomName: roomName.get(String(a.room_id)) ?? 'Salle',
          title: String(a.title),
          instructions: a.instructions ?? null,
          dueAt: a.due_at ?? null,
          maxScore: a.max_score ?? null,
          submission: sub
            ? {
                id: String(sub.id),
                status: String(sub.status),
                content: sub.content ?? null,
                filePath: sub.file_path ?? null,
                score: sub.published ? (sub.score ?? null) : null,
                feedback: sub.published ? (sub.feedback ?? null) : null,
                submittedAt: sub.submitted_at ?? null,
              }
            : null,
        };
      }),
    };
  }
}
