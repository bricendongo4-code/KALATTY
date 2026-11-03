import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformOwnerGuard } from '../agent-growth/platform-owner.guard';
import { CommerceService } from './commerce.service';
type Request = { user: { id: string } };
function page(value?: string) {
  const n = Number(value ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > 100000)
    throw new BadRequestException('Page invalide.');
  return n;
}
export function dateRange(from?: string, to?: string) {
  const current = new Date(),
    defaultFrom = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-01`;
  const valid = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v;
  const a = from ?? defaultFrom,
    b =
      to ??
      new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))
        .toISOString()
        .slice(0, 10);
  if (!valid(a) || !valid(b) || a >= b)
    throw new BadRequestException(
      'Période invalide : début inclus, fin exclue.',
    );
  return [`${a}T00:00:00.000Z`, `${b}T00:00:00.000Z`];
}
@Controller('commerce')
@UseGuards(AuthGuard('jwt'))
export class CommerceController {
  constructor(private readonly service: CommerceService) {}
  @Get('feedback/mine') feedback(@Req() r: Request) {
    return this.service.feedback(r.user.id);
  }
  @Post('feedback') submit(
    @Req() r: Request,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.submitFeedback(r.user.id, b);
  }
  @Get('wallet') wallet(@Req() r: Request) {
    return this.service.wallet(r.user.id);
  }
  @Post('wallet/account') account(
    @Req() r: Request,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.saveAccount(r.user.id, b);
  }
  @Post('wallet/requests') request(
    @Req() r: Request,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.requestPayout(r.user.id, b);
  }
}
@Controller('commerce/owner')
@UseGuards(AuthGuard('jwt'), PlatformOwnerGuard)
export class CommerceOwnerController {
  constructor(private readonly service: CommerceService) {}
  @Get('support') support(@Query('page') p?: string) {
    return this.service.support(page(p));
  }
  @Post('support/:id/route') route(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.route(r.user.id, id, b);
  }
  @Patch('support/:id') feedback(
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.updateFeedback(id, b);
  }
  @Get('finance') finance(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') p?: string,
  ) {
    const [a, b] = dateRange(from, to);
    return this.service.finance(a, b, page(p));
  }
  @Post('expenses') expense(
    @Req() r: Request,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.expense(r.user.id, b);
  }
  @Post('transactions/:id/fee') fee(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.providerFee(r.user.id, id, b);
  }
  @Post('expenses/:id/void') void(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.voidExpense(r.user.id, id, b);
  }
  @Patch('settings') settings(
    @Req() r: Request,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.settings(r.user.id, b);
  }
  @Post('withdrawals/:id/decision') decision(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.decidePayout(r.user.id, id, b);
  }
}
