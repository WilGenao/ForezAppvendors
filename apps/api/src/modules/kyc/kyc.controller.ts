import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('KYC')
@Controller('kyc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC documents for seller verification' })
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Body('documentType') documentType: string,
    @Body('documentBlobUrl') documentBlobUrl: string,
    @Body('selfieBlobUrl') selfieBlobUrl: string,
  ) {
    return this.kycService.submitKyc(user.sub, documentType, documentBlobUrl, selfieBlobUrl);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current KYC status' })
  getStatus(@CurrentUser() user: CurrentUserPayload) {
    return this.kycService.getKycStatus(user.sub);
  }

  @Post(':kycId/review')
  @UseGuards(RolesGuard)
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Approve or reject KYC (admin only)' })
  review(
    @CurrentUser() reviewer: CurrentUserPayload,
    @Param('kycId') kycId: string,
    @Body('approved') approved: boolean,
    @Body('rejectionReason') rejectionReason?: string,
  ) {
    return this.kycService.reviewKyc(kycId, reviewer.sub, approved, rejectionReason);
  }
}
