import { Controller, Post, Get, Body, UseGuards, Query, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller({ path: 'reviews', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}
  @Get('bot/:botId') listForBot(@Param('botId') botId: string, @Query('page') page = 1, @Query('limit') limit = 10) { return this.reviewsService.listForBot(botId, +page, +limit); }
  @ApiBearerAuth() @UseGuards(AuthGuard('jwt')) @Post() create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) { return this.reviewsService.create(user.sub, dto); }
}
