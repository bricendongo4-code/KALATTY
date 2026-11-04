import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformOwnerGuard } from '../agent-growth/platform-owner.guard';
import { AgentOrchestratorService } from './agent-orchestrator.service';
@Controller('ai-control-center/orchestration')
@UseGuards(AuthGuard('jwt'), PlatformOwnerGuard)
export class OrchestrationController {
  constructor(private readonly orchestrator: AgentOrchestratorService) {}
  @Get() status() {
    return this.orchestrator.status();
  }
  @Post('missions')
  @HttpCode(202)
  create(@Req() req: { user: { id: string } }, @Body() body: unknown) {
    return this.orchestrator.create(req.user.id, body);
  }
  @Post('configure')
  @HttpCode(200)
  configure(@Body() body: any) {
    if (
      typeof body?.enabled !== 'boolean' ||
      typeof body?.autoAssign !== 'boolean'
    )
      throw new BadRequestException('Configuration invalide.');
    return this.orchestrator.configure(body.enabled, body.autoAssign);
  }
  @Post('run')
  @HttpCode(202)
  run() {
    return this.orchestrator.requestCycle();
  }
  @Post('missions/:id/control')
  @HttpCode(200)
  control(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: any) {
    if (
      !['retry', 'cancel'].includes(body?.action) ||
      typeof body?.note !== 'string' ||
      body.note.length > 1000
    )
      throw new BadRequestException('Action ou précision invalide.');
    return this.orchestrator.control(id, body.action, body.note);
  }
}
