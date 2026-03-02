import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'kyc', version: '1' })
export class KycController {
  constructor(private readonly kycService: KycService) {}
  @Post('submit') submit(@CurrentUser() user: JwtPayload, @Body() dto: SubmitKycDto) { return this.kycService.submit(user.sub, dto); }
  @Get('status') getStatus(@CurrentUser() user: JwtPayload) { return this.kycService.getStatus(user.sub); }
}
