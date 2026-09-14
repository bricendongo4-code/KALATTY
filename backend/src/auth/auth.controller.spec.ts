import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates register to AuthService', async () => {
    const body = {
      email: 'student@example.com',
      password: 'password123',
      fullname: 'Student Example',
    };
    authService.register.mockResolvedValue({ message: 'ok' });

    await expect(controller.register(body)).resolves.toEqual({
      message: 'ok',
    });
    expect(authService.register).toHaveBeenCalledWith(body);
  });

  it('delegates login to AuthService', async () => {
    const body = { email: 'student@example.com', password: 'password123' };
    authService.login.mockResolvedValue({ message: 'ok' });

    await expect(controller.login(body)).resolves.toEqual({ message: 'ok' });
    expect(authService.login).toHaveBeenCalledWith(body);
  });
});
