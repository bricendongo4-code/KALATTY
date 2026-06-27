import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';

type RegisterPayload = {
  email: string;
  password: string;
  fullname: string;
  role?: 'student' | 'teacher' | 'institution';
  country?: string;
  level?: string;
  school_name?: string;
  expertise?: string;
  bio?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterPayload) {
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const fullname = data.fullname.trim();
    const role =
      data.role === 'teacher'
        ? 'teacher'
        : data.role === 'institution'
          ? 'institution'
          : 'student';
    const country = data.country?.trim() || 'Cameroun';
    const level = data.level?.trim() || null;
    const schoolName = data.school_name?.trim() || null;
    const expertise = data.expertise?.trim() || null;
    const bio = data.bio?.trim() || null;
    let effectiveRole = this.normalizeRole(role);

    const { data: authData, error } =
      await this.supabaseService.authClient.auth.signUp({
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

    if (authData.user?.id) {
      effectiveRole = await this.resolveAccountRole(authData.user.id, role);

      await this.syncProfileRecord(authData.user.id, {
        email,
        fullname,
        role: effectiveRole,
        country,
        level,
        school_name: schoolName,
        expertise,
        bio,
      });

      if (effectiveRole === 'institution') {
        await this.ensureInstitutionWorkspace(authData.user.id, {
          name: schoolName || fullname,
          contact_email: email,
          institution_type: expertise,
          description: bio,
          country,
        });
      }
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
            role: effectiveRole,
            country:
              (authData.user.user_metadata?.country as string | undefined) ??
              country,
            level:
              (authData.user.user_metadata?.level as string | undefined) ??
              level,
            school_name:
              (authData.user.user_metadata?.school_name as
                | string
                | undefined) ?? schoolName,
            expertise:
              (authData.user.user_metadata?.expertise as string | undefined) ??
              expertise,
          }
        : null,
      token: authData.user
        ? this.jwtService.sign({
            sub: authData.user.id,
            email: authData.user.email,
            role: effectiveRole,
          })
        : null,
      supabaseToken: authData.session?.access_token ?? null,
    };
  }

  async login(data: { email: string; password: string }) {
    const email = data.email.trim().toLowerCase();
    const password = data.password;

    const { data: authData, error } =
      await this.supabaseService.authClient.auth.signInWithPassword({
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

    const metadataRole =
      (authData.user.user_metadata?.role as string | undefined) ?? 'student';
    const effectiveRole = await this.resolveAccountRole(
      authData.user.id,
      metadataRole,
    );

    await this.syncProfileRecord(authData.user.id, {
      email: authData.user.email ?? email,
      fullname:
        (authData.user.user_metadata?.fullname as string | undefined) ?? '',
      role: effectiveRole,
      country:
        (authData.user.user_metadata?.country as string | undefined) ??
        'Cameroun',
      level: (authData.user.user_metadata?.level as string | undefined) ?? null,
      school_name:
        (authData.user.user_metadata?.school_name as string | undefined) ??
        null,
      expertise:
        (authData.user.user_metadata?.expertise as string | undefined) ?? null,
      bio: (authData.user.user_metadata?.bio as string | undefined) ?? null,
    });

    if (effectiveRole === 'institution') {
      await this.ensureInstitutionWorkspace(authData.user.id, {
        name:
          (authData.user.user_metadata?.school_name as string | undefined) ??
          (authData.user.user_metadata?.fullname as string | undefined) ??
          'Etablissement Kalatty',
        contact_email: authData.user.email ?? email,
        institution_type:
          (authData.user.user_metadata?.expertise as string | undefined) ??
          null,
        description:
          (authData.user.user_metadata?.bio as string | undefined) ?? null,
        country:
          (authData.user.user_metadata?.country as string | undefined) ??
          'Cameroun',
      });
    }

    return {
      message: 'Connexion reussie.',
      token: this.jwtService.sign({
        sub: authData.user.id,
        email: authData.user.email,
        role: effectiveRole,
      }),
      supabaseToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        fullname:
          (authData.user.user_metadata?.fullname as string | undefined) ?? '',
        role: effectiveRole,
        country:
          (authData.user.user_metadata?.country as string | undefined) ??
          'Cameroun',
        level:
          (authData.user.user_metadata?.level as string | undefined) ?? null,
        school_name:
          (authData.user.user_metadata?.school_name as string | undefined) ??
          null,
        expertise:
          (authData.user.user_metadata?.expertise as string | undefined) ??
          null,
      },
    };
  }

  async forgotPassword(rawEmail: string) {
    const email = rawEmail?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      throw new BadRequestException('Saisissez une adresse email valide.');
    }

    const frontendUrl = (
      process.env.FRONTEND_URL ?? 'https://kalatty-frontend.vercel.app'
    ).replace(/\/$/, '');
    const { error } =
      await this.supabaseService.authClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${frontendUrl}/reset-password`,
      });

    if (error) {
      this.logger.warn(`Password recovery request failed: ${error.message}`);
    }

    return {
      message:
        "Si cette adresse est associee a un compte, un lien de recuperation vient d'etre envoye.",
    };
  }

  async resetPassword(data: { accessToken: string; password: string }) {
    const accessToken = data.accessToken?.trim();
    const password = data.password ?? '';

    if (!accessToken) {
      throw new UnauthorizedException(
        'Le lien de recuperation est absent ou invalide.',
      );
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
      );
    }

    const { data: userData, error: userError } =
      await this.supabaseService.authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      throw new UnauthorizedException(
        'Ce lien de recuperation a expire ou a deja ete utilise.',
      );
    }

    const { error: updateError } =
      await this.supabaseService.client.auth.admin.updateUserById(
        userData.user.id,
        { password },
      );

    if (updateError) {
      throw new BadRequestException(
        updateError.message ?? 'Impossible de modifier le mot de passe.',
      );
    }

    return {
      message: 'Mot de passe modifie. Vous pouvez maintenant vous connecter.',
    };
  }

  private async syncProfileRecord(
    userId: string,
    payload: {
      email: string;
      fullname: string;
      role: string;
      country?: string | null;
      level?: string | null;
      school_name?: string | null;
      expertise?: string | null;
      bio?: string | null;
    },
  ) {
    const { data: existingProfile } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const nextRole = this.mergeRoles(existingProfile?.role, payload.role);

    const { error } = await this.supabaseService.client.from('profiles').upsert(
      {
        id: userId,
        email: payload.email,
        fullname: payload.fullname?.trim() || 'Utilisateur Kalatty',
        role: nextRole,
        country: payload.country?.trim() || 'Cameroun',
        level: payload.level?.trim() || null,
        school_name: payload.school_name?.trim() || null,
        expertise: payload.expertise?.trim() || null,
        bio: payload.bio?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (error) {
      throw new BadRequestException(
        error.message ?? 'Impossible de synchroniser le profil utilisateur.',
      );
    }
  }

  private async resolveAccountRole(userId: string, requestedRole: string) {
    const normalizedRequestedRole = this.normalizeRole(requestedRole);

    const { data: existingProfile } = await this.supabaseService.client
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    const { data: ownedInstitution } = await this.supabaseService.client
      .from('institutions')
      .select('id')
      .eq('owner_user_id', userId)
      .limit(1)
      .maybeSingle();

    if (ownedInstitution?.id) {
      return 'institution';
    }

    const { data: institutionMembership } = await this.supabaseService.client
      .from('institution_members')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();

    if (institutionMembership?.role) {
      return 'institution';
    }

    const { data: teacherCourse } = await this.supabaseService.client
      .from('courses')
      .select('id')
      .eq('teacher_id', userId)
      .limit(1)
      .maybeSingle();

    if (teacherCourse?.id) {
      return 'teacher';
    }

    return this.mergeRoles(existingProfile?.role, normalizedRequestedRole);
  }

  private mergeRoles(
    existingRole?: string | null,
    incomingRole?: string | null,
  ) {
    const normalizedExisting = this.normalizeRole(existingRole ?? undefined);
    const normalizedIncoming = this.normalizeRole(incomingRole ?? undefined);

    if (
      normalizedExisting === 'institution' ||
      normalizedIncoming === 'institution'
    ) {
      return 'institution';
    }

    if (normalizedExisting === 'teacher' || normalizedIncoming === 'teacher') {
      return 'teacher';
    }

    return 'student';
  }

  private normalizeRole(role?: string) {
    if (role === 'institution') {
      return 'institution';
    }

    if (role === 'teacher') {
      return 'teacher';
    }

    return 'student';
  }

  private async ensureInstitutionWorkspace(
    userId: string,
    payload: {
      name: string;
      contact_email: string;
      institution_type?: string | null;
      description?: string | null;
      country?: string | null;
    },
  ) {
    const { data: existingInstitution, error: existingError } =
      await this.supabaseService.client
        .from('institutions')
        .select('id')
        .eq('owner_user_id', userId)
        .limit(1)
        .maybeSingle();

    if (existingError) {
      throw new BadRequestException(
        existingError.message ??
          "Impossible de verifier l'espace etablissement existant.",
      );
    }

    let institutionId = existingInstitution?.id as string | undefined;

    if (!institutionId) {
      const baseSlug = this.buildSlug(payload.name || 'etablissement-kalatty');
      const slug = `${baseSlug}-${userId.slice(0, 8)}`;

      const { data: createdInstitution, error: createError } =
        await this.supabaseService.client
          .from('institutions')
          .insert({
            name: payload.name.trim(),
            slug,
            owner_user_id: userId,
            contact_email: payload.contact_email,
            institution_type: payload.institution_type?.trim() || null,
            description: payload.description?.trim() || null,
            country: payload.country?.trim() || 'Cameroun',
            plan_name: 'starter',
            max_students: 100,
            max_rooms: 10,
          })
          .select('id')
          .single();

      if (createError || !createdInstitution) {
        throw new BadRequestException(
          createError?.message ??
            "Impossible de creer automatiquement l'espace etablissement.",
        );
      }

      institutionId = createdInstitution.id;
    }

    const { error: membershipError } = await this.supabaseService.client
      .from('institution_members')
      .upsert(
        {
          institution_id: institutionId,
          user_id: userId,
          role: 'owner',
        },
        { onConflict: 'institution_id,user_id' },
      );

    if (membershipError) {
      throw new BadRequestException(
        membershipError.message ??
          "Impossible de rattacher le compte a l'espace etablissement.",
      );
    }
  }

  private buildSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }
}
