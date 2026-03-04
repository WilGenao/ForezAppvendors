// apps/api/src/admin/admin.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { KycService } from '../kyc/kyc.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { ModerateBotsDto } from './dto/moderate-bot.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'moderator')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly kycService: KycService,
  ) {}

  // ─── Dashboard stats ────────────────────────────────────────────────────────

  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Platform overview stats' })
  getStats() {
    return this.adminService.getPlatformStats();
  }

  // ─── KYC ────────────────────────────────────────────────────────────────────

  @Get('kyc')
  @ApiOperation({ summary: 'List pending KYC submissions' })
  listKyc(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.kycService.listPending(+page, +limit);
  }

  @Post('kyc/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a KYC submission and grant seller role' })
  approveKyc(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.kycService.approve(id, admin.sub);
  }

  @Post('kyc/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a KYC submission with a reason' })
  rejectKyc(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.reject(id, admin.sub, dto.reason);
  }

  // ─── Bot moderation ─────────────────────────────────────────────────────────

  @Get('bots')
  @ApiOperation({ summary: 'List bots pending review or with anomalies' })
  listBots(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.listBotsForReview(status, +page, +limit);
  }

  @Patch('bots/:id/approve')
  @ApiOperation({ summary: 'Approve a bot (pending_review → active)' })
  approveBot(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updateBotStatus(id, 'active', admin.sub);
  }

  @Patch('bots/:id/suspend')
  @ApiOperation({ summary: 'Suspend an active bot' })
  suspendBot(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: ModerateBotsDto,
  ) {
    return this.adminService.updateBotStatus(id, 'suspended', admin.sub, dto.reason);
  }

  @Patch('bots/:id/reject')
  @ApiOperation({ summary: 'Reject a bot back to draft' })
  rejectBot(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: ModerateBotsDto,
  ) {
    return this.adminService.updateBotStatus(id, 'draft', admin.sub, dto.reason);
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @Roles('admin')
  @ApiOperation({ summary: 'List all users with roles and KYC status' })
  listUsers(@Query('search') search?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.listUsers(search, +page, +limit);
  }

  @Patch('users/:id/suspend')
  @Roles('admin')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.setUserStatus(id, 'suspended', admin.sub);
  }

  @Patch('users/:id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Reactivate a suspended user' })
  activateUser(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.setUserStatus(id, 'active', admin.sub);
  }
}
