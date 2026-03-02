import { Controller, Get, Post, Body, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService, CreateBotDto } from './marketplace.service';
import { JwtAuthGuard, Public } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Public()
  @Get('bots')
  @ApiOperation({ summary: 'Browse marketplace listings' })
  listBots(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.marketplaceService.getMarketplaceListing({ page, limit: Math.min(limit, 100), search, categoryId, sortBy });
  }

  @Public()
  @Get('bots/:slug')
  @ApiOperation({ summary: 'Get bot detail page' })
  getBotBySlug(@Param('slug') slug: string) {
    return this.marketplaceService.getBotBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @ApiBearerAuth()
  @Post('seller/bots')
  @ApiOperation({ summary: 'Create new bot listing (seller only)' })
  createBot(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateBotDto) {
    return this.marketplaceService.createBot(user.sellerId!, user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller')
  @ApiBearerAuth()
  @Post('seller/bots/:botId/track-record')
  @ApiOperation({ summary: 'Submit trade history for verification' })
  submitTrackRecord(
    @CurrentUser() user: CurrentUserPayload,
    @Param('botId') botId: string,
    @Body('trades') trades: any[],
  ) {
    return this.marketplaceService.submitTrackRecord(botId, user.sub, trades);
  }
}
