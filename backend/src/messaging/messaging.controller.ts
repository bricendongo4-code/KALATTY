import { Body, Controller, Get, Param, Post, Patch, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
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
  @Get('institutions/:institutionId/directory')
  directory(@Req() req: RequestUser, @Param('institutionId') id: string, @Query('q') q?: string) {
    return this.service.directory(req.user, id, q);
  }
  @Post('threads')
  create(@Req() req: RequestUser, @Body() dto: CreateThreadDto) {
    return this.service.create(req.user, dto.institutionId, dto.recipientId);
  }
  @Get('threads/:threadId/messages')
  messages(@Req() req: RequestUser, @Param('threadId') id: string) {
    return this.service.messages(req.user, id);
  }
  @Patch('threads/:threadId/read')
  markRead(@Req() req: RequestUser, @Param('threadId') id: string) {
    return this.service.markRead(req.user, id);
  }
  @Post('threads/:threadId/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  attach(@Req() req: RequestUser, @Param('threadId') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.attach(req.user, id, file);
  }
  @Get('threads/:threadId/messages/:messageId/download')
  download(@Req() req: RequestUser, @Param('threadId') id: string, @Param('messageId') messageId: string) {
    return this.service.download(req.user, id, messageId);
  }
  @Post('threads/:threadId/messages')
  send(@Req() req: RequestUser, @Param('threadId') id: string, @Body() dto: SendMessageDto) {
    return this.service.send(req.user, id, dto.body);
  }
}
