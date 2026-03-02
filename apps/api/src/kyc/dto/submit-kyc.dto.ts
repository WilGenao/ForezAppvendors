import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitKycDto {
  @ApiProperty({ enum: ['passport','national_id','drivers_license'] })
  @IsString() @IsIn(['passport','national_id','drivers_license'])
  documentType: string;

  @ApiProperty({ description: 'Azure Blob URL of front document' })
  @IsString() documentFrontUrl: string;

  @ApiProperty({ description: 'Azure Blob URL of back document (if applicable)' })
  @IsString() documentBackUrl: string;

  @ApiProperty({ description: 'Azure Blob URL of selfie' })
  @IsString() selfieUrl: string;
}
