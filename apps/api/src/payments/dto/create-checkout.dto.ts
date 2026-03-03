import { IsUUID, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty() @IsUUID() botListingId: string;
  @ApiProperty({ enum: ['subscription_monthly','subscription_yearly','one_time'] })
  @IsString() @IsIn(['subscription_monthly','subscription_yearly','one_time'])
  listingType: string;
}
