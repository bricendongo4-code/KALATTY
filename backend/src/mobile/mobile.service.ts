import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

@Injectable()
export class MobileService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly notificationsService: NotificationsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async getBootstrap(user: AuthUser) {
    const [profile, notifications] = await Promise.all([
      this.loadProfile(user.id),
      this.notificationsService.listForUser(user),
    ]);

    return {
      app: {
        name: 'Kalatty',
        apiVersion: '2026-06-29',
        minimumMobileVersion: '0.1.0',
      },
      profile,
      notifications: {
        unreadCount: notifications.unreadCount,
        latest: notifications.notifications.slice(0, 5),
      },
      navigation: this.buildNavigation(profile?.role ?? user.role ?? 'student'),
    };
  }

  async getHome(user: AuthUser) {
    const [dashboard, notifications, featuredCourses] = await Promise.all([
      this.dashboardService.getDashboard(user.id),
      this.notificationsService.listForUser(user),
      this.loadFeaturedCourses(),
    ]);

    return {
      dashboard,
      featuredCourses,
      notifications: {
        unreadCount: notifications.unreadCount,
        latest: notifications.notifications.slice(0, 8),
      },
    };
  }

  private async loadProfile(userId: string) {
    const { data } = await this.supabaseService.client
      .from('profiles')
      .select(
        'id, email, fullname, role, country, level, school_name, expertise, bio',
      )
      .eq('id', userId)
      .maybeSingle();

    return data ?? null;
  }

  private async loadFeaturedCourses() {
    const { data } = await this.supabaseService.client
      .from('courses')
      .select(
        'id, title, short_description, description, price_fcfa, thumbnail_url, created_at',
      )
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(8);

    return (data ?? []).map((course: any) => ({
      id: course.id,
      title: course.title,
      description: course.short_description ?? course.description ?? '',
      priceFcfa: Number(course.price_fcfa ?? 0),
      thumbnailUrl: course.thumbnail_url ?? '',
    }));
  }

  private buildNavigation(role: string) {
    if (role === 'institution' || role === 'admin') {
      return [
        'overview',
        'accounts',
        'classes',
        'courses',
        'billing',
        'settings',
      ];
    }

    if (role === 'teacher') {
      return ['overview', 'courses', 'classes', 'studio', 'profile'];
    }

    return ['home', 'progress', 'institutions', 'profile'];
  }
}
