import {
    CallHandler,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TCachedUser } from './utils/types';
import { decrypt } from './utils';

@Injectable()
export class DecryptQueryInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const user: TCachedUser = request.user;

        // console.log('User from AdminGuard in Interceptor:', user, request.query, request.url);

        const queryObj = { ...request.query };
        const baseUrl = (request.url as string).split('?')[0].toLowerCase();

        const isQueryPresent = Object.keys(queryObj).length > 0;
        const isOthers = baseUrl.includes('others');
        const isPublic = baseUrl.includes('public');
        const isMembership = baseUrl.includes(`/me/account/${process.env.STRIPE_PASS_TOKEN}/membership`);

        if (isQueryPresent && !isOthers && !isPublic && !isMembership) {
            const value = Object.keys(queryObj).join('');
            // console.log('Encrypted query value:', value);

            if (this.isEncrypted(value)) {
                try {
                    const decrypted = decrypt(value); // returns string

                    // Expected format: "<payload><#>userId@timestamp@backend"
                    const parts = decrypted.split('<#>');
                    if (parts.length !== 2) {
                        throw new HttpException(
                            'Invalid encrypted query format',
                            HttpStatus.BAD_REQUEST
                        );
                    }

                    const [payload, meta] = parts;
                    const [userId, timestamp, backend] = meta.split('@');

                    const futureTime = new Date(+timestamp).getTime();

                    if (!userId || !timestamp || isNaN(futureTime) || (backend !== (process.env.BACKEND || ''))) {
                        throw new HttpException(
                            'Invalid encrypted query metadata',
                            HttpStatus.BAD_REQUEST
                        );
                    }

                    if (userId !== user.id || Date.now() > futureTime || (backend !== (process.env.BACKEND || ''))) {
                        throw new HttpException(
                            'Invalid or expired encrypted query',
                            HttpStatus.UNAUTHORIZED
                        );
                    }

                    const parsed = JSON.parse(payload); // now it's an object
                    request.query = parsed; // overwrite with object, not string
                    // console.error('Decryption pass:', parsed);

                } catch (err: any) {
                    console.error('Decryption failed:', err.message);
                    throw err instanceof HttpException
                        ? err
                        : new HttpException(
                            'Failed to decrypt query',
                            HttpStatus.BAD_REQUEST
                        );
                }
            } else {
                // Example: fallback for non-encrypted query
                request.query['offset'] = '0';
            }
        }

        return next.handle(); // continue to controller only if no exception
    }

    private isEncrypted(value: string): boolean {
        // naive check: valid Base64 format and length multiple of 4
        return /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
    }
}
