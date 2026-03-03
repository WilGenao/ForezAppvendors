import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';
declare const ApiKeyStrategy_base: new (...args: any[]) => Strategy;
export declare class ApiKeyStrategy extends ApiKeyStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(req: Request): Promise<import("../../common/decorators/api-key-user.decorator").ApiKeyPayload>;
}
export {};
