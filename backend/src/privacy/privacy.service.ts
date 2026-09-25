import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

type AuthUser = { id: string; email?: string };

@Injectable()
export class PrivacyService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async exportMyData(user: AuthUser) {
    const client = this.supabaseService.client;
    const [profile, enrollments, progress, notes, questions, reviews, memberships, payments] = await Promise.all([
      client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      client.from('enrollments').select('*').eq('user_id', user.id),
      client.from('progress').select('*').eq('user_id', user.id),
      client.from('lesson_notes').select('*').eq('user_id', user.id),
      client.from('course_questions').select('*').eq('author_id', user.id),
      client.from('course_reviews').select('*').eq('student_id', user.id),
      client.from('institution_members').select('*').eq('user_id', user.id),
      client.from('payments').select('id, course_id, amount_fcfa, status, created_at').eq('user_id', user.id),
    ]);
    const firstError = [profile, enrollments, progress, notes, questions, reviews, memberships, payments].find((result) => result.error)?.error;
    if (firstError) throw new BadRequestException(firstError.message);
    return {
      generatedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email ?? null, profile: profile.data },
      learning: {
        enrollments: enrollments.data ?? [],
        progress: progress.data ?? [],
        personalNotes: notes.data ?? [],
        questions: questions.data ?? [],
        reviews: reviews.data ?? [],
      },
      institutions: memberships.data ?? [],
      payments: payments.data ?? [],
    };
  }

  async createRequest(user: AuthUser, requestType: 'deletion' | 'rectification') {
    const { data, error } = await this.supabaseService.client
      .from('privacy_requests')
      .insert({ user_id: user.id, request_type: requestType, status: 'pending' })
      .select('id, request_type, status, requested_at')
      .single();
    if (error) {
      throw new BadRequestException(
        error.message.includes('privacy_requests')
          ? 'Le registre des demandes doit être initialisé par la migration privacy_requests.'
          : error.message,
      );
    }
    return { request: data, message: 'Votre demande a été enregistrée et sera traitée par Kalatty.' };
  }
}
