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
import { encrypt } from './utils';

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
          const queryValues = structuredClone({ ...request.query }) as Record<string, any>;
          // console.log(queryValues);
          function findCountValue(data: any): number | undefined {
            if (typeof data !== 'object' || data === null) {
              return undefined;
            }
            data = data['data'] ? data['data'] : data
            // 1. Direct "count" key check
            if (Object.prototype.hasOwnProperty.call(data, 'count')) {
              return data.count;
            }

            // 2. Check keys containing "count"
            for (const key of Object.keys(data)) {
              if (key.toLowerCase().includes('count')) {
                return data[key];
              }
            }

            return undefined;
          }

          const countInResponse = findCountValue({ ...data });
          // console.log('countInResponse:', countInResponse);

          let flagHasNext = false;
          let flagHasPrevious = false;
          let flagCreateTheEncryption = true;

          const offsetNum = Number(queryValues.offset ?? 0);
          const limitNum = Number(queryValues.limit ?? 10);
          let encryptedQuery: Record<string, string> = {};

          if (Object.keys(queryValues).length > 0 && countInResponse && countInResponse > 0) {
            // Decide if we have previous/next
            // console.log(offsetNum + limitNum, 'dfksmdfp');

            if ((offsetNum + limitNum) < countInResponse) {
              flagHasPrevious = offsetNum > 0;
              flagHasNext = true;
              // console.log(flagHasPrevious,
              // flagHasNext)
            } else if ((offsetNum + limitNum) >= countInResponse) {
              flagHasPrevious = offsetNum > 0;
            } else {
              flagCreateTheEncryption = false;
            }
            const now = Date.now();
            const twentyFourHoursLater = now + (24 * 60 * 60 * 1000);
            if (flagCreateTheEncryption && flagHasPrevious) {
              const prevQuery = { ...queryValues, offset: String(Math.max(0, offsetNum - limitNum)), limit: String(limitNum) };
              encryptedQuery['previous'] = encrypt(JSON.stringify(prevQuery) + `<#>${user.id}@${twentyFourHoursLater}@${process.env.BACKEND || ''}`);
            }

            // Create "next" link
            if (flagCreateTheEncryption && flagHasNext) {
              const nextQuery = { ...queryValues, offset: String(offsetNum + limitNum), limit: String(limitNum) };
              encryptedQuery['next'] = encrypt(JSON.stringify(nextQuery) + `<#>${user.id}@${twentyFourHoursLater}@${process.env.BACKEND || ''}`);
            }
          }

          request.query = { encryptedQuery: '' }
          response.status(HttpStatus.OK).send({ ...data, ...(Object.keys(encryptedQuery).length > 0 ? { query: encryptedQuery } : {}) });
        }
      }),
    );
  }
}
