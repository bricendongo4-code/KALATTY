import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { MessagingService } from './messaging.service';

class CreateThreadDto {
  @IsUUID() institutionId!: string;
  @IsUUID() recipientId!: string;
}
class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(4000) body!: string;
}
type RequestUser = { user: { id: string } };

@Controller('messaging')
@UseGuards(AuthGuard('jwt'))
export class MessagingController {
  constructor(private readonly service: MessagingService) {}
  @Get('institutions/:institutionId/threads')
  list(@Req() req: RequestUser, @Param('institutionId') id: string) {
    return this.service.list(req.user, id);
  }
  @Post('threads')
  create(@Req() req: RequestUser, @Body() dto: CreateThreadDto) {
    return this.service.create(req.user, dto.institutionId, dto.recipientId);
  }
  @Get('threads/:threadId/messages')
  messages(@Req() req: RequestUser, @Param('threadId') id: string) {
    return this.service.messages(req.user, id);
  }
  @Post('threads/:threadId/messages')
  send(@Req() req: RequestUser, @Param('threadId') id: string, @Body() dto: SendMessageDto) {
    return this.service.send(req.user, id, dto.body);
  }
}
