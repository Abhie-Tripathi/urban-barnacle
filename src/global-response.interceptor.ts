import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { FastifyReply } from 'fastify';
import { error } from 'console';
import { ZodValidationException } from 'nestjs-zod';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();

    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof ZodValidationException) {
          response.status(HttpStatus.BAD_REQUEST).send({
            error: {
              statusCode: HttpStatus.BAD_REQUEST,
              message: err.message,
              issues: err.getZodError().issues,
            },
          });
        } else {
          response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: {
              statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
              message: err.message || 'Internal Server Error',
              issues: err.issues || [],
            },
          });
        }
        // Handle unexpected errors
        console.log(err);
        throw err;
      }),
      tap((data) => {
        let errorResponse: any;
        console.log({ error: data.error });
        const error: HttpException = data.error;
        console.log({ error });
        if (data && data.error) {
          if (data.error instanceof PrismaClientValidationError) {
            errorResponse = {
              message: 'Invalid input',
              issues: data.error,
              statusCode: HttpStatus.BAD_REQUEST,
            };
          }
          // Check if the response contains an error property
          else {
            errorResponse =
              (error.getResponse() as unknown as {
                message: string;
                issues: any[];
                statusCode: number;
              }) || error;
            console.log({ errorResponse });
          }
          response
            .status(error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR)
            .send({
              error: {
                statusCode:
                  error.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR,
                message: errorResponse.message || errorResponse,
                issues: errorResponse.issues || [],
              },
            });
        } else {
          // Handle successful responses
          response.status(HttpStatus.OK).send(data);
        }
      }),
    );
  }
}
