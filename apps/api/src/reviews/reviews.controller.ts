// apps/api/src/reviews/reviews.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller({ path: 'bots', version: '1' })
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /bots/:id/reviews
   * Create a review for a bot. Requires JWT + must be a buyer.
   */
  @Post(':id/reviews')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Submit a review for a bot (buyers only)' })
  @ApiParam({ name: 'id', description: 'Bot UUID' })
  create(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) botId: string,
    @Body() dto: CreateReviewDto,
  ) {
    // Override botId from route param (canonical)
    return this.reviewsService.create(user.sub, { ...dto, botId });
  }

  /**
   * GET /bots/:id/reviews
   * Public — lists all moderated reviews for a bot.
   */
  @Get(':id/reviews')
  @ApiOperation({ summary: 'List reviews for a bot' })
  @ApiParam({ name: 'id', description: 'Bot UUID' })
  listForBot(
    @Param('id', ParseUUIDPipe) botId: string,
    @Query() query: ListReviewsQueryDto,
  ) {
    return this.reviewsService.listForBot(botId, query.page, query.limit);
  }

  /**
   * GET /bots/:id/rating
   * Public — returns aggregated rating + distribution. Redis-cached.
   */
  @Get(':id/rating')
  @ApiOperation({ summary: 'Get aggregated rating for a bot (cached)' })
  @ApiParam({ name: 'id', description: 'Bot UUID' })
  getRating(@Param('id', ParseUUIDPipe) botId: string) {
    return this.reviewsService.getRating(botId);
  }

  /**
   * POST /bots/reviews/:reviewId/helpful
   * Mark a review as helpful. Idempotent per user.
   */
  @Post('reviews/:reviewId/helpful')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a review as helpful' })
  markHelpful(
    @CurrentUser() user: JwtPayload,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ) {
    return this.reviewsService.markHelpful(reviewId, user.sub);
  }
}
