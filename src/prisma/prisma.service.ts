import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// import logger from './logger';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy{
  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
        {
          emit: 'event',
          level: 'error',
        },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.$on('query' as never,(event: { query: string; params: string; duration: number }) => {
      // console.log('Query:', event.query);
      // console.log('Params:', event.params);
      // console.log('Duration:', event.duration, 'ms');
    //   logger.info(`Query: ${event.query}`);
    //   logger.info(`Params: ${event.params}`);
    //   logger.info(`Duration: ${event.duration}ms`);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}