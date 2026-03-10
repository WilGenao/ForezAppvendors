// apps/api/src/marketplace/moderation.controller.ts
// Endpoints for bot moderation lifecycle
import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { SubmitForReviewDto } from './dto/submit-review.dto';
import { ModerateBotsDto } from '../admin/dto/moderate-bot.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

// ─── Seller endpoints ────────────────────────────────────────────────────────

@ApiTags('bots / moderation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'bots', version: '1' })
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * POST /bots/:id/submit-review
   * Seller submits their bot for admin review.
   */
  @Post(':id/submit-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit a bot for moderation review (seller only)' })
  @ApiParam({ name: 'id', description: 'Bot UUID' })
  submitForReview(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) botId: string,
    @Body() dto: SubmitForReviewDto,
  ) {
    return this.moderationService.submitForReview(botId, user.sub, dto.notes);
  }
}

// ─── Admin endpoints ─────────────────────────────────────────────────────────

@ApiTags('admin / bots')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'moderator')
@Controller({ path: 'admin/bots', version: '1' })
export class AdminModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  /**
   * POST /admin/bots/:id/approve
   * Admin approves a pending bot. Sets it live on the marketplace.
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a bot listing (admin only)' })
  approve(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) botId: string,
    @Body() dto: ModerateBotsDto,
  ) {
    return this.moderationService.approveBat(botId, admin.sub, dto.reason);
  }

  /**
   * POST /admin/bots/:id/reject
   * Admin rejects a bot — returns it to draft with a reason.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a bot listing (admin only)' })
  reject(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) botId: string,
    @Body() dto: ModerateBotsDto,
  ) {
    return this.moderationService.rejectBot(botId, admin.sub, dto.reason ?? 'No reason provided');
  }

  /**
   * POST /admin/bots/:id/suspend
   * Admin suspends a live bot.
   */
  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend an active bot (admin only)' })
  suspend(
    @CurrentUser() admin: JwtPayload,
    @Param('id', ParseUUIDPipe) botId: string,
    @Body() dto: ModerateBotsDto,
  ) {
    return this.moderationService.suspendBot(botId, admin.sub, dto.reason ?? 'Policy violation');
  }
}
