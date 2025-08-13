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
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';
import { CommunicationService } from './communication/communication.service';
import {
  QueueActionOptions,
  RequestWithUser,
  TCachedUser,
} from './utils/types';

@Injectable()
export class GlobalResponseInterceptor implements NestInterceptor {
  constructor(private readonly communicationService: CommunicationService) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const response: FastifyReply = ctx.getResponse();
    const request: RequestWithUser = ctx.getRequest();
    const user = request.user;

    return next.handle().pipe(
      catchError((err) => {
        console.log('errorerrorerrorerror00000', err);
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
            ['production', 'development'].includes(
              (process.env.NODE_ENV || '').toLowerCase(),
            )
              ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url || 'undefined',
                  errorType: errorType || 'undefined',
                  errorMessage: `${errorMsg || JSON.stringify(request.body) || 'undefined'} 
                      ${JSON.stringify({ userId: user?.id, accountId: user?.accountId })}`,
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

          const error = data.error;
          console.log('errorerrorerrorerro111r', error);
          if (error)
            if (error instanceof PrismaClientValidationError) {
              // console.log({
              //   error: error,
              //   errorKeys: Object.keys(error),
              // });
              errorType = 'PrismaClientValidationError';
              errorResponse = {
                message: 'Invalid input',
                issues: error,
                statusCode: HttpStatus.BAD_REQUEST,
              };
            } else if (error instanceof PrismaClientKnownRequestError) {
              errorType = 'PrismaClientKnownRequestError';
              errorResponse = {
                message: error.message,
                issues: error,
                statusCode: HttpStatus.BAD_REQUEST,
              };
            } else {
              if (error instanceof HttpException) {
                const e: HttpException = error;
                errorResponse = {
                  message: e.message,
                  issues: [],
                  statusCode: e.getStatus(),
                };
              } else {
                errorResponse = error;
              }
              errorMsg = errorResponse['message'];
            }

          // Send error email only for Internal Server Error (500)
          if ((errorResponse.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR) === HttpStatus.INTERNAL_SERVER_ERROR) {
            ['production', 'development'].includes(
              (process.env.NODE_ENV || '').toLowerCase(),
            )
              ? this.communicationService.createJobForBull(
                QueueActionOptions.SEND_ERROR_EMAIL,
                {
                  apiName: request.url || 'undefined',
                  errorType: errorType || 'undefined',
                  errorMessage: `${errorMsg || JSON.stringify(request.body) || 'undefined'} 
                      ${JSON.stringify({ userId: user?.id, accountId: user?.accountId })}`,
                },
                '@10times.com',
              )
              : '';
          }

          response
            .status(
              errorResponse.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
            )
            .send({
              error: {
                statusCode:
                  errorResponse.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
                message: JSON.stringify(errorResponse.message || errorResponse).toLowerCase().includes('prisma') ? 'Something went wrong.' : (errorResponse.message || errorResponse),
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
