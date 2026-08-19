import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import type { CatalogCategory } from './catalog.types';

@Controller('catalog')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Public()
  @Get('trailer')
  getTrailer(
    @Query('ref') ref?: string,
    @Query('title') title?: string,
  ) {
    return this.catalogService.getTrailer(ref, title);
  }

  @Public()
  @Get()
  find(
    @Query('category') category: CatalogCategory = 'MOVIE',
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
  ) {
    return this.catalogService.find(category, search, page);
  }
}
