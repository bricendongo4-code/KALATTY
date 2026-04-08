import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

type RegisterPayload = {
  email: string;
  password: string;
  fullname: string;
  role?: 'student' | 'teacher';
  country?: string;
  level?: string;
  school_name?: string;
  expertise?: string;
  bio?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterPayload) {
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const fullname = data.fullname.trim();
    const role = data.role === 'teacher' ? 'teacher' : 'student';
    const country = data.country?.trim() || 'Cameroun';
    const level = data.level?.trim() || null;
    const schoolName = data.school_name?.trim() || null;
    const expertise = data.expertise?.trim() || null;
    const bio = data.bio?.trim() || null;

    const { data: authData, error } =
      await this.supabaseService.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            fullname,
            role,
            country,
            level,
            school_name: schoolName,
            expertise,
            bio,
          },
        },
      });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message:
        authData.session || !authData.user?.identities?.length
          ? 'Inscription reussie.'
          : 'Inscription reussie. Verifiez votre email pour confirmer le compte.',
      user: authData.user
        ? {
            id: authData.user.id,
            email: authData.user.email,
            fullname:
              (authData.user.user_metadata?.fullname as string | undefined) ??
              fullname,
            role:
              (authData.user.user_metadata?.role as string | undefined) ?? role,
            country:
              (authData.user.user_metadata?.country as string | undefined) ??
              country,
            level:
              (authData.user.user_metadata?.level as string | undefined) ?? level,
            school_name:
              (authData.user.user_metadata?.school_name as string | undefined) ??
              schoolName,
            expertise:
              (authData.user.user_metadata?.expertise as string | undefined) ??
              expertise,
          }
        : null,
      token: authData.user
        ? this.jwtService.sign({
            sub: authData.user.id,
            email: authData.user.email,
            role,
          })
        : null,
      supabaseToken: authData.session?.access_token ?? null,
    };
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    const { data: authData, error } =
      await this.supabaseService.client.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    if (!authData.user || !authData.session) {
      throw new UnauthorizedException(
        'Connexion impossible. Verifiez votre email ou confirmez votre compte.',
      );
    }

    return {
      message: 'Connexion reussie.',
      token: this.jwtService.sign({
        sub: authData.user.id,
        email: authData.user.email,
        role:
          (authData.user.user_metadata?.role as string | undefined) ?? 'student',
      }),
      supabaseToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullname:
          (authData.user.user_metadata?.fullname as string | undefined) ?? '',
        role:
          (authData.user.user_metadata?.role as string | undefined) ?? 'student',
        country:
          (authData.user.user_metadata?.country as string | undefined) ??
          'Cameroun',
        level:
          (authData.user.user_metadata?.level as string | undefined) ?? null,
        school_name:
          (authData.user.user_metadata?.school_name as string | undefined) ??
          null,
        expertise:
          (authData.user.user_metadata?.expertise as string | undefined) ?? null,
      },
    };
  }
}
