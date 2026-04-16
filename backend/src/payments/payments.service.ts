import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createCourseCheckout(user: AuthUser, courseId?: string) {
    if (!courseId) {
      throw new BadRequestException('Le cours a payer est introuvable.');
    }

    const role = await this.resolveRole(user);
    if (role !== 'student' && role !== 'admin') {
      throw new ForbiddenException(
        'Seuls les etudiants peuvent payer un cours.',
      );
    }

    const { data: course, error: courseError } = await this.supabaseService.client
      .from('courses')
      .select('id, title, teacher_id, price_fcfa, status')
      .eq('id', courseId)
      .eq('status', 'published')
      .maybeSingle();

    if (courseError || !course) {
      throw new BadRequestException(
        courseError?.message ?? "Le cours n'est pas disponible au paiement.",
      );
    }

    const priceFcfa = Number(course.price_fcfa ?? 0);
    if (priceFcfa <= 0) {
      throw new BadRequestException(
        'Ce cours est gratuit. Utilise directement le bouton inscription.',
      );
    }

    const { data: enrollment } = await this.supabaseService.client
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (enrollment?.id) {
      return {
        alreadyEnrolled: true,
        message: 'Tu es deja inscrit a ce cours.',
      };
    }

    const platformFeeFcfa = Math.round(priceFcfa * 0.15);
    const teacherEarningFcfa = Math.max(priceFcfa - platformFeeFcfa, 0);

    const { data: payment, error } = await this.supabaseService.client
      .from('payments')
      .insert({
        user_id: user.id,
        course_id: course.id,
        teacher_id: course.teacher_id,
        amount_fcfa: priceFcfa,
        platform_fee_fcfa: platformFeeFcfa,
        teacher_earning_fcfa: teacherEarningFcfa,
        status: 'pending',
      })
      .select('id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status, created_at')
      .single();

    if (error || !payment) {
      throw new BadRequestException(
        error?.message ?? 'Impossible de preparer le paiement du cours.',
      );
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amountFcfa: Number(payment.amount_fcfa ?? 0),
      platformFeeFcfa: Number(payment.platform_fee_fcfa ?? 0),
      teacherEarningFcfa: Number(payment.teacher_earning_fcfa ?? 0),
      createdAt: payment.created_at,
      provider: 'demo',
      providerLabel: 'Paiement de demonstration',
      instructions:
        "Flux de paiement pret pour integration. Pour l'instant, la confirmation se fait en mode demo.",
      course: {
        id: course.id,
        title: course.title ?? 'Cours Kalatty',
      },
    };
  }

  async confirmCoursePayment(user: AuthUser, paymentId: string) {
    const role = await this.resolveRole(user);
    if (role !== 'student' && role !== 'admin') {
      throw new ForbiddenException(
        'Seuls les etudiants peuvent confirmer un paiement.',
      );
    }

    const { data: payment, error: paymentError } = await this.supabaseService.client
      .from('payments')
      .select('id, user_id, course_id, teacher_id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status')
      .eq('id', paymentId)
      .maybeSingle();

    if (paymentError || !payment) {
      throw new BadRequestException(
        paymentError?.message ?? 'Paiement introuvable.',
      );
    }

    if (payment.user_id !== user.id && role !== 'admin') {
      throw new ForbiddenException("Ce paiement n'appartient pas a cet utilisateur.");
    }

    if (payment.status !== 'paid') {
      const { error: updateError } = await this.supabaseService.client
        .from('payments')
        .update({
          status: 'paid',
        })
        .eq('id', payment.id);

      if (updateError) {
        throw new BadRequestException(
          updateError.message ?? 'Impossible de confirmer le paiement.',
        );
      }
    }

    const { data: enrollment } = await this.supabaseService.client
      .from('enrollments')
      .select('id')
      .eq('user_id', payment.user_id)
      .eq('course_id', payment.course_id)
      .maybeSingle();

    if (!enrollment?.id) {
      const { error: enrollError } = await this.supabaseService.client
        .from('enrollments')
        .insert({
          user_id: payment.user_id,
          course_id: payment.course_id,
        });

      if (enrollError) {
        throw new BadRequestException(
          enrollError.message ?? "Impossible d'activer l'inscription apres paiement.",
        );
      }
    }

    return {
      paymentId: payment.id,
      status: 'paid',
      courseId: payment.course_id,
      amountFcfa: Number(payment.amount_fcfa ?? 0),
      message: 'Paiement confirme et acces au cours active.',
    };
  }

  private async resolveRole(user: AuthUser) {
    if (user.role === 'teacher' || user.role === 'admin' || user.role === 'student') {
      return user.role;
    }

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de verifier le role de l'utilisateur.",
      );
    }

    return data?.role ?? user.role ?? null;
  }
}
