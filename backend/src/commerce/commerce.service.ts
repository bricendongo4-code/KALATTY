import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  amount,
  id,
  payoutAccount,
  routeFeedback,
  text,
} from './commerce-model';
@Injectable()
export class CommerceService {
  constructor(private readonly supabase: SupabaseService) {}
  private get db(): any {
    return this.supabase.client;
  }
  private result(r: any) {
    if (r.error)
      throw new ServiceUnavailableException(
        'Enregistrement indisponible. Actualisez avant de réessayer.',
      );
    return r.data;
  }
  async feedback(userId: string) {
    const r = await this.db
      .from('app_feedback')
      .select(
        'id,rating,category,body,status,assigned_department,decision_note,created_at',
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    return this.result(r) ?? [];
  }
  async submitFeedback(userId: string, input: Record<string, unknown>) {
    const body = text(input.body, 10, 3000),
      category = text(input.category, 2, 30),
      rating = input.rating;
    if (
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    )
      throw new BadRequestException('Note entre 1 et 5 attendue.');
    const suggestion = routeFeedback(category, body);
    const r = await this.db.rpc('submit_app_feedback', {
      actor: userId,
      stars: rating,
      kind: category,
      message: body,
      department: suggestion.department,
      reason: suggestion.reason,
    });
    if (r.error)
      throw new BadRequestException(
        'Avis non enregistré. Maximum 5 avis par jour ; vérifiez votre connexion avant de réessayer.',
      );
    return r.data;
  }
  async support(page = 0) {
    const r = await this.db
      .from('app_feedback')
      .select('*,profiles!app_feedback_user_id_fkey(fullname)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(page * 50, page * 50 + 49);
    this.result(r);
    return { reviews: r.data ?? [], total: r.count ?? 0, page };
  }
  async route(actor: string, review: string, input: Record<string, unknown>) {
    const version = input.version;
    if (!Number.isInteger(version) || Number(version) < 1)
      throw new BadRequestException('Version requise.');
    const r = await this.db.rpc('route_app_feedback', {
      feedback_id: id(review),
      actor,
      expected_version: version,
      target_department: text(input.department, 2, 30),
      note: text(input.note, 3, 500),
    });
    if (r.error)
      throw new ConflictException(
        'Avis déjà orienté ou modifié. Actualisez la liste.',
      );
    return r.data;
  }
  async updateFeedback(review: string, input: Record<string, unknown>) {
    if (!['in_progress', 'resolved'].includes(String(input.status)))
      throw new BadRequestException('Statut invalide.');
    if (!Number.isInteger(input.version))
      throw new BadRequestException('Version requise.');
    const r = await this.db
      .from('app_feedback')
      .update({
        status: input.status,
        decision_note: text(input.note, 3, 500),
        version: Number(input.version) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id(review))
      .eq('version', input.version)
      .not('proposal_id', 'is', null)
      .select()
      .maybeSingle();
    if (!this.result(r))
      throw new ConflictException(
        'Orientez cet avis ou actualisez sa version avant de poursuivre.',
      );
    return r.data;
  }
  async requireTeacher(userId: string) {
    const r = await this.db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (r.error || r.data?.role !== 'teacher')
      throw new ForbiddenException('Espace réservé aux formateurs.');
  }
  async wallet(userId: string) {
    await this.requireTeacher(userId);
    const [w, a, r] = await Promise.all([
      this.db.rpc('teacher_wallet', { teacher: userId }),
      this.db
        .from('teacher_payout_accounts')
        .select('*')
        .eq('teacher_id', userId)
        .maybeSingle(),
      this.db
        .from('teacher_payout_requests')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    return {
      wallet: this.result(w),
      account: this.result(a),
      requests: this.result(r) ?? [],
    };
  }
  async saveAccount(userId: string, input: Record<string, unknown>) {
    await this.requireTeacher(userId);
    return this.result(
      await this.db
        .from('teacher_payout_accounts')
        .upsert({
          teacher_id: userId,
          ...payoutAccount(input),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single(),
    );
  }
  async requestPayout(userId: string, input: Record<string, unknown>) {
    await this.requireTeacher(userId);
    const r = await this.db.rpc('request_teacher_payout', {
      teacher: userId,
      requested_amount: amount(input.amountFcfa),
      idempotency_key: id(input.requestKey),
    });
    if (r.error)
      throw new BadRequestException(
        'Retrait non enregistré : vérifiez le compte, le minimum et le solde disponible. Actualisez avant de réessayer.',
      );
    return r.data;
  }
  async finance(from: string, to: string, page: number) {
    const [totals, ledger, expenses, withdrawals, settings] = await Promise.all(
      [
        this.db.rpc('finance_totals', { date_from: from, date_to: to }),
        this.db.rpc('finance_ledger', {
          date_from: from,
          date_to: to,
          page_number: page,
        }),
        this.db
          .from('finance_expenses')
          .select('*')
          .gte('expense_date', from.slice(0, 10))
          .lt('expense_date', to.slice(0, 10))
          .order('expense_date', { ascending: false })
          .limit(100),
        this.db
          .from('teacher_payout_requests')
          .select(
            '*,profiles!teacher_payout_requests_teacher_id_fkey(fullname)',
          )
          .order('created_at', { ascending: false })
          .limit(100),
        this.db.from('commerce_settings').select('*').eq('id', true).single(),
      ],
    );
    return {
      totals: this.result(totals),
      ledger: this.result(ledger),
      expenses: this.result(expenses),
      withdrawals: this.result(withdrawals),
      settings: this.result(settings),
      from,
      to,
    };
  }
  async expense(actor: string, input: Record<string, unknown>) {
    if (
      ![
        'hosting',
        'ai',
        'payment_fees',
        'marketing',
        'operations',
        'other',
      ].includes(String(input.category))
    )
      throw new BadRequestException('Catégorie invalide.');
    if (!['paid', 'planned'].includes(String(input.status)))
      throw new BadRequestException('Statut invalide.');
    const date = text(input.date, 10, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      throw new BadRequestException('Date invalide.');
    if (input.status === 'paid' && date > new Date().toISOString().slice(0, 10))
      throw new BadRequestException('Une dépense future reste prévisionnelle.');
    return this.result(
      await this.db
        .from('finance_expenses')
        .insert({
          created_by: actor,
          label: text(input.label, 3, 160),
          category: input.category,
          amount_fcfa: amount(input.amountFcfa),
          expense_date: date,
          status: input.status,
          reference: text(input.reference, 3, 250),
        })
        .select()
        .single(),
    );
  }
  async providerFee(
    actor: string,
    paymentId: string,
    input: Record<string, unknown>,
  ) {
    if (!['course', 'institution'].includes(String(input.kind)))
      throw new BadRequestException('Type de transaction invalide.');
    const fee = input.feeFcfa;
    if (typeof fee !== 'number' || !Number.isSafeInteger(fee) || fee < 0)
      throw new BadRequestException('Frais entiers positifs ou nuls requis.');
    const table =
      input.kind === 'course' ? 'payments' : 'institution_billing_payments';
    const current = await this.db
      .from(table)
      .select('amount_fcfa,provider_fee_fcfa')
      .eq('id', id(paymentId))
      .eq('status', 'paid')
      .eq('verification_source', 'cinetpay')
      .maybeSingle();
    if (
      current.error ||
      !current.data ||
      fee > Number(current.data.amount_fcfa)
    )
      throw new BadRequestException(
        'Transaction confirmée ou montant de frais invalide.',
      );
    if (input.expectedFee !== current.data.provider_fee_fcfa)
      throw new ConflictException(
        'Les frais ont changé. Actualisez avant de les modifier.',
      );
    let q = this.db
      .from(table)
      .update({
        provider_fee_fcfa: fee,
        provider_fee_reference: text(input.reference, 3, 250),
        provider_fee_recorded_by: actor,
      })
      .eq('id', paymentId);
    q =
      current.data.provider_fee_fcfa === null
        ? q.is('provider_fee_fcfa', null)
        : q.eq('provider_fee_fcfa', current.data.provider_fee_fcfa);
    const r = await q.select('id').maybeSingle();
    if (!this.result(r))
      throw new ConflictException('Transaction modifiée. Actualisez.');
    return r.data;
  }
  async voidExpense(
    actor: string,
    expenseId: string,
    input: Record<string, unknown>,
  ) {
    const r = await this.db
      .from('finance_expenses')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: actor,
        void_reason: text(input.reason, 3, 250),
      })
      .eq('id', id(expenseId))
      .is('voided_at', null)
      .select()
      .maybeSingle();
    if (!this.result(r))
      throw new ConflictException('Dépense déjà annulée ou introuvable.');
    return r.data;
  }
  async settings(actor: string, input: Record<string, unknown>) {
    const minimum = amount(input.minimumFcfa),
      hold = input.holdDays;
    if (
      minimum < 500 ||
      minimum > 700000 ||
      !Number.isInteger(hold) ||
      Number(hold) < 0 ||
      Number(hold) > 90
    )
      throw new BadRequestException(
        'Minimum de 500 à 700 000 FCFA et délai de 0 à 90 jours requis.',
      );
    return this.result(
      await this.db
        .from('commerce_settings')
        .update({
          withdrawal_min_fcfa: minimum,
          withdrawal_hold_days: hold,
          updated_by: actor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', true)
        .select()
        .single(),
    );
  }
  async decidePayout(
    actor: string,
    payoutId: string,
    input: Record<string, unknown>,
  ) {
    if (!['approved', 'rejected'].includes(String(input.status)))
      throw new BadRequestException('Décision invalide.');
    // Approval only reserves funds. No provider dispatch or manual paid status is exposed.
    const r = await this.db
      .from('teacher_payout_requests')
      .update({
        status: input.status,
        decision_note: text(input.note, 3, 500),
        decided_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id(payoutId))
      .in(
        'status',
        input.status === 'approved' ? ['requested'] : ['requested', 'approved'],
      )
      .select()
      .maybeSingle();
    if (!this.result(r))
      throw new ConflictException('Demande déjà traitée ou introuvable.');
    return r.data;
  }
}
