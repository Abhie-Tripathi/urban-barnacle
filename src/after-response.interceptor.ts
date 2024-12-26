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

@Injectable()
export class AfterResponseInterceptor implements NestInterceptor {
  constructor(private readonly prismaService: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async () => {
        const req: RequestWithUser = context.switchToHttp().getRequest();

        const dataToSave = {
          path: req.originalUrl.split('?')[0],
          request: {
            query: req.query ?? null,
            method: req.method,
            body: req.body ?? null,
            headers: req.headers,
          } as Record<string, any>,
          user: {
            connect: { id: String(req.user.id) },
          },
        };
        await this.prismaService.userActivity.create({ data: dataToSave });
      }),
    );
  }
}
