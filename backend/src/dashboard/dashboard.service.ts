import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type ProfileUpdatePayload = {
  fullname?: string;
  level?: string | null;
  school_name?: string | null;
  expertise?: string | null;
  bio?: string | null;
};

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const effectiveRole = await this.resolveDashboardRole(
      userId,
      String(profile.role ?? ''),
    );

    if (effectiveRole === 'teacher') {
      return this.getTeacherDashboard(profile);
    }

    if (effectiveRole === 'institution') {
      return this.getInstitutionDashboard(userId, profile);
    }

    return this.getStudentDashboard(profile);
  }

  private async getProfile(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, email, fullname, role, country, level, school_name, expertise, bio')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profil utilisateur introuvable.');
    }

    return data;
  }

  async updateProfile(userId: string, payload: ProfileUpdatePayload) {
    const updates = {
      fullname: payload.fullname?.trim(),
      level: payload.level?.trim() || null,
      school_name: payload.school_name?.trim() || null,
      expertise: payload.expertise?.trim() || null,
      bio: payload.bio?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (!updates.fullname) {
      const currentProfile = await this.getProfile(userId);
      updates.fullname = String(currentProfile.fullname ?? '').trim();
    }

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, email, fullname, role, country, level, school_name, expertise, bio')
      .single();

    if (error || !data) {
      throw new NotFoundException(
        error?.message ?? 'Impossible de mettre a jour le profil.',
      );
    }

    return data;
  }

  private async getStudentDashboard(profile: Record<string, unknown>) {
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
      .eq('user_id', profile.id);

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

    const { data: catalogRows } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          short_description,
          price_fcfa,
          thumbnail_url,
          teacher_id,
          profiles:teacher_id (
            fullname
          ),
          lessons ( id )
        `,
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    const { data: institutionMembershipRows } = await this.supabaseService.client
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

    const catalogCourseIds = (catalogRows ?? []).map((course: any) => course.id);
    const catalogReviewResult = catalogCourseIds.length
      ? await this.supabaseService.client
          .from('course_reviews')
          .select('course_id, rating')
          .in('course_id', catalogCourseIds)
      : { data: [] as Array<Record<string, unknown>>, error: null };
    const catalogReviewRows = this.isMissingTableError(catalogReviewResult.error)
      ? []
      : (catalogReviewResult.data ?? []);

    const enrollmentsList = (enrollments ?? []).map((item: any) => {
      const progressByLesson = new Map<string, string>();
      for (const row of progressRows ?? []) {
        const lessonData = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
        if (lessonData?.course_id === item.courses?.id && !progressByLesson.has(lessonData.id)) {
          progressByLesson.set(lessonData.id, row.status ?? 'started');
        }
      }

      const orderedLessons = ((item.courses?.course_modules ?? []) as Array<any>)
        .slice()
        .sort((a: any, b: any) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0))
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
        (orderedLessons[0]?.title ?? 'Aucune lecon disponible');

      return {
        id: item.courses?.id ?? item.id,
        enrollmentId: item.id,
        title: item.courses?.title ?? 'Cours sans titre',
        description: item.courses?.description ?? '',
        progress,
        nextLesson,
        enrolledAt: item.enrolled_at,
      };
    });

    const uniqueLessonProgress = new Map<string, string>();
    for (const row of progressRows ?? []) {
      const lessonData = Array.isArray(row.lessons) ? row.lessons[0] : row.lessons;
      if (lessonData?.id && !uniqueLessonProgress.has(lessonData.id)) {
        uniqueLessonProgress.set(lessonData.id, row.status ?? 'started');
      }
    }

    const completedLessons = Array.from(uniqueLessonProgress.values()).filter(
      (status) => status === 'completed',
    ).length;
    const totalLessons = (enrollments ?? []).reduce((sum: number, item: any) => {
      const lessonsCount = ((item.courses?.course_modules ?? []) as Array<any>).reduce(
        (moduleSum: number, module: any) =>
          moduleSum + ((module.lessons ?? []) as Array<any>).length,
        0,
      );

      return sum + lessonsCount;
    }, 0);
    const catalogCourses = (catalogRows ?? []).map((course: any) => ({
      id: course.id,
      title: course.title ?? 'Cours sans titre',
      description:
        course.short_description ??
        course.description ??
        'Cours disponible sur Kalatty.',
      fullDescription: course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailUrl: course.thumbnail_url ?? '',
      teacherName: course.profiles?.fullname ?? 'Formateur Kalatty',
      badge: 'Disponible',
      category: 'Catalogue',
      lessonsCount: course.lessons?.length ?? 0,
      ratingAverage: this.getAverageRating(
        (catalogReviewRows ?? [])
          .filter((review: any) => review.course_id === course.id)
          .map((review: any) => ({
            rating: Number(review.rating ?? 0),
          })),
      ),
    }));

    const studentInstitutions = (institutionMembershipRows ?? []).map((row: any) => {
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
    });

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

    const studentInstitutionTasks = studentRooms
      .slice(0, 3)
      .map((room: any) =>
        room.latestAssignmentTitle
          ? `Verifier ${room.latestAssignmentTitle} dans ${room.name}.`
          : `Consulter les annonces de ${room.name}.`,
      );

    return {
      role: 'student',
      profile,
      stats: {
        enrolledCourses: enrollmentsList.length,
        completedLessons,
        progressAverage:
          enrollmentsList.length > 0
            ? Math.round(
                enrollmentsList.reduce(
                  (sum: number, item: { progress: number }) => sum + item.progress,
                  0,
                ) / enrollmentsList.length,
              )
            : 0,
        totalLessons,
        availableCatalogCourses: catalogCourses.length,
        linkedInstitutions: studentInstitutions.length,
        activeRooms: studentRooms.length,
      },
      courses: enrollmentsList,
      catalogCourses,
      studentInstitutions,
      studentRooms,
      tasks:
        enrollmentsList.slice(0, 3).map((course: any) =>
          course.progress >= 100
            ? `Revoir les points cles du cours ${course.title}.`
            : `Continuer ${course.title} et travailler ${course.nextLesson}.`,
        ).concat(studentInstitutionTasks).slice(0, 5),
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

  private async getTeacherDashboard(profile: Record<string, unknown>) {
    const { data: courses } = await this.supabaseService.client
      .from('courses')
      .select(
        `
          id,
          title,
          description,
          price_fcfa,
          thumbnail_url,
          created_at,
          enrollments ( id ),
          lessons ( id, video_path )
        `,
      )
      .eq('teacher_id', profile.id);

    const coursesList = (courses ?? []).map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      videoUrl:
        course.lessons?.find((lesson: any) => lesson.video_path)?.video_path ?? '',
      thumbnailUrl: course.thumbnail_url ?? '',
      createdAt: course.created_at,
      learners: course.enrollments?.length ?? 0,
      lessonsCount: course.lessons?.length ?? 0,
    }));

    const revenueStats = await this.getTeacherRevenue(profile.id as string);
    const teacherRooms = await this.getTeacherRooms(profile.id as string);
    const totalLearners = coursesList.reduce(
      (sum: number, course: { learners: number }) => sum + course.learners,
      0,
    );

    return {
      role: 'teacher',
      profile,
      stats: {
        publishedCourses: coursesList.length,
        totalLearners,
        averageLearners:
          coursesList.length > 0 ? Math.round(totalLearners / coursesList.length) : 0,
        totalRevenue: revenueStats.totalRevenue,
        monthRevenue: revenueStats.monthRevenue,
        activeClasses: teacherRooms.length,
      },
      courses: coursesList,
      teacherRooms,
      tasks: [
        'Publier une nouvelle lecon video.',
        'Ajouter un exercice corrige pour le prochain module.',
        'Suivre les inscriptions des derniers apprenants.',
      ],
    };
  }

  private async resolveDashboardRole(userId: string, profileRole: string) {
    if (profileRole === 'teacher' || profileRole === 'institution') {
      return profileRole;
    }

    const ownsInstitution = await this.userOwnsInstitution(userId);
    if (ownsInstitution) {
      return 'institution';
    }

    const managesInstitution = await this.userManagesInstitution(userId);
    if (managesInstitution) {
      return 'institution';
    }

    return 'student';
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
    profile: Record<string, unknown>,
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

    const institutionIds = institutions.map((institution) => institution.id).filter(Boolean);
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

    const roomIds = (roomsRes.data ?? []).map((room: any) => room.id).filter(Boolean);
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
        (roomsRes.data ?? []).length === 0
          ? `Configurer les premieres salles de ${institutionName}.`
          : `Verifier les classes actives de ${institutionName}.`,
        studentCount === 0
          ? "Inviter des etudiants ou eleves avec des liens de groupe."
          : 'Suivre les inscriptions et affectations dans les classes.',
        assignedCourses === 0
          ? 'Associer des cours aux classes pour lancer le campus.'
          : 'Programmer les prochains devoirs et corrections.',
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

  private isMissingTableError(error: { message?: string; code?: string } | null) {
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
