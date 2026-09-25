import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseService } from './supabase/supabase.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
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
                  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
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
  });
});
