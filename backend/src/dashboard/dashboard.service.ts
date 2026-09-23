import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfilesRow } from '../types/supabase';

type ProfileSummary = Pick<
  ProfilesRow,
  | 'id'
  | 'email'
  | 'fullname'
  | 'role'
  | 'country'
  | 'level'
  | 'school_name'
  | 'expertise'
  | 'bio'
> & {
  avatar_url?: ProfilesRow['avatar_url'];
};

type ProfileUpdatePayload = {
  fullname?: string;
  level?: string | null;
  school_name?: string | null;
  expertise?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

type UploadedAvatar = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

type DashboardRole = 'student' | 'teacher' | 'institution';
type WorkspaceKind =
  | 'public-student'
  | 'public-teacher'
  | 'institution-admin'
  | 'institution-teacher'
  | 'institution-student';

type WorkspacePayload = {
  kind: WorkspaceKind;
  institutionId: string | null;
  institutionName: string | null;
  institutionRole: string | null;
  managed: boolean;
};

type DashboardContext = {
  dashboardRole: DashboardRole;
  workspace: WorkspacePayload;
};

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Tracks whether optional, migration-gated columns exist on the live
  // database (e.g. profiles.avatar_url, courses.level). Cached for the
  // process lifetime; restart the backend after running a pending
  // migration to pick up the change.
  private columnAvailability = new Map<string, boolean>();

  private async supportsColumn(table: string, column: string) {
    const key = `${table}.${column}`;
    const cached = this.columnAvailability.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const { error } = await this.supabaseService.client
      .from(table)
      .select(column)
      .limit(1);

    const available = !this.isMissingColumnError(error);
    this.columnAvailability.set(key, available);
    return available;
  }

  private isMissingColumnError(
    error: { message?: string; code?: string } | null | undefined,
  ) {
    // Postgres raises 42703 (undefined_column) for a SELECT referencing a
    // missing column; PostgREST raises PGRST204 with a "could not find the
    // ... column ... in the schema cache" message for INSERT/UPDATE. Both
    // mean the same thing here: the migration-gated column isn't present.
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      return true;
    }
    const message = String(error?.message ?? '').toLowerCase();
    return (
      (message.includes('could not find the') && message.includes('column')) ||
      (message.includes('column') && message.includes('does not exist'))
    );
  }

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const context = await this.resolveDashboardContext(
      userId,
      String(profile.role ?? ''),
    );

    if (context.dashboardRole === 'teacher') {
      return this.getTeacherDashboard(profile, context.workspace);
    }

    if (context.dashboardRole === 'institution') {
      return this.getInstitutionDashboard(userId, profile);
    }

    return this.getStudentDashboard(profile, context.workspace);
  }

  private async getProfile(userId: string) {
    const hasAvatarUrl = await this.supportsColumn('profiles', 'avatar_url');
    const profileSelect: string = `id, email, fullname, role, country, level, school_name, expertise, bio${
      hasAvatarUrl ? ', avatar_url' : ''
    }`;
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select<string, ProfileSummary>(profileSelect)
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profil utilisateur introuvable.');
    }

    return data;
  }

  async updateProfile(userId: string, payload: ProfileUpdatePayload) {
    const hasAvatarUrl = await this.supportsColumn('profiles', 'avatar_url');

    const updates: Record<string, unknown> = {
      fullname: payload.fullname?.trim(),
      level: payload.level?.trim() || null,
      school_name: payload.school_name?.trim() || null,
      expertise: payload.expertise?.trim() || null,
      bio: payload.bio?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (hasAvatarUrl) {
      updates.avatar_url = payload.avatar_url?.trim() || null;
    }

    if (!updates.fullname) {
      const currentProfile = await this.getProfile(userId);
      updates.fullname = String(currentProfile.fullname ?? '').trim();
    }

    const profileSelect: string = `id, email, fullname, role, country, level, school_name, expertise, bio${
      hasAvatarUrl ? ', avatar_url' : ''
    }`;
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select<string, ProfileSummary>(profileSelect)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        error?.message ?? 'Impossible de mettre a jour le profil.',
      );
    }

    return data;
  }

  async uploadProfileAvatar(userId: string, file: UploadedAvatar) {
    const hasAvatarUrl = await this.supportsColumn('profiles', 'avatar_url');
    if (!hasAvatarUrl) {
      throw new BadRequestException(
        "La photo de profil n'est pas encore disponible sur ce serveur.",
      );
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('La photo envoyee est vide.');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('La photo de profil doit etre une image.');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'La photo de profil ne doit pas depasser 5 Mo.',
      );
    }

    const bucket = 'profile-avatars';
    await this.ensureProfileAvatarBucket(bucket);

    const safeName = this.sanitizeFilename(file.originalname || 'avatar.png');
    const filePath = `${userId}/${Date.now()}-${safeName || 'avatar.png'}`;

    const { error } = await this.supabaseService.client.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(
        error.message ?? "L'upload de la photo de profil a echoue.",
      );
    }

    const { data: publicUrlData } = this.supabaseService.client.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData?.publicUrl ?? filePath;

    const { data, error: updateError } = await this.supabaseService.client
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(
        'id, email, fullname, role, country, level, school_name, expertise, bio, avatar_url',
      )
      .single();

    if (updateError || !data) {
      throw new BadRequestException(
        updateError?.message ??
          "La photo a ete envoyee, mais le profil n'a pas pu etre mis a jour.",
      );
    }

    return data;
  }

  private async getStudentDashboard(
    profile: ProfileSummary,
    workspace: WorkspacePayload,
  ) {
    const { data: enrollments } = await this.supabaseService.client
      .from('enrollments')
      .select(
        `
          id,
          enrolled_at,
          courses (
            id,
            title,
            description,
            thumbnail_url,
            course_modules (
              lessons (
                id,
                title,
                order_index
              ),
              order_index
            )
          )
        `,
      )
      .eq('user_id', profile.id)
      .order('enrolled_at', { ascending: false });

    const { data: progressRows } = await this.supabaseService.client
      .from('progress')
      .select(
        `
          status,
          lessons (
            id,
            title,
            course_id
          )
        `,
      )
      .eq('user_id', profile.id);

    const hasCourseLevel = await this.supportsColumn('courses', 'level');
    const catalogSelect: string = `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          teacher_id${hasCourseLevel ? ',\n          level' : ''},
          profiles:teacher_id (
            fullname
          ),
          lessons ( id )
        `;
    const { data: catalogRows } = await this.supabaseService.client
      .from('courses')
      .select<string, any>(catalogSelect)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    const { data: institutionMembershipRows } =
      await this.supabaseService.client
        .from('institution_members')
        .select(
          `
          id,
          role,
          joined_at,
          institutions (
            id,
            name,
            slug,
            institution_type,
            plan_name,
            subscription_status
          )
        `,
        )
        .eq('user_id', profile.id)
        .order('joined_at', { ascending: false });

    const { data: roomMembershipRows } = await this.supabaseService.client
      .from('room_members')
      .select(
        `
          id,
          role,
          joined_at,
          rooms (
            id,
            name,
            slug,
            description,
            institution_id,
            institutions (
              id,
              name,
              slug
            )
          )
        `,
      )
      .eq('user_id', profile.id)
      .order('joined_at', { ascending: false });

    const roomIds = (roomMembershipRows ?? [])
      .map((row: any) => {
        const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
        return room?.id ? String(room.id) : '';
      })
      .filter(Boolean);

    const { data: roomAssignmentRows } = roomIds.length
      ? await this.supabaseService.client
          .from('assignments')
          .select('id, room_id, title, status, due_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
      : { data: [] as Array<Record<string, unknown>> };

    const scheduleResult = roomIds.length
      ? await this.supabaseService.client
          .from('room_schedule_items')
          .select('id, room_id, title, weekday, starts_at, ends_at, location')
          .in('room_id', roomIds)
          .order('weekday', { ascending: true })
          .order('starts_at', { ascending: true })
      : { data: [] as Array<Record<string, unknown>>, error: null };
    const roomScheduleRows = this.isMissingCampusLifeTableError(
      scheduleResult.error,
    )
      ? []
      : (scheduleResult.data ?? []);

    const { data: roomCourseRows } = roomIds.length
      ? await this.supabaseService.client
          .from('room_courses')
          .select(
            `
              id,
              room_id,
              created_at,
              rooms (
                id,
                name
              ),
              courses (
                id,
                title,
                description,
                short_description,
                price_fcfa,
                thumbnail_url,
                profiles:teacher_id (
                  fullname
                ),
                lessons ( id )
              )
            `,
          )
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
      : { data: [] as Array<Record<string, unknown>> };

    const catalogCourseIds = (catalogRows ?? []).map(
      (course: any) => course.id,
    );
    const catalogReviewResult = catalogCourseIds.length
      ? await this.supabaseService.client
          .from('course_reviews')
          .select('course_id, rating')
          .in('course_id', catalogCourseIds)
      : { data: [] as Array<Record<string, unknown>>, error: null };
    const catalogReviewRows = this.isMissingTableError(
      catalogReviewResult.error,
    )
      ? []
      : (catalogReviewResult.data ?? []);

    const thumbnailUrls = await this.resolveStorageUrls('course-thumbnails', [
      ...(enrollments ?? []).map((item: any) => item.courses?.thumbnail_url),
      ...(catalogRows ?? []).map((course: any) => course.thumbnail_url),
      ...(roomCourseRows ?? []).map((row: any) => {
        const course = Array.isArray(row.courses)
          ? row.courses[0]
          : row.courses;
        return course?.thumbnail_url;
      }),
    ]);

    const enrollmentsList = (enrollments ?? []).map((item: any) => {
      const progressByLesson = new Map<string, string>();
      for (const row of progressRows ?? []) {
        const lessonData = Array.isArray(row.lessons)
          ? row.lessons[0]
          : row.lessons;
        if (
          lessonData?.course_id === item.courses?.id &&
          !progressByLesson.has(lessonData.id)
        ) {
          progressByLesson.set(lessonData.id, row.status ?? 'started');
        }
      }

      const orderedLessons = (
        (item.courses?.course_modules ?? []) as Array<any>
      )
        .slice()
        .sort(
          (a: any, b: any) =>
            Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
        )
        .flatMap((module: any) =>
          (module.lessons ?? [])
            .slice()
            .sort(
              (a: any, b: any) =>
                Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
            ),
        );

      const completedCount = Array.from(progressByLesson.values()).filter(
        (status) => status === 'completed',
      ).length;
      const engagedCount = Array.from(progressByLesson.values()).filter(
        (status) => status === 'started' || status === 'completed',
      ).length;
      const totalCount = orderedLessons.length;
      const progress =
        totalCount > 0 ? Math.round((engagedCount / totalCount) * 100) : 0;
      const nextLessonData = orderedLessons.find(
        (lesson: any) => progressByLesson.get(lesson.id) !== 'completed',
      );
      const nextLesson =
        nextLessonData?.title ??
        orderedLessons[0]?.title ??
        'Aucune lecon disponible';

      return {
        id: item.courses?.id ?? item.id,
        enrollmentId: item.id,
        title: item.courses?.title ?? 'Cours sans titre',
        description: item.courses?.description ?? '',
        thumbnailUrl:
          thumbnailUrls.get(String(item.courses?.thumbnail_url ?? '')) ?? '',
        progress,
        nextLesson,
        enrolledAt: item.enrolled_at,
      };
    });

    const uniqueLessonProgress = new Map<string, string>();
    for (const row of progressRows ?? []) {
      const lessonData = Array.isArray(row.lessons)
        ? row.lessons[0]
        : row.lessons;
      if (lessonData?.id && !uniqueLessonProgress.has(lessonData.id)) {
        uniqueLessonProgress.set(lessonData.id, row.status ?? 'started');
      }
    }

    const completedLessons = Array.from(uniqueLessonProgress.values()).filter(
      (status) => status === 'completed',
    ).length;
    const totalLessons = (enrollments ?? []).reduce(
      (sum: number, item: any) => {
        const lessonsCount = (
          (item.courses?.course_modules ?? []) as Array<any>
        ).reduce(
          (moduleSum: number, module: any) =>
            moduleSum + ((module.lessons ?? []) as Array<any>).length,
          0,
        );

        return sum + lessonsCount;
      },
      0,
    );
    const enrolledCourseIds = new Set(
      (enrollments ?? []).map((item: any) => String(item.courses?.id ?? '')),
    );
    const catalogCourses = (catalogRows ?? []).map((course: any) => ({
      id: course.id,
      enrolled: enrolledCourseIds.has(String(course.id)),
      title: course.title ?? 'Cours sans titre',
      description:
        course.short_description ??
        course.description ??
        'Cours disponible sur Kalatty.',
      fullDescription: course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailUrl: thumbnailUrls.get(String(course.thumbnail_url ?? '')) ?? '',
      teacherName: course.profiles?.fullname ?? 'Formateur Kalatty',
      badge: 'Disponible',
      category: 'Catalogue',
      level: course.level ?? '',
      lessonsCount: course.lessons?.length ?? 0,
      ratingAverage: this.getAverageRating(
        (catalogReviewRows ?? [])
          .filter((review: any) => review.course_id === course.id)
          .map((review: any) => ({
            rating: Number(review.rating ?? 0),
          })),
      ),
    }));

    const campusCoursesMap = new Map<string, Record<string, unknown>>();
    for (const row of roomCourseRows ?? []) {
      const course = Array.isArray((row as any).courses)
        ? (row as any).courses[0]
        : (row as any).courses;
      const room = Array.isArray((row as any).rooms)
        ? (row as any).rooms[0]
        : (row as any).rooms;

      if (!course?.id) {
        continue;
      }

      const courseId = String(course.id);
      const existingRooms = Array.isArray(
        campusCoursesMap.get(courseId)?.roomNames,
      )
        ? (campusCoursesMap.get(courseId)?.roomNames as string[])
        : [];
      const roomName = String(room?.name ?? 'Classe');

      campusCoursesMap.set(courseId, {
        id: courseId,
        title: course.title ?? 'Cours campus',
        description:
          course.short_description ??
          course.description ??
          'Cours attribue par ton etablissement.',
        fullDescription: course.description ?? '',
        priceFcfa: Number(course.price_fcfa ?? 0),
        thumbnailUrl:
          thumbnailUrls.get(String(course.thumbnail_url ?? '')) ?? '',
        teacherName: course.profiles?.fullname ?? 'Professeur etablissement',
        badge: 'Campus',
        category: roomName,
        roomId: row.room_id ?? room?.id ?? '',
        roomNames: existingRooms.includes(roomName)
          ? existingRooms
          : existingRooms.concat(roomName),
        lessonsCount: course.lessons?.length ?? 0,
        ratingAverage: 0,
        campusOnly: true,
        enrolled: true,
        institutionAccess: true,
        accessSource: 'institution',
      });
    }

    const campusCourses = Array.from(campusCoursesMap.values());

    const studentInstitutions = (institutionMembershipRows ?? []).map(
      (row: any) => {
        const institution = Array.isArray(row.institutions)
          ? row.institutions[0]
          : row.institutions;

        return {
          id: institution?.id ?? row.id,
          name: institution?.name ?? 'Etablissement',
          slug: institution?.slug ?? '',
          institutionType: institution?.institution_type ?? '',
          planName: institution?.plan_name ?? '',
          subscriptionStatus: institution?.subscription_status ?? '',
          membershipRole: row.role ?? 'student',
          joinedAt: row.joined_at,
        };
      },
    );

    const studentRooms = (roomMembershipRows ?? []).map((row: any) => {
      const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
      const institution = Array.isArray(room?.institutions)
        ? room.institutions[0]
        : room?.institutions;
      const assignments = (roomAssignmentRows ?? []).filter(
        (assignment: any) => assignment.room_id === room?.id,
      );

      return {
        id: room?.id ?? row.id,
        name: room?.name ?? 'Salle',
        slug: room?.slug ?? '',
        description: room?.description ?? '',
        institutionId: room?.institution_id ?? institution?.id ?? '',
        institutionName: institution?.name ?? 'Etablissement',
        role: row.role ?? 'student',
        joinedAt: row.joined_at,
        assignmentsCount: assignments.length,
        pendingAssignments: assignments.filter(
          (assignment: any) => assignment.status === 'published',
        ).length,
        latestAssignmentTitle: assignments[0]?.title ?? '',
      };
    });

    const studentInstitutionTasks: Array<{
      label: string;
      courseId?: string;
      roomId?: string;
    }> = studentRooms.slice(0, 3).map((room: any) => ({
      label: room.latestAssignmentTitle
        ? `Verifier ${room.latestAssignmentTitle} dans ${room.name}.`
        : `Consulter les annonces de ${room.name}.`,
      roomId: room.id,
    }));

    const campusClassSchedule = (roomScheduleRows ?? []).map((item: any) => {
      const room = studentRooms.find(
        (studentRoom: any) => studentRoom.id === item.room_id,
      );
      const weekdays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

      return {
        id: item.id,
        title: item.title ?? 'Cours programme',
        roomName: room?.name ?? 'Salle',
        date: null,
        day: weekdays[Number(item.weekday ?? 1) - 1] ?? 'Jour',
        time: `${String(item.starts_at ?? '').slice(0, 5)}${
          item.ends_at ? ` - ${String(item.ends_at).slice(0, 5)}` : ''
        }`,
        type: 'cours',
        location: item.location ?? '',
      };
    });

    const campusAssignmentSchedule = (roomAssignmentRows ?? [])
      .filter((assignment: any) => assignment.due_at)
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.due_at).getTime() - new Date(b.due_at).getTime(),
      )
      .slice(0, 6)
      .map((assignment: any) => {
        const room = studentRooms.find(
          (studentRoom: any) => studentRoom.id === assignment.room_id,
        );
        const dueDate = new Date(assignment.due_at);

        return {
          id: assignment.id,
          title: assignment.title ?? 'Activite programmee',
          roomName: room?.name ?? 'Salle',
          date: assignment.due_at,
          day: dueDate.toLocaleDateString('fr-FR', { weekday: 'short' }),
          time: dueDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          type: 'devoir',
        };
      });
    const campusSchedule = [
      ...campusClassSchedule,
      ...campusAssignmentSchedule,
    ].slice(0, 8);

    return {
      role: 'student',
      workspace,
      profile,
      stats: {
        enrolledCourses: enrollmentsList.length,
        completedLessons,
        progressAverage:
          enrollmentsList.length > 0
            ? Math.round(
                enrollmentsList.reduce(
                  (sum: number, item: { progress: number }) =>
                    sum + item.progress,
                  0,
                ) / enrollmentsList.length,
              )
            : 0,
        totalLessons,
        availableCatalogCourses: catalogCourses.length,
        campusCourses: campusCourses.length,
        linkedInstitutions: studentInstitutions.length,
        activeRooms: studentRooms.length,
      },
      courses: enrollmentsList,
      catalogCourses,
      campusCourses,
      campusSchedule,
      studentInstitutions,
      studentRooms,
      tasks: (
        enrollmentsList.slice(0, 3).map((course: any) => ({
          label:
            course.progress >= 100
              ? `Revoir les points cles du cours ${course.title}.`
              : `Continuer ${course.title} et travailler ${course.nextLesson}.`,
          courseId: course.id as string | undefined,
        })) as Array<{ label: string; courseId?: string; roomId?: string }>
      )
        .concat(studentInstitutionTasks)
        .slice(0, 5),
    };
  }

  private getAverageRating(reviews: Array<{ rating: number }>) {
    if (reviews.length === 0) {
      return 0;
    }

    return Number(
      (
        reviews.reduce((sum, review) => sum + Number(review.rating ?? 0), 0) /
        reviews.length
      ).toFixed(1),
    );
  }

  private async getTeacherDashboard(
    profile: ProfileSummary,
    workspace: WorkspacePayload,
  ) {
    const { data: courses } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          price_fcfa,
          thumbnail_url,
          status,
          created_at,
          enrollments ( id ),
          lessons ( id, video_path )
        `,
      )
      .eq('teacher_id', profile.id)
      .neq('status', 'archived');

    const thumbnailUrls = await this.resolveStorageUrls(
      'course-thumbnails',
      (courses ?? []).map((course: any) => course.thumbnail_url),
    );

    const coursesList = (courses ?? []).map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      videoUrl:
        course.lessons?.find((lesson: any) => lesson.video_path)?.video_path ??
        '',
      thumbnailUrl: thumbnailUrls.get(String(course.thumbnail_url ?? '')) ?? '',
      status: course.status ?? 'draft',
      createdAt: course.created_at,
      learners: course.enrollments?.length ?? 0,
      lessonsCount: course.lessons?.length ?? 0,
    }));

    const revenueStats = await this.getTeacherRevenue(profile.id);
    const teacherRooms = await this.getTeacherRooms(profile.id);
    const totalLearners = coursesList.reduce(
      (sum: number, course: { learners: number }) => sum + course.learners,
      0,
    );

    return {
      role: 'teacher',
      workspace,
      profile,
      stats: {
        publishedCourses: coursesList.length,
        totalLearners,
        averageLearners:
          coursesList.length > 0
            ? Math.round(totalLearners / coursesList.length)
            : 0,
        totalRevenue: revenueStats.totalRevenue,
        monthRevenue: revenueStats.monthRevenue,
        activeClasses: teacherRooms.length,
      },
      courses: coursesList,
      teacherRooms,
      tasks: [
        { label: 'Publier une nouvelle lecon video.' },
        { label: 'Ajouter un exercice corrige pour le prochain module.' },
        { label: 'Suivre les inscriptions des derniers apprenants.' },
      ],
    };
  }

  private async resolveStorageUrls(bucket: string, paths: unknown[]) {
    const uniquePaths = Array.from(
      new Set(
        paths
          .map((path) => String(path ?? '').trim())
          .filter((path) => path.length > 0),
      ),
    );

    const entries = await Promise.all(
      uniquePaths.map(async (path) => {
        if (path.startsWith('http://') || path.startsWith('https://')) {
          return [path, path] as const;
        }

        const { data, error } = await this.supabaseService.client.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60 * 24 * 7);

        return [path, error || !data?.signedUrl ? '' : data.signedUrl] as const;
      }),
    );

    return new Map(entries);
  }

  private async ensureProfileAvatarBucket(bucket: string) {
    const { data } =
      await this.supabaseService.client.storage.getBucket(bucket);

    if (data?.id) {
      return;
    }

    const { error } = await this.supabaseService.client.storage.createBucket(
      bucket,
      {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      },
    );

    if (error && !String(error.message ?? '').includes('already exists')) {
      throw new BadRequestException(
        error.message ??
          'Impossible de preparer le stockage des photos de profil.',
      );
    }
  }

  private sanitizeFilename(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  private async resolveDashboardContext(
    userId: string,
    profileRole: string,
  ): Promise<DashboardContext> {
    const [memberContext, managedContext] = await Promise.all([
      this.getInstitutionMemberContext(userId),
      this.getManagedInstitutionContext(userId),
    ]);

    const institutionId =
      memberContext?.institutionId ?? managedContext?.institutionId ?? null;
    const institutionName =
      memberContext?.institutionName ?? managedContext?.institutionName ?? null;
    const institutionRole = memberContext?.role ?? managedContext?.role ?? null;
    const managed = Boolean(managedContext);

    if (
      profileRole === 'institution' ||
      institutionRole === 'owner' ||
      institutionRole === 'admin' ||
      (await this.userOwnsInstitution(userId)) ||
      (await this.userManagesInstitution(userId))
    ) {
      return {
        dashboardRole: 'institution',
        workspace: {
          kind: 'institution-admin',
          institutionId,
          institutionName,
          institutionRole: institutionRole ?? 'admin',
          managed,
        },
      };
    }

    if (profileRole === 'teacher' || institutionRole === 'teacher') {
      return {
        dashboardRole: 'teacher',
        workspace: {
          kind:
            institutionRole === 'teacher'
              ? 'institution-teacher'
              : 'public-teacher',
          institutionId,
          institutionName,
          institutionRole,
          managed,
        },
      };
    }

    if (institutionRole === 'student') {
      return {
        dashboardRole: 'student',
        workspace: {
          kind: 'institution-student',
          institutionId,
          institutionName,
          institutionRole,
          managed,
        },
      };
    }

    return {
      dashboardRole: 'student',
      workspace: {
        kind: 'public-student',
        institutionId: null,
        institutionName: null,
        institutionRole: null,
        managed: false,
      },
    };
  }

  private async getInstitutionMemberContext(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .select(
        `
          role,
          joined_at,
          institutions (
            id,
            name
          )
        `,
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const institution = Array.isArray(data.institutions)
      ? data.institutions[0]
      : data.institutions;

    return {
      role: String(data.role ?? ''),
      institutionId: institution?.id ? String(institution.id) : null,
      institutionName: institution?.name ? String(institution.name) : null,
    };
  }

  private async getManagedInstitutionContext(userId: string) {
    const hasManagedUserTable = await this.hasTable(
      'institution_managed_users',
    );
    if (!hasManagedUserTable) {
      return null;
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_managed_users')
      .select(
        `
          managed_role,
          created_at,
          institutions (
            id,
            name
          )
        `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const institution = Array.isArray(data.institutions)
      ? data.institutions[0]
      : data.institutions;

    return {
      role: String(data.managed_role ?? ''),
      institutionId: institution?.id ? String(institution.id) : null,
      institutionName: institution?.name ? String(institution.name) : null,
    };
  }

  private async userOwnsInstitution(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('institutions')
      .select('id')
      .eq('owner_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data?.id);
  }

  private async userManagesInstitution(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .select('id')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();

    if (error) {
      return false;
    }

    return Boolean(data?.id);
  }

  private async hasTable(tableName: string) {
    const { error } = await this.supabaseService.client
      .from(tableName)
      .select('id')
      .limit(1);

    if (!error) {
      return true;
    }

    return !this.isMissingTableError(error);
  }

  private async getTeacherRevenue(teacherId: string) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabaseService.client
      .from('payments')
      .select('teacher_earning_fcfa, created_at, status')
      .eq('teacher_id', teacherId)
      .eq('status', 'paid');

    if (error || !data) {
      return {
        totalRevenue: 0,
        monthRevenue: 0,
      };
    }

    const totalRevenue = data.reduce(
      (sum: number, payment: any) =>
        sum + Number(payment.teacher_earning_fcfa ?? 0),
      0,
    );

    const monthRevenue = data
      .filter((payment: any) => new Date(payment.created_at) >= monthStart)
      .reduce(
        (sum: number, payment: any) =>
          sum + Number(payment.teacher_earning_fcfa ?? 0),
        0,
      );

    return {
      totalRevenue,
      monthRevenue,
    };
  }

  private async getTeacherRooms(teacherId: string) {
    const { data, error } = await this.supabaseService.client
      .from('room_members')
      .select(
        `
          id,
          role,
          joined_at,
          rooms (
            id,
            name,
            slug,
            description,
            institution_id,
            institutions (
              id,
              name
            )
          )
        `,
      )
      .eq('user_id', teacherId)
      .in('role', ['teacher', 'assistant'])
      .order('joined_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data ?? []).map((row: any) => {
      const room = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
      const institution = Array.isArray(room?.institutions)
        ? room.institutions[0]
        : room?.institutions;

      return {
        id: room?.id ?? row.id,
        name: room?.name ?? 'Classe',
        slug: room?.slug ?? '',
        description: room?.description ?? '',
        role: row.role,
        joinedAt: row.joined_at,
        institutionName: institution?.name ?? 'Etablissement',
      };
    });
  }

  private async getInstitutionDashboard(
    userId: string,
    profile: ProfileSummary,
  ) {
    const { data: institutionRows } = await this.supabaseService.client
      .from('institution_members')
      .select(
        `
          role,
          joined_at,
          institutions (
            id,
            name,
            slug,
            plan_name,
            subscription_status
          )
        `,
      )
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .order('joined_at', { ascending: false });

    const institutions = (institutionRows ?? []).map((row: any) => {
      const institution = Array.isArray(row.institutions)
        ? row.institutions[0]
        : row.institutions;

      return {
        id: institution?.id ?? '',
        name: institution?.name ?? 'Etablissement',
        slug: institution?.slug ?? '',
        planName: institution?.plan_name ?? '',
        subscriptionStatus: institution?.subscription_status ?? '',
        membershipRole: row.role ?? 'admin',
        joinedAt: row.joined_at,
      };
    });

    if (institutions.length === 0) {
      const { data: ownedInstitutions } = await this.supabaseService.client
        .from('institutions')
        .select('id, name, slug, plan_name, subscription_status, created_at')
        .eq('owner_user_id', userId)
        .order('created_at', { ascending: false });

      for (const institution of ownedInstitutions ?? []) {
        institutions.push({
          id: institution.id,
          name: institution.name ?? 'Etablissement',
          slug: institution.slug ?? '',
          planName: institution.plan_name ?? '',
          subscriptionStatus: institution.subscription_status ?? '',
          membershipRole: 'owner',
          joinedAt: institution.created_at,
        });
      }
    }

    const institutionIds = institutions
      .map((institution) => institution.id)
      .filter(Boolean);
    const [roomsRes, institutionMembersRes] = institutionIds.length
      ? await Promise.all([
          this.supabaseService.client
            .from('rooms')
            .select('id, institution_id')
            .in('institution_id', institutionIds),
          this.supabaseService.client
            .from('institution_members')
            .select('id, institution_id, role')
            .in('institution_id', institutionIds),
        ])
      : [
          { data: [] as Array<Record<string, unknown>>, error: null },
          { data: [] as Array<Record<string, unknown>>, error: null },
        ];

    const roomIds = (roomsRes.data ?? [])
      .map((room: any) => room.id)
      .filter(Boolean);
    const [roomCoursesRes, submissionsRes] = roomIds.length
      ? await Promise.all([
          this.supabaseService.client
            .from('room_courses')
            .select('id, room_id')
            .in('room_id', roomIds),
          this.supabaseService.client
            .from('assignment_submissions')
            .select('id, status, assignments ( room_id )')
            .in('assignment_id', await this.getAssignmentIdsForRooms(roomIds)),
        ])
      : [
          { data: [] as Array<Record<string, unknown>>, error: null },
          { data: [] as Array<Record<string, unknown>>, error: null },
        ];

    const studentCount = (institutionMembersRes.data ?? []).filter(
      (member: any) => member.role === 'student',
    ).length;
    const assignedCourses = (roomCoursesRes.data ?? []).length;
    const pendingExercises = (submissionsRes.data ?? []).filter((row: any) =>
      ['submitted', 'returned'].includes(String(row.status ?? '')),
    ).length;
    const institutionName =
      institutions[0]?.name ||
      (profile.fullname as string | undefined) ||
      (profile.school_name as string | undefined) ||
      'Etablissement';

    return {
      role: 'institution',
      workspace: {
        kind: 'institution-admin',
        institutionId: institutions[0]?.id ?? null,
        institutionName: institutions[0]?.name ?? null,
        institutionRole: institutions[0]?.membershipRole ?? 'owner',
        managed: false,
      },
      profile,
      stats: {
        activeStudents: studentCount,
        activeRooms: (roomsRes.data ?? []).length,
        assignedCourses,
        pendingExercises,
        managedInstitutions: institutions.length,
      },
      courses: [],
      institutions,
      tasks: [
        {
          label:
            (roomsRes.data ?? []).length === 0
              ? `Configurer les premieres salles de ${institutionName}.`
              : `Verifier les classes actives de ${institutionName}.`,
        },
        {
          label:
            studentCount === 0
              ? 'Inviter des etudiants ou eleves avec des liens de groupe.'
              : 'Suivre les inscriptions et affectations dans les classes.',
        },
        {
          label:
            assignedCourses === 0
              ? 'Associer des cours aux classes pour lancer le campus.'
              : 'Programmer les prochains devoirs et corrections.',
        },
      ],
    };
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
      return [];
    }

    return (data ?? []).map((row: any) => row.id).filter(Boolean);
  }

  private isMissingCampusLifeTableError(
    error: { message?: string } | null | undefined,
  ) {
    const message = String(error?.message ?? '').toLowerCase();
    return (
      message.includes('schema cache') ||
      message.includes('could not find the table') ||
      message.includes('room_schedule_items')
    );
  }

  private isMissingTableError(
    error: { message?: string; code?: string } | null,
  ) {
    if (!error) {
      return false;
    }

    return (
      error.code === '42P01' ||
      error.message?.includes('schema cache') ||
      error.message?.includes('Could not find the table')
    );
  }
}
