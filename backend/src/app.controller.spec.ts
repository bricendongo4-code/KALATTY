import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';

describe('AppController', () => {
  let appController: AppController;
  const databaseProbe = jest.fn();

  beforeEach(async () => {
    databaseProbe.mockReset().mockResolvedValue({ data: [], error: null });
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: SupabaseService,
          useValue: {
            client: {
              from: jest.fn(() => ({
                select: jest.fn(() => ({
                  limit: jest.fn(() => ({ abortSignal: databaseProbe })),
                })),
              })),
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('identifies the Kalatty API', () => {
      expect(appController.getHello()).toBe('Kalatty API');
    });

    it('reports liveness information', () => {
      expect(appController.getLiveness()).toEqual(
        expect.objectContaining({ status: 'ok', service: 'kalatty-backend' }),
      );
    });

    it('reports database readiness', async () => {
      await expect(appController.getReadiness()).resolves.toEqual(
        expect.objectContaining({ status: 'ok', checks: { database: 'ok' } }),
      );
    });

    it('reports Supabase errors as unavailable without exposing their details', async () => {
      databaseProbe.mockResolvedValue({
        error: { message: 'upstream failure' },
      });
      await expect(appController.getReadiness()).rejects.toMatchObject({
        status: 503,
        response: { status: 'degraded', checks: { database: 'unavailable' } },
      });
    });

    it('aborts a stalled Supabase probe after three seconds', async () => {
      jest.useFakeTimers();
      try {
        databaseProbe.mockImplementation(
          (signal: AbortSignal) =>
            new Promise((_, reject) => {
              signal.addEventListener('abort', () => reject(signal.reason));
            }),
        );
        const result = expect(
          appController.getReadiness(),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
        await jest.advanceTimersByTimeAsync(3_000);
        await result;
        expect(databaseProbe.mock.calls[0][0].aborted).toBe(true);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
