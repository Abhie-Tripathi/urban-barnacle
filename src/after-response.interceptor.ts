import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from './prisma/prisma.service';
import { RequestWithUser } from './shared/types';
import { FastifyReply } from 'fastify';

@Injectable()
export class AfterResponseInterceptor implements NestInterceptor {
  constructor(private readonly prismaService: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async () => {
        const res: FastifyReply = context.switchToHttp().getResponse();
        const req: RequestWithUser = context.switchToHttp().getRequest();
        const path = req.originalUrl.split('?')[0];
        const pathBreakdown = path.split('/').filter((p) => p !== '');
        if (pathBreakdown.length >= 1 && pathBreakdown[0] === 'auth') {
          return;
        }
        const status = res.statusCode;
        const dataToSave = {
          path: '/' + pathBreakdown.join('/'),
          request: {
            query: req.query ?? null,
            method: req.method,
            body: req.body ?? null,
            headers: req.headers,
          } as Record<string, any>,
          user: req?.user?.id
            ? {
                connect: { id: String(req.user.id) },
              }
            : {},
          account: req?.user?.accountId
            ? {
                connect: { id: req.user.accountId },
              }
            : {},
        };
        if (
          pathBreakdown[0] === 'trackers' &&
          pathBreakdown.length === 2 &&
          status === 200
          // || (pathBreakdown.length === 1 && pathBreakdown[0] === 'events')
        ) {
          await this.prismaService.userActivity.create({
            data: dataToSave,
          });
        }
        await this.prismaService.apiLogs.create({ data: dataToSave });
      }),
    );
  }
}
