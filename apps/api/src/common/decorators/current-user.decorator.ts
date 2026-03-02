import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface JwtPayload { sub: string; email: string; roles: string[]; iat: number; exp: number; }
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => ctx.switchToHttp().getRequest().user);
