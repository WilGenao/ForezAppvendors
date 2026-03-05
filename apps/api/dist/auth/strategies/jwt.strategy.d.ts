import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private usersService;
    constructor(config: ConfigService, usersService: UsersService);
    validate(payload: {
        sub: string;
        email: string;
        roles: string[];
    }): Promise<{
        sub: string;
        email: string;
        roles: import("../../common/decorators/roles.decorator").AppRole[];
    }>;
}
export {};
