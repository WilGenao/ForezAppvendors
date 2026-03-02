import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketplaceService } from './marketplace.service';
import { CreateBotDto } from './dto/create-bot.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('marketplace')
@Controller({ path: 'marketplace', version: '1' })
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('bots')
  listBots(@Query() query: ListBotsQueryDto) { return this.marketplaceService.listPublicBots(query); }

  @Get('bots/:slug')
  getBotDetails(@Param('slug') slug: string) { return this.marketplaceService.getBotDetails(slug); }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('bots')
  createBot(@CurrentUser() user: JwtPayload, @Body() dto: CreateBotDto) {
    return this.marketplaceService.createBot(user.sub, dto);
  }
}
