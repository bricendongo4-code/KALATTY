import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';

type RequestUser = {
  user: {
    id: string;
    role?: string;
  };
};

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('course-checkout')
  createCourseCheckout(
    @Req() req: RequestUser,
    @Body() body: { courseId?: string },
  ) {
    return this.paymentsService.createCourseCheckout(
      req.user,
      body.courseId?.trim(),
    );
  }

  @Post(':paymentId/confirm-demo')
  confirmDemoPayment(
    @Req() req: RequestUser,
    @Param('paymentId') paymentId: string,
  ) {
    return this.paymentsService.confirmCoursePayment(req.user, paymentId);
  }
}
