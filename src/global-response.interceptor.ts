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
import { error } from 'console';
import { ZodValidationException } from 'nestjs-zod';
import { PrismaClientValidationError } from '@prisma/client/runtime/library';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CommunicationService } from './communication/communication.service';
import { QueueActionOptions } from './utils/types';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  constructor(private readonly communicationService: CommunicationService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();
    const request: FastifyRequest = ctx.getRequest<FastifyRequest>();
    return next.handle().pipe(
      catchError((err) => {
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
          response.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).send({
            error: {
              statusCode: err.status || HttpStatus.INTERNAL_SERVER_ERROR,
              message: err.message || 'Internal Server Error',
              issues: err.issues || [],
            },
          });
          (process.env.NODE_ENV || '').toLowerCase() === 'production'
            ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url,
                  errorType: errorType,
                  errorMessage: errorMsg,
                },
                '@10times.com',
              )
            : '';
        }
        // Handle unexpected errors
        console.log(err);
        throw err;
      }),
      tap((data) => {
        let errorResponse: any;
        // console.log({ error: data.error });
        const error: HttpException = data.error;
        console.log({ error });
        if (data && data.error) {
          let errorMsg: string = JSON.stringify(data.error);
          let errorType: string = 'HTTPError';
          if (data.error instanceof PrismaClientValidationError) {
            errorType = 'PrismaClientValidationError';
            errorResponse = {
              message: 'Invalid input',
              issues: data.error,
              statusCode: HttpStatus.BAD_REQUEST,
            };
          }
          // Check if the response contains an error property
          else {
            // console.log({ error });
            errorResponse = error.getResponse
              ? (error.getResponse() as unknown as {
                  message: string;
                  issues: any[];
                  statusCode: number;
                })
              : error;
            errorMsg = errorResponse['message'];
          }
          (process.env.NODE_ENV || '').toLowerCase() === 'production'
            ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url,
                  errorType: errorType,
                  errorMessage: errorMsg,
                },
                '@10times.com',
              )
            : '';
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