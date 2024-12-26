import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyReply } from 'fastify';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();

    return next.handle().pipe(
      catchError((err) => {
        // Handle unexpected errors
        response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).send({
          statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: err.message || 'Internal Server Error',
        });
        throw err;
      }),
      tap((data) => {
        if (data?.error) {
          // Check if the response contains an error property
          const error = data.error;
          response
            .status(error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR)
            .send({
              statusCode:
                error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
              message: error.message || 'An error occurred',
            });
        } else {
          // Handle successful responses
          response.status(HttpStatus.OK).send({
            // statusCode: HttpStatus.OK,
            // success: true,
            data,
          });
        }
      }),
    );
  }
}
