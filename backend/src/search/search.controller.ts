import { Controller, Get, Header, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SearchService } from './search.service';
@Controller('search')
@UseGuards(AuthGuard('jwt'))
export class SearchController {
  constructor(private readonly searchService: SearchService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  search(
    @Req() req: { user: { id: string; role?: string } },
    @Query('q') q = '',
    @Query('scope') scope = 'learn',
  ) {
    return this.searchService.search(req.user, q, scope);
  }
}
