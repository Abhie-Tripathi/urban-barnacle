import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserInterestService {
  constructor(private readonly prisma: PrismaService) {}
}
