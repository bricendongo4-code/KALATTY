import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateStudioProjectDto } from './dto/create-studio-project.dto';
import { StudioAiDto } from './dto/studio-ai.dto';
import { UpdateStudioProjectDto } from './dto/update-studio-project.dto';
import { StudioService } from './studio.service';

type RequestUser = { user: { id: string; role?: string } };

@Controller('studio')
@UseGuards(AuthGuard('jwt'))
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Get('projects')
  list(@Req() req: RequestUser) {
    return this.studioService.list(req.user);
  }

  @Post('projects')
  create(@Req() req: RequestUser, @Body() body: CreateStudioProjectDto) {
    return this.studioService.create(req.user, body);
  }

  @Get('projects/:projectId')
  get(@Req() req: RequestUser, @Param('projectId') projectId: string) {
    return this.studioService.get(req.user, projectId);
  }

  @Patch('projects/:projectId')
  update(@Req() req: RequestUser, @Param('projectId') projectId: string, @Body() body: UpdateStudioProjectDto) {
    return this.studioService.update(req.user, projectId, body);
  }

  @Post('projects/:projectId/ai')
  generate(@Req() req: RequestUser, @Param('projectId') projectId: string, @Body() body: StudioAiDto) {
    return this.studioService.generate(req.user, projectId, body);
  }
}
