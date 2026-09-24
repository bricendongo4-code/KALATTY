import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = {
  id: string;
  role?: string;
};

type InstitutionPlanName = 'starter' | 'growth' | 'campus';

@Injectable()
export class PaymentsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private readonly institutionPlans: Record<
    InstitutionPlanName,
    {
      amountFcfa: number;
      maxStudents: number;
      maxRooms: number;
      label: string;
    }
  > = {
    starter: {
      amountFcfa: 25000,
      maxStudents: 100,
      maxRooms: 10,
      label: 'Starter',
    },
    growth: {
      amountFcfa: 65000,
      maxStudents: 500,
      maxRooms: 30,
      label: 'Growth',
    },
    campus: {
      amountFcfa: 120000,
      maxStudents: 2000,
      maxRooms: 120,
      label: 'Campus',
    },
  };

  getPlans() {
    const provider =
      process.env.PAYMENT_PROVIDER?.trim() || 'pending_configuration';
    const paymentsEnabled = this.isCinetPayConfigured();
    return {
      coursePayments: {
        provider,
        enabled: paymentsEnabled,
        platformFeePercent: 15,
        description:
          paymentsEnabled
            ? 'Les cours gratuits sont accessibles apres inscription. Les cours payants activent un paiement par cours.'
            : "Les inscriptions gratuites restent disponibles. Les paiements sont desactives jusqu'a la connexion d'un prestataire securise.",
      },
      institutionPlans: Object.entries(this.institutionPlans).map(
        ([code, plan]) => ({
          code,
          label: plan.label,
          amountFcfa: plan.amountFcfa,
          maxStudents: plan.maxStudents,
          maxRooms: plan.maxRooms,
        }),
      ),
      nextProviderIntegration: {
        status: 'ready_for_provider',
        recommendedProviders: ['CinetPay Mobile Money'],
      },
    };
  }

  async getMyPayments(user: AuthUser) {
    const { data, error } = await this.supabaseService.client
      .from('payments')
      .select(
        'id, course_id, amount_fcfa, status, created_at, courses ( id, title )',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de charger l'historique des paiements.",
      );
    }

    return {
      transactions: (data ?? []).map((payment: any) => {
        const course = Array.isArray(payment.courses)
          ? payment.courses[0]
          : payment.courses;
        return {
          id: String(payment.id),
          courseId: String(payment.course_id),
          courseTitle: String(course?.title ?? 'Formation Kalatty'),
          amountFcfa: Number(payment.amount_fcfa ?? 0),
          status: String(payment.status ?? 'pending'),
          createdAt: payment.created_at,
          receiptAvailable: payment.status === 'paid',
        };
      }),
    };
  }

  async getTeacherRevenueSummary(user: AuthUser) {
    const role = await this.resolveRole(user);
    if (role !== 'teacher' && role !== 'admin') {
      throw new ForbiddenException(
        'Cet espace de revenus est reserve aux formateurs.',
      );
    }

    let query = this.supabaseService.client
      .from('payments')
      .select(
        'id, user_id, course_id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status, created_at, courses ( id, title )',
      )
      .order('created_at', { ascending: false });

    if (role !== 'admin') {
      query = query.eq('teacher_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de charger les revenus du formateur.',
      );
    }

    const transactions = (data ?? []).map((payment: any) => {
      const course = Array.isArray(payment.courses)
        ? payment.courses[0]
        : payment.courses;
      return {
        id: String(payment.id),
        courseId: String(payment.course_id),
        courseTitle: String(course?.title ?? 'Formation Kalatty'),
        amountGrossFcfa: Number(payment.amount_fcfa ?? 0),
        platformFeeFcfa: Number(payment.platform_fee_fcfa ?? 0),
        trainerNetFcfa: Number(payment.teacher_earning_fcfa ?? 0),
        status: String(payment.status ?? 'pending'),
        createdAt: payment.created_at,
      };
    });

    const paid = transactions.filter((item) => item.status === 'paid');
    const pending = transactions.filter((item) =>
      ['pending', 'processing'].includes(item.status),
    );
    const sum = (
      items: typeof transactions,
      key: 'amountGrossFcfa' | 'platformFeeFcfa' | 'trainerNetFcfa',
    ) => items.reduce((total, item) => total + item[key], 0);

    return {
      currency: 'XAF',
      grossPaidFcfa: sum(paid, 'amountGrossFcfa'),
      feesPaidFcfa: sum(paid, 'platformFeeFcfa'),
      netPaidFcfa: sum(paid, 'trainerNetFcfa'),
      pendingNetFcfa: sum(pending, 'trainerNetFcfa'),
      refundsFcfa: 0,
      paidSalesCount: paid.length,
      transactions,
    };
  }

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

    const { data: course, error: courseError } =
      await this.supabaseService.client
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

    if (!course.teacher_id) {
      throw new BadRequestException(
        "Ce cours n'a pas encore de professeur assigne et ne peut pas etre paye.",
      );
    }

    if (await this.hasInstitutionCourseAccess(user.id, courseId)) {
      return {
        alreadyEnrolled: true,
        institutionAccess: true,
        accessSource: 'institution',
        message:
          "Ce cours est inclus par ton etablissement. Aucun paiement n'est necessaire.",
      };
    }

    const priceFcfa = Number(course.price_fcfa ?? 0);
    if (priceFcfa <= 0) {
      throw new BadRequestException(
        'Ce cours est gratuit. Utilise directement le bouton inscription.',
      );
    }

    const provider = process.env.PAYMENT_PROVIDER?.trim()?.toLowerCase();
    if (!this.isCinetPayConfigured()) {
      throw new BadRequestException(
        "Le paiement CinetPay n'est pas encore configuré. Aucun débit ni demande de paiement n'a été créé.",
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

    const { data: existingPayment, error: existingPaymentError } =
      await this.supabaseService.client
        .from('payments')
        .select(
          'id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status, created_at',
        )
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingPaymentError) {
      throw new BadRequestException(
        existingPaymentError.message ??
          'Impossible de vérifier la transaction en attente.',
      );
    }

    let payment = existingPayment;
    if (!payment) {
      const { data: createdPayment, error } = await this.supabaseService.client
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
        .select(
          'id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status, created_at',
        )
        .single();

      if (error || !createdPayment) {
        throw new BadRequestException(
          error?.message ?? 'Impossible de préparer le paiement du cours.',
        );
      }
      payment = createdPayment;
    }

    let checkout: { paymentUrl: string };
    try {
      checkout = await this.initializeCinetPayCheckout({
        paymentId: String(payment.id),
        amountFcfa: Number(payment.amount_fcfa ?? 0),
        courseId: String(course.id),
        courseTitle: String(course.title ?? 'Cours Kalatty'),
        userId: user.id,
      });
    } catch (error) {
      await this.supabaseService.client
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)
        .neq('status', 'paid');
      throw error;
    }

    return {
      paymentId: payment.id,
      status: payment.status,
      amountFcfa: Number(payment.amount_fcfa ?? 0),
      platformFeeFcfa: Number(payment.platform_fee_fcfa ?? 0),
      teacherEarningFcfa: Number(payment.teacher_earning_fcfa ?? 0),
      createdAt: payment.created_at,
      provider,
      providerLabel: 'CinetPay Mobile Money',
      paymentUrl: checkout.paymentUrl,
      instructions:
        "Vous allez être redirigé vers CinetPay. L'accès sera activé uniquement après confirmation sécurisée du paiement.",
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

    if (process.env.PAYMENTS_DEMO_MODE !== 'true') {
      throw new ForbiddenException(
        'La confirmation manuelle est désactivée en production.',
      );
    }

    const { data: payment, error: paymentError } =
      await this.supabaseService.client
        .from('payments')
        .select(
          'id, user_id, course_id, teacher_id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status',
        )
        .eq('id', paymentId)
        .maybeSingle();

    if (paymentError || !payment) {
      throw new BadRequestException(
        paymentError?.message ?? 'Paiement introuvable.',
      );
    }

    if (payment.user_id !== user.id && role !== 'admin') {
      throw new ForbiddenException(
        "Ce paiement n'appartient pas a cet utilisateur.",
      );
    }

    await this.activateCoursePayment(payment);

    return {
      paymentId: payment.id,
      status: 'paid',
      courseId: payment.course_id,
      amountFcfa: Number(payment.amount_fcfa ?? 0),
      message: 'Paiement confirme et acces au cours active.',
    };
  }

  async handleCinetPayWebhook(transactionId?: string) {
    if (!this.isCinetPayConfigured()) {
      throw new ServiceUnavailableException('CinetPay n’est pas configuré.');
    }
    const paymentId = this.paymentIdFromTransactionId(transactionId);
    const { data: payment, error } = await this.supabaseService.client
      .from('payments')
      .select(
        'id, user_id, course_id, teacher_id, amount_fcfa, platform_fee_fcfa, teacher_earning_fcfa, status',
      )
      .eq('id', paymentId)
      .maybeSingle();
    if (error || !payment) {
      throw new BadRequestException(error?.message ?? 'Transaction inconnue.');
    }

    const verification = await this.verifyCinetPayTransaction(
      this.transactionIdFromPaymentId(paymentId),
    );
    const verifiedAmount = Number(verification.data?.amount ?? 0);
    const accepted =
      verification.code === '00' &&
      verification.data?.status === 'ACCEPTED' &&
      verification.data?.currency === 'XAF' &&
      verifiedAmount === Number(payment.amount_fcfa);

    if (!accepted) {
      const nextStatus =
        verification.data?.status === 'REFUSED' ? 'failed' : 'processing';
      await this.supabaseService.client
        .from('payments')
        .update({ status: nextStatus })
        .eq('id', payment.id)
        .neq('status', 'paid');
      return { received: true, paid: false, status: nextStatus };
    }

    await this.activateCoursePayment(payment);
    return { received: true, paid: true, status: 'paid' };
  }

  async createInstitutionCheckout(
    user: AuthUser,
    institutionId: string,
    planName?: string,
  ) {
    const membershipRole = await this.getInstitutionAccessRole(
      user.id,
      institutionId,
    );
    if (!membershipRole || !['owner', 'admin'].includes(membershipRole)) {
      throw new ForbiddenException(
        "Seuls les responsables d'etablissement peuvent preparer un abonnement.",
      );
    }

    const normalizedPlan = this.normalizeInstitutionPlan(planName);
    const plan = this.institutionPlans[normalizedPlan];
    const institution = await this.getInstitutionForBilling(institutionId);

    return {
      enabled: false,
      provider: 'pending_configuration',
      providerLabel: 'Abonnement établissement bientôt disponible',
      institution: {
        id: institution.id,
        name: institution.name ?? 'Etablissement',
      },
      plan: {
        code: normalizedPlan,
        label: plan.label,
        amountFcfa: plan.amountFcfa,
        maxStudents: plan.maxStudents,
        maxRooms: plan.maxRooms,
      },
      instructions:
        "Aucun paiement n'est demandé pour le moment. L'abonnement sera activé uniquement après l'intégration d'un parcours marchand dédié aux établissements.",
    };
  }

  private isCinetPayConfigured() {
    return (
      process.env.PAYMENT_PROVIDER?.trim().toLowerCase() === 'cinetpay' &&
      Boolean(process.env.CINETPAY_API_KEY?.trim()) &&
      Boolean(process.env.CINETPAY_SITE_ID?.trim()) &&
      Boolean(this.publicApiUrl()) &&
      Boolean(process.env.FRONTEND_URL?.trim())
    );
  }

  private async initializeCinetPayCheckout(input: {
    paymentId: string;
    amountFcfa: number;
    courseId: string;
    courseTitle: string;
    userId: string;
  }) {
    if (input.amountFcfa % 5 !== 0) {
      throw new BadRequestException(
        'Le prix du cours doit être un multiple de 5 FCFA pour le paiement Mobile Money.',
      );
    }
    const transactionId = this.transactionIdFromPaymentId(input.paymentId);
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: transactionId,
        amount: input.amountFcfa,
        currency: 'XAF',
        description: `Cours Kalatty ${input.courseTitle}`
          .replace(/[^a-zA-Z0-9À-ÿ ]/g, ' ')
          .slice(0, 120),
        notify_url: `${this.publicApiUrl()}/payments/cinetpay/notify`,
        return_url: `${process.env.FRONTEND_URL?.replace(/\/$/, '')}/learn/courses/${input.courseId}?payment=return`,
        channels: 'MOBILE_MONEY',
        lang: 'FR',
        metadata: JSON.stringify({ paymentId: input.paymentId, userId: input.userId }),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      description?: string;
      data?: { payment_url?: string };
    };
    if (!response.ok || body.code !== '201' || !body.data?.payment_url) {
      throw new ServiceUnavailableException(
        body.description ?? body.message ?? 'CinetPay est momentanément indisponible.',
      );
    }
    return { paymentUrl: body.data.payment_url };
  }

  private async verifyCinetPayTransaction(transactionId: string) {
    const response = await fetch(
      'https://api-checkout.cinetpay.com/v2/payment/check',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: process.env.CINETPAY_API_KEY,
          site_id: process.env.CINETPAY_SITE_ID,
          transaction_id: transactionId,
        }),
      },
    );
    const body = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      data?: { amount?: string; currency?: string; status?: string };
    };
    if (!response.ok) {
      throw new ServiceUnavailableException(
        body.message ?? 'Vérification CinetPay indisponible.',
      );
    }
    return body;
  }

  private async activateCoursePayment(payment: {
    id: string;
    user_id: string;
    course_id: string;
    status: string;
  }) {
    if (payment.status !== 'paid') {
      const { error } = await this.supabaseService.client
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', payment.id);
      if (error) throw new BadRequestException(error.message);
    }
    const { data: enrollment, error: lookupError } =
      await this.supabaseService.client
        .from('enrollments')
        .select('id')
        .eq('user_id', payment.user_id)
        .eq('course_id', payment.course_id)
        .maybeSingle();
    if (lookupError) throw new BadRequestException(lookupError.message);
    if (!enrollment) {
      const { error } = await this.supabaseService.client
        .from('enrollments')
        .insert({ user_id: payment.user_id, course_id: payment.course_id });
      if (error) throw new BadRequestException(error.message);
    }
  }

  private transactionIdFromPaymentId(paymentId: string) {
    return paymentId.replace(/-/g, '');
  }

  private paymentIdFromTransactionId(transactionId?: string) {
    const value = transactionId?.trim().toLowerCase() ?? '';
    if (!/^[a-f0-9]{32}$/.test(value)) {
      throw new BadRequestException('Identifiant de transaction invalide.');
    }
    return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
  }

  private publicApiUrl() {
    const configured = process.env.PUBLIC_API_URL?.trim();
    if (configured) return configured.replace(/\/$/, '');
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim();
    return railwayDomain ? `https://${railwayDomain}` : '';
  }

  private async hasInstitutionCourseAccess(userId: string, courseId: string) {
    const { data: memberships, error: membershipsError } =
      await this.supabaseService.client
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId)
        .eq('role', 'student');

    if (membershipsError) {
      throw new BadRequestException(
        membershipsError.message ??
          "Impossible de verifier l'acces de la classe.",
      );
    }

    const roomIds = (memberships ?? [])
      .map((membership: any) => String(membership.room_id ?? ''))
      .filter(Boolean);

    if (roomIds.length === 0) return false;

    const { data: assignedCourse, error: assignedCourseError } =
      await this.supabaseService.client
        .from('room_courses')
        .select('id')
        .eq('course_id', courseId)
        .in('room_id', roomIds)
        .limit(1)
        .maybeSingle();

    if (assignedCourseError) {
      throw new BadRequestException(
        assignedCourseError.message ??
          "Impossible de verifier l'affectation du cours a la classe.",
      );
    }

    return Boolean(assignedCourse?.id);
  }

  async activateInstitutionSubscription(
    user: AuthUser,
    institutionId: string,
    planName?: string,
  ) {
    if (process.env.PAYMENTS_DEMO_MODE !== 'true') {
      throw new ForbiddenException(
        "L'activation manuelle des abonnements est désactivée en production.",
      );
    }
    const membershipRole = await this.getInstitutionAccessRole(
      user.id,
      institutionId,
    );
    if (!membershipRole || !['owner', 'admin'].includes(membershipRole)) {
      throw new ForbiddenException(
        "Seuls les responsables d'etablissement peuvent activer un abonnement.",
      );
    }

    const normalizedPlan = this.normalizeInstitutionPlan(planName);
    const plan = this.institutionPlans[normalizedPlan];

    const { data, error } = await this.supabaseService.client
      .from('institutions')
      .update({
        plan_name: normalizedPlan,
        subscription_status: 'active',
        max_students: plan.maxStudents,
        max_rooms: plan.maxRooms,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', institutionId)
      .select(
        'id, name, slug, plan_name, subscription_status, max_students, max_rooms, updated_at',
      )
      .single();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible d'activer l'abonnement etablissement.",
      );
    }

    return {
      institution: data,
      plan: {
        code: normalizedPlan,
        label: plan.label,
        amountFcfa: plan.amountFcfa,
        maxStudents: plan.maxStudents,
        maxRooms: plan.maxRooms,
      },
      status: 'active',
      message: 'Abonnement établissement activé dans un environnement de test.',
    };
  }

  private async resolveRole(user: AuthUser) {
    if (
      user.role === 'teacher' ||
      user.role === 'admin' ||
      user.role === 'student'
    ) {
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

  private normalizeInstitutionPlan(planName?: string): InstitutionPlanName {
    const normalized = String(planName ?? 'starter')
      .trim()
      .toLowerCase();

    if (normalized === 'growth' || normalized === 'campus') {
      return normalized;
    }

    return 'starter';
  }

  private async getInstitutionForBilling(institutionId: string) {
    const { data, error } = await this.supabaseService.client
      .from('institutions')
      .select('id, name, owner_user_id')
      .eq('id', institutionId)
      .maybeSingle();

    if (error || !data) {
      throw new BadRequestException(
        error?.message ?? "Impossible de retrouver l'etablissement.",
      );
    }

    return data;
  }

  private async getInstitutionAccessRole(
    userId: string,
    institutionId: string,
  ) {
    const institution = await this.getInstitutionForBilling(institutionId);

    if (institution.owner_user_id === userId) {
      return 'owner';
    }

    const { data, error } = await this.supabaseService.client
      .from('institution_members')
      .select('role')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(
        error.message ?? "Impossible de verifier l'acces etablissement.",
      );
    }

    return data?.role ?? null;
  }
}
