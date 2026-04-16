import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);

    if (profile.role === 'teacher') {
      return this.getTeacherDashboard(profile);
    }

    if (profile.role === 'institution') {
      return this.getInstitutionDashboard(profile);
    }

    return this.getStudentDashboard(profile);
  }

  private async getProfile(userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('id, email, fullname, role, country, level, school_name, expertise')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Profil utilisateur introuvable.');
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
            description
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
          )
        `,
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    const enrollmentsList = (enrollments ?? []).map((item: any) => {
      const courseProgress = (progressRows ?? []).filter(
        (row: any) => row.lessons?.course_id === item.courses?.id,
      );
      const completedCount = courseProgress.filter(
        (row: any) => row.status === 'completed',
      ).length;
      const totalCount = courseProgress.length;
      const progress =
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const nextLessonRow = courseProgress.find(
        (row: any) => row.status !== 'completed',
      );
      const nextLessonData = Array.isArray(nextLessonRow?.lessons)
        ? nextLessonRow.lessons[0]
        : nextLessonRow?.lessons;
      const nextLesson =
        nextLessonData?.title ??
        'Aucune lecon commencee';

      return {
        id: item.id,
        title: item.courses?.title ?? 'Cours sans titre',
        description: item.courses?.description ?? '',
        progress,
        nextLesson,
        enrolledAt: item.enrolled_at,
      };
    });

    const completedLessons = (progressRows ?? []).filter(
      (row: any) => row.status === 'completed',
    ).length;
    const totalLessons = (progressRows ?? []).length;
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
    }));

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
      },
      courses: enrollmentsList,
      catalogCourses,
      tasks: enrollmentsList.slice(0, 3).map((course: any) =>
        course.progress >= 100
          ? `Revoir les points cles du cours ${course.title}.`
          : `Continuer ${course.title} et travailler ${course.nextLesson}.`,
      ),
    };
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
          video_url,
          thumbnail_url,
          created_at,
          enrollments ( id ),
          lessons ( id )
        `,
      )
      .eq('teacher_id', profile.id);

    const coursesList = (courses ?? []).map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      videoUrl: course.video_url ?? '',
      thumbnailUrl: course.thumbnail_url ?? '',
      createdAt: course.created_at,
      learners: course.enrollments?.length ?? 0,
      lessonsCount: course.lessons?.length ?? 0,
    }));

    const revenueStats = await this.getTeacherRevenue(profile.id as string);
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
      },
      courses: coursesList,
      tasks: [
        'Publier une nouvelle lecon video.',
        'Ajouter un exercice corrige pour le prochain module.',
        'Suivre les inscriptions des derniers apprenants.',
      ],
    };
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

  private getInstitutionDashboard(profile: Record<string, unknown>) {
    const institutionName =
      (profile.fullname as string | undefined) ||
      (profile.school_name as string | undefined) ||
      'Etablissement';

    return {
      role: 'institution',
      profile,
      stats: {
        activeStudents: 0,
        activeRooms: 0,
        assignedCourses: 0,
        pendingExercises: 0,
      },
      courses: [],
      tasks: [
        `Configurer les premieres salles de ${institutionName}.`,
        "Inviter des etudiants ou eleves avec des codes de groupe.",
        'Associer des cours et programmer les premiers exercices.',
      ],
    };
  }
}
