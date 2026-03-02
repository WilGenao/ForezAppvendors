import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post(':botId')
  @ApiOperation({ summary: 'Submit a review for a bot' })
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Param('botId') botId: string,
    @Body('rating') rating: number,
    @Body('title') title: string,
    @Body('body') body: string,
  ) { return this.reviewsService.createReview(user.sub, botId, rating, title, body); }

  @Post(':reviewId/moderate')
  @UseGuards(RolesGuard) @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Approve or reject a review' })
  moderate(
    @CurrentUser() user: CurrentUserPayload,
    @Param('reviewId') reviewId: string,
    @Body('approve') approve: boolean,
    @Body('note') note?: string,
  ) { return this.reviewsService.moderateReview(reviewId, user.sub, approve, note); }
}
