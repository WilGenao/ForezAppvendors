import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class TransformResponseInterceptor implements NestInterceptor {
    intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown>;
}
