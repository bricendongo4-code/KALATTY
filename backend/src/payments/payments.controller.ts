import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CourseCheckoutDto, InstitutionCheckoutDto } from './dto/checkout.dto';

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

  @Get('plans')
  getPlans() {
    return this.paymentsService.getPlans();
  }

  @Get('mine')
  getMyPayments(@Req() req: RequestUser) {
    return this.paymentsService.getMyPayments(req.user);
  }

  @Get('teacher/revenue-summary')
  getTeacherRevenueSummary(@Req() req: RequestUser) {
    return this.paymentsService.getTeacherRevenueSummary(req.user);
  }

  @Post('course-checkout')
  createCourseCheckout(
    @Req() req: RequestUser,
    @Body() body: CourseCheckoutDto,
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

  @Post('institutions/:institutionId/checkout')
  createInstitutionCheckout(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: InstitutionCheckoutDto,
  ) {
    return this.paymentsService.createInstitutionCheckout(
      req.user,
      institutionId,
      body.planName?.trim(),
    );
  }

  @Post('institutions/:institutionId/activate-demo')
  activateInstitutionDemo(
    @Req() req: RequestUser,
    @Param('institutionId') institutionId: string,
    @Body() body: InstitutionCheckoutDto,
  ) {
    return this.paymentsService.activateInstitutionSubscription(
      req.user,
      institutionId,
      body.planName?.trim(),
    );
  }
}

@Controller('payments/cinetpay')
export class PaymentsWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('notify')
  notify(@Body() body: { cpm_trans_id?: string; transaction_id?: string }) {
    return this.paymentsService.handleCinetPayWebhook(
      body.cpm_trans_id ?? body.transaction_id,
    );
  }

  @Get('notify')
  health() {
    return { status: 'ok' };
  }
}
