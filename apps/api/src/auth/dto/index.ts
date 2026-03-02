// src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'trader@example.com' })
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Mínimo 8 chars, 1 mayúscula, 1 número, 1 símbolo',
  })
  @IsString()
  @MinLength(8, { message: 'Contraseña mínimo 8 caracteres' })
  @MaxLength(72, { message: 'Contraseña máximo 72 caracteres (límite bcrypt)' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, {
    message: 'Contraseña debe tener al menos 1 mayúscula, 1 número y 1 símbolo',
  })
  password: string;
}

// ────────────────────────────────────────────────────────────────
// src/auth/dto/login.dto.ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({ example: 'trader@example.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

// ────────────────────────────────────────────────────────────────
// src/auth/dto/refresh-token.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ────────────────────────────────────────────────────────────────
// src/auth/dto/enable-2fa.dto.ts
import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ example: '123456', description: 'Código TOTP de 6 dígitos' })
  @IsString()
  @Length(6, 6, { message: 'El código TOTP debe tener exactamente 6 dígitos' })
  totpCode: string;
}

// ────────────────────────────────────────────────────────────────
// src/auth/dto/verify-2fa.dto.ts
import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2FADto {
  @ApiProperty({ description: 'Token temporal obtenido en el login' })
  @IsString()
  @IsNotEmpty()
  tempToken: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  totpCode: string;
}

// ────────────────────────────────────────────────────────────────
// src/auth/dto/auth-tokens-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 900, description: 'Segundos hasta expiración del access token' })
  expiresIn: number;
}
