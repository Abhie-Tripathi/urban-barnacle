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
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodValidationException } from 'nestjs-zod';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CommunicationService } from './communication/communication.service';
import { QueueActionOptions } from './utils/types';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  constructor(private readonly communicationService: CommunicationService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();
    const request: FastifyRequest = ctx.getRequest<FastifyRequest>();

    return next.handle().pipe(
      catchError((err) => {
        console.log(err);
        let errorMsg: string = err.message;
        let errorType: string = 'HTTPError';

        if (err instanceof ZodValidationException) {
          errorType = 'ZodValidationException';
          errorMsg += `\n ${JSON.stringify(err.getZodError().issues)}`;
          response.status(HttpStatus.BAD_REQUEST).send({
            error: {
              statusCode: HttpStatus.BAD_REQUEST,
              message: err.message,
              issues: err.getZodError().issues,
            },
          });
        } else {
          errorMsg += `\n ${JSON.stringify(err.issues)}`;
          const statusCode = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
          response.status(statusCode).send({
            error: {
              statusCode: statusCode,
              message: err.message || 'Internal Server Error',
              issues: err.issues || [],
            },
          });

          // Send error email only for Internal Server Error (500)
          if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
            (process.env.NODE_ENV || '').toLowerCase() === 'production'
              ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url || 'undefined',
                  errorType: errorType || 'undefined',
                  errorMessage: errorMsg || JSON.stringify(request.body) || 'undefined',
                },
                '@10times.com',
              )
              : '';
          }
        }
        throw err;
      }),
      tap((data) => {
        if (data && data.error) {
          let errorMsg: string = JSON.stringify(data.error);
          let errorType: string = 'HTTPError';
          let errorResponse: any;

          const error: HttpException = data.error;

          if (data.error instanceof PrismaClientValidationError) {
            errorType = 'PrismaClientValidationError';
            errorResponse = {
              message: 'Invalid input',
              issues: data.error,
              statusCode: HttpStatus.BAD_REQUEST,
            };
          } else {
            errorResponse = error.getResponse
              ? (error.getResponse() as unknown as { message: string; issues: any[]; statusCode: number })
              : error;
            errorMsg = errorResponse['message'];
          }

          // Send error email only for Internal Server Error (500)
          if (errorResponse.statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
            (process.env.NODE_ENV || '').toLowerCase() === 'production'
              ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url || 'undefined',
                  errorType: errorType || 'undefined',
                  errorMessage: errorMsg || JSON.stringify(request.body) || 'undefined',
                },
                '@10times.com',
              )
              : '';
          }

          response.status(errorResponse.statusCode || HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: {
              statusCode: errorResponse.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
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
