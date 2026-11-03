import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Payment safety boundaries', () => {
  const makeService = () => {
    const from = jest.fn();
    const service = new PaymentsService({
      client: { from },
    } as unknown as SupabaseService);
    return { service, from };
  };

  it('rejects a checkout without a course identifier before any database operation', async () => {
    const { service, from } = makeService();
    await expect(
      service.createCourseCheckout({ id: 'student', role: 'student' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects a teacher trying to purchase a course', async () => {
    const { service, from } = makeService();
    await expect(
      service.createCourseCheckout(
        { id: 'teacher', role: 'teacher' },
        'course-a',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects manual payment confirmation when demo mode is disabled', async () => {
    const previous = process.env.PAYMENTS_DEMO_MODE;
    process.env.PAYMENTS_DEMO_MODE = 'false';
    try {
      const { service, from } = makeService();
      await expect(
        service.confirmCoursePayment(
          { id: 'student', role: 'student' },
          'payment-a',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(from).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.PAYMENTS_DEMO_MODE;
      else process.env.PAYMENTS_DEMO_MODE = previous;
    }
  });
});

describe('Provider-confirmed payments', () => {
  const paymentId = '11111111-1111-4111-8111-111111111111';
  const original = { ...process.env };
  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...original };
  });
  function service(institution = false) {
    process.env.PAYMENT_PROVIDER = 'cinetpay';
    process.env.CINETPAY_API_KEY = 'test';
    process.env.CINETPAY_SITE_ID = 'test';
    process.env.PUBLIC_API_URL = 'https://api.example.org';
    process.env.FRONTEND_URL = 'https://example.org';
    const row = {
      id: paymentId,
      user_id: 'student',
      course_id: 'course',
      status: 'pending',
      amount_fcfa: 10000,
    };
    const update = jest.fn().mockReturnThis();
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      update,
      maybeSingle: jest.fn(),
    };
    chain.maybeSingle.mockResolvedValue({ data: row, error: null });
    const empty = {
      ...chain,
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    const rpc = jest.fn().mockResolvedValue({ data: null, error: null });
    const svc = new PaymentsService({
      client: {
        from: jest.fn((t) => (institution && t === 'payments' ? empty : chain)),
        rpc,
      },
    } as any);
    return { svc, rpc, update };
  }
  it.each([
    [9999, 'XAF'],
    [10000, 'XOF'],
  ])(
    'does not activate a transaction with mismatched amount or currency (%s %s)',
    async (a, c) => {
      const { svc, rpc } = service();
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '00',
          data: { status: 'ACCEPTED', amount: String(a), currency: c },
        }),
      } as any);
      expect(
        await svc.handleCinetPayWebhook(paymentId.replace(/-/g, '')),
      ).toMatchObject({ paid: false });
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it.each([false, true])(
    'uses an atomic database confirmation for course/institution (%s)',
    async (institution) => {
      const { svc, rpc } = service(institution);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          code: '00',
          data: { status: 'ACCEPTED', amount: '10000', currency: 'XAF' },
        }),
      } as any);
      expect(
        await svc.handleCinetPayWebhook(paymentId.replace(/-/g, '')),
      ).toMatchObject({ paid: true });
      expect(rpc).toHaveBeenCalledWith(
        institution ? 'confirm_institution_payment' : 'confirm_course_payment',
        { payment: paymentId },
      );
    },
  );
  it('blocks card initialization until explicitly enabled and never invents billing data', () => {
    const { svc } = service();
    expect(() =>
      (svc as any).checkoutCustomer({ paymentMethod: 'card' }),
    ).toThrow();
    process.env.CINETPAY_CARD_ENABLED = 'true';
    expect(() =>
      (svc as any).checkoutCustomer({ paymentMethod: 'card' }),
    ).toThrow();
  });
});

describe('Checkout recovery', () => {
  it('reuses an existing provider page without initiating another payment', async () => {
    const svc = new PaymentsService({ client: {} } as any);
    const initialize = jest.spyOn(svc as any, 'initializeCinetPayCheckout');
    expect(
      await (svc as any).reuseCheckout(
        'payments',
        {
          id: 'test',
          checkout_url: 'https://checkout.cinetpay.com/test',
          checkout_channel: 'MOBILE_MONEY',
        },
        { customer: { channels: 'MOBILE_MONEY' } },
      ),
    ).toEqual({ paymentUrl: 'https://checkout.cinetpay.com/test' });
    expect(initialize).not.toHaveBeenCalled();
  });
  it('does not create a second channel while another payment is pending', async () => {
    const svc = new PaymentsService({ client: {} } as any);
    await expect(
      (svc as any).reuseCheckout(
        'payments',
        {
          id: 'test',
          checkout_url: 'https://checkout.cinetpay.com/test',
          checkout_channel: 'MOBILE_MONEY',
        },
        { customer: { channels: 'CREDIT_CARD' } },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
