import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

type NotificationItem = {
  id: string;
  type:
    | 'assignment'
    | 'course'
    | 'institution'
    | 'payment'
    | 'review'
    | 'system';
  title: string;
  message: string;
  href?: string;
  createdAt: string;
  read: boolean;
  rating?: number;
  authorName?: string;
  courseTitle?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listForUser(user: AuthUser) {
    const [storedNotifications, generatedNotifications] = await Promise.all([
      this.loadStoredNotifications(user.id),
      this.buildGeneratedNotifications(user),
    ]);

    const notifications = [...storedNotifications, ...generatedNotifications]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 25);

    return {
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read)
        .length,
    };
  }

  async markRead(user: AuthUser, notificationId: string) {
    const { error } = await this.supabaseService.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      return {
        notificationId,
        status: 'acknowledged',
        message: 'Notification prise en compte localement.',
      };
    }

    return {
      notificationId,
      status: 'read',
      message: 'Notification marquee comme lue.',
    };
  }

  private async loadStoredNotifications(
    userId: string,
  ): Promise<NotificationItem[]> {
    const { data, error } = await this.supabaseService.client
      .from('notifications')
      .select('id, type, title, message, href, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      id: String(row.id),
      type: this.normalizeType(row.type),
      title: String(row.title ?? 'Notification Kalatty'),
      message: String(row.message ?? ''),
      href: row.href ? String(row.href) : undefined,
      createdAt: String(row.created_at ?? new Date().toISOString()),
      read: Boolean(row.read_at),
    }));
  }

  private async buildGeneratedNotifications(
    user: AuthUser,
  ): Promise<NotificationItem[]> {
    const role = await this.resolveRole(user);

    if (role === 'teacher') {
      return this.buildTeacherNotifications(user.id);
    }

    if (role === 'institution' || role === 'admin') {
      return this.buildInstitutionNotifications(user.id);
    }

    return this.buildStudentNotifications(user.id);
  }

  private async buildStudentNotifications(
    userId: string,
  ): Promise<NotificationItem[]> {
    const notifications: NotificationItem[] = [];
    const { data: memberships } = await this.supabaseService.client
      .from('room_members')
      .select('room_id')
      .eq('user_id', userId)
      .eq('role', 'student');

    const roomIds = (memberships ?? [])
      .map((membership: any) => String(membership.room_id ?? ''))
      .filter(Boolean);

    if (roomIds.length > 0) {
      const { data: assignments } = await this.supabaseService.client
        .from('assignments')
        .select('id, title, due_at, created_at, room_id')
        .in('room_id', roomIds)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(5);

      for (const assignment of assignments ?? []) {
        notifications.push({
          id: `assignment-${assignment.id}`,
          type: 'assignment',
          title: 'Nouveau devoir',
          message: `${assignment.title ?? 'Un devoir'} a ete publie dans une classe.`,
          href: '/dashboard',
          createdAt: String(assignment.created_at ?? new Date().toISOString()),
          read: false,
        });
      }
    }

    const { data: courses } = await this.supabaseService.client
      .from('courses')
      .select('id, title, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(3);

    for (const course of courses ?? []) {
      notifications.push({
        id: `course-${course.id}`,
        type: 'course',
        title: 'Cours disponible',
        message: `${course.title ?? 'Un nouveau cours'} est visible dans la vitrine.`,
        href: `/courses/${course.id}`,
        createdAt: String(course.created_at ?? new Date().toISOString()),
        read: false,
      });
    }

    return notifications;
  }

  private async buildTeacherNotifications(
    userId: string,
  ): Promise<NotificationItem[]> {
    const { data: courses } = await this.supabaseService.client
      .from('courses')
      .select('id, title, status, created_at')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const courseNotifications = (courses ?? [])
      .slice(0, 5)
      .map((course: any) => ({
        id: `teacher-course-${course.id}`,
        type: 'course',
        title:
          course.status === 'published' ? 'Cours publie' : 'Cours en brouillon',
        message: `${course.title ?? 'Ton cours'} est actuellement ${course.status ?? 'en cours'}.`,
        href: '/dashboard',
        createdAt: String(course.created_at ?? new Date().toISOString()),
        read: false,
      }));

    const courseIds = (courses ?? [])
      .map((course: any) => String(course.id ?? ''))
      .filter(Boolean);
    const courseTitleById = new Map<string, string>(
      (courses ?? []).map((course: any) => [
        String(course.id),
        String(course.title ?? 'Cours Kalatty'),
      ]),
    );

    if (courseIds.length === 0) {
      return courseNotifications;
    }

    const [courseReviews, teacherReviews] = await Promise.all([
      this.loadCourseReviewsForTeacher(courseIds),
      this.loadTeacherReviews(userId),
    ]);

    const reviewNotifications = [...courseReviews, ...teacherReviews]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 12)
      .map((review) => ({
        id: review.id,
        type: 'review' as const,
        title:
          review.kind === 'teacher'
            ? 'Nouvel avis professeur'
            : 'Nouvel avis cours',
        message:
          review.comment ||
          `${review.authorName} a laisse une note de ${review.rating}/5.`,
        href: `/courses/${review.courseId}`,
        createdAt: review.createdAt,
        read: false,
        rating: review.rating,
        authorName: review.authorName,
        courseTitle: courseTitleById.get(review.courseId) ?? 'Cours Kalatty',
      }));

    return [...reviewNotifications, ...courseNotifications];
  }

  private async loadCourseReviewsForTeacher(courseIds: string[]) {
    const { data, error } = await this.supabaseService.client
      .from('course_reviews')
      .select(
        `
          id,
          course_id,
          rating,
          comment,
          created_at,
          updated_at,
          profiles:student_id (
            fullname
          )
        `,
      )
      .in('course_id', courseIds)
      .order('updated_at', { ascending: false })
      .limit(12);

    if (error) {
      return [];
    }

    return (data ?? []).map((review: any) => ({
      id: `course-review-${review.id}`,
      kind: 'course' as const,
      courseId: String(review.course_id ?? ''),
      rating: Number(review.rating ?? 0),
      comment: String(review.comment ?? ''),
      createdAt: String(
        review.updated_at ?? review.created_at ?? new Date().toISOString(),
      ),
      authorName: String(review.profiles?.fullname ?? 'Etudiant Kalatty'),
    }));
  }

  private async loadTeacherReviews(teacherId: string) {
    const { data, error } = await this.supabaseService.client
      .from('teacher_reviews')
      .select(
        `
          id,
          course_id,
          rating,
          comment,
          created_at,
          updated_at,
          profiles:student_id (
            fullname
          )
        `,
      )
      .eq('teacher_id', teacherId)
      .order('updated_at', { ascending: false })
      .limit(12);

    if (error) {
      return [];
    }

    return (data ?? []).map((review: any) => ({
      id: `teacher-review-${review.id}`,
      kind: 'teacher' as const,
      courseId: String(review.course_id ?? ''),
      rating: Number(review.rating ?? 0),
      comment: String(review.comment ?? ''),
      createdAt: String(
        review.updated_at ?? review.created_at ?? new Date().toISOString(),
      ),
      authorName: String(review.profiles?.fullname ?? 'Etudiant Kalatty'),
    }));
  }

  private async buildInstitutionNotifications(
    userId: string,
  ): Promise<NotificationItem[]> {
    const { data: institutions } = await this.supabaseService.client
      .from('institutions')
      .select('id, name, subscription_status, updated_at, created_at')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    return (institutions ?? []).map((institution: any) => ({
      id: `institution-${institution.id}`,
      type: 'institution',
      title: 'Etat abonnement',
      message: `${institution.name ?? 'Votre etablissement'} est en statut ${institution.subscription_status ?? 'trial'}.`,
      href: '/dashboard',
      createdAt: String(
        institution.updated_at ??
          institution.created_at ??
          new Date().toISOString(),
      ),
      read: false,
    }));
  }

  private async resolveRole(user: AuthUser) {
    if (user.role) {
      return user.role;
    }

    const { data } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return data?.role ?? 'student';
  }

  private normalizeType(value: unknown): NotificationItem['type'] {
    if (
      value === 'assignment' ||
      value === 'course' ||
      value === 'institution' ||
      value === 'payment' ||
      value === 'review'
    ) {
      return value;
    }

    return 'system';
  }
}
