import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GrowthService } from './growth.service';
import { PlatformOwnerGuard } from './platform-owner.guard';
import { AgentGithub } from '../ai-control-center/agent-github';
import { object, text } from './growth-model';
type Request = { user: { id: string } };
@Controller('ai-control-center/growth')
@UseGuards(AuthGuard('jwt'), PlatformOwnerGuard)
export class GrowthController {
  constructor(private readonly growth: GrowthService) {}
  @Get() @Header('Cache-Control', 'no-store') snapshot(@Req() req: Request) {
    return this.growth.snapshot(req.user.id);
  }
  @Post('settings') configure(@Req() req: Request, @Body() b: unknown) {
    return this.growth.configure(req.user.id, b);
  }
  @Post('discover') discover(@Req() req: Request) {
    return this.growth.discover(req.user.id);
  }
  @Post('leads') importLead(@Req() req: Request, @Body() b: unknown) {
    return this.growth.importLead(req.user.id, b);
  }
  @Patch('leads/:id') updateLead(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.growth.updateLead(req.user.id, id, b);
  }
  @Post('drafts') draft(@Req() req: Request, @Body() b: unknown) {
    return this.growth.createDraft(req.user.id, b);
  }
  @Patch('actions/:id') edit(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.growth.editAction(req.user.id, id, b);
  }
  @Post('actions/:id/decision') decide(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.growth.decide(req.user.id, id, b);
  }
  @Post('actions/:id/execute') execute(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() b: unknown,
  ) {
    return this.growth.dispatch(
      req.user.id,
      id,
      text(object(b).digest, 64, true),
    );
  }
  @Post('connections/github/check') async github() {
    return new AgentGithub().diagnostic();
  }
}
