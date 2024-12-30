// generateSlug : to generate a slug

import { Injectable } from '@nestjs/common';
import { JobSource } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SharedService {
  constructor(private readonly prisma: PrismaService) {}
  generateSlug(title: string) {
    return title.toLowerCase().replace(/ /g, '-');
  }
  async jobCreation(userId: string, inputData: any, source: JobSource) {
    try {
      const job = await this.prisma.requestedJob.create({
        data: {
          userId: String(userId),
          inputData: inputData,
          source: source,
        },
      });
      return { job };
    } catch (error) {
      return { error };
    }
  }
}
