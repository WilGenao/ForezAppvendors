import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export interface ApiKeyPayload { userId: string; keyId: string; scopes: string[]; }
export const ApiKeyUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): ApiKeyPayload => ctx.switchToHttp().getRequest().apiKeyUser);
