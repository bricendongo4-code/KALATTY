import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: {
    authClient: {
      auth: {
        signInWithPassword: jest.Mock;
        resetPasswordForEmail: jest.Mock;
      };
    };
    client: Record<string, unknown>;
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    supabaseService = {
      authClient: {
        auth: {
          signInWithPassword: jest.fn(),
          resetPasswordForEmail: jest.fn(),
        },
      },
      client: {},
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('throws UnauthorizedException when Supabase rejects the credentials', async () => {
      supabaseService.authClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('rejects an invalid email without calling Supabase', async () => {
      await expect(
        service.forgotPassword('not-an-email'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        supabaseService.authClient.auth.resetPasswordForEmail,
      ).not.toHaveBeenCalled();
    });

    it('requests a recovery email for a valid address', async () => {
      supabaseService.authClient.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await service.forgotPassword('User@Example.com');

      expect(
        supabaseService.authClient.auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) }),
      );
      expect(result.message).toContain('recuperation');
    });
  });
});
