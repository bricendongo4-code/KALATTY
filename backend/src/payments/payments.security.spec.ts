import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('Payment safety boundaries', () => {
  const makeService = () => {
    const from = jest.fn();
    const service = new PaymentsService({ client: { from } } as unknown as SupabaseService);
    return { service, from };
  };

  it('rejects a checkout without a course identifier before any database operation', async () => {
    const { service, from } = makeService();
    await expect(service.createCourseCheckout({ id: 'student', role: 'student' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects a teacher trying to purchase a course', async () => {
    const { service, from } = makeService();
    await expect(service.createCourseCheckout({ id: 'teacher', role: 'teacher' }, 'course-a'))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects manual payment confirmation when demo mode is disabled', async () => {
    const previous = process.env.PAYMENTS_DEMO_MODE;
    process.env.PAYMENTS_DEMO_MODE = 'false';
    try {
      const { service, from } = makeService();
      await expect(service.confirmCoursePayment({ id: 'student', role: 'student' }, 'payment-a'))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(from).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.PAYMENTS_DEMO_MODE;
      else process.env.PAYMENTS_DEMO_MODE = previous;
    }
  });
});
