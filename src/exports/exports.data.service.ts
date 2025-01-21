import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateExportDto, UpdateExportDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { SharedService } from 'src/shared/shared.service';
import { TCachedUser } from 'src/utils/types';
import { EventsDataService } from 'src/events/events.data.service';
import { FastifyReply } from 'fastify';
import { Export, Prisma } from '@prisma/client';
import { GetMyExportsDto } from 'src/user/me/dto';
@Injectable()
export class ExportDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly sharedService: SharedService,
    private readonly eventDataService: EventsDataService,
  ) {}

  async createExport(dto: CreateExportDto, user: TCachedUser) {
    const queryDto = dto.parameters;
    const nonEmptyParams = Object.keys(queryDto).reduce(
      (acc, key) => {
        if (
          (typeof queryDto[key] === 'string' && queryDto[key]) ||
          (typeof queryDto[key] === 'object' &&
            Object.keys(queryDto[key]).length > 0)
        ) {
          acc[key] = queryDto[key];
        }
        return acc;
      },
      {} as Record<string, any>,
    );
    const validParams =
      await this.sharedService.convertSlugParamsToIds(nonEmptyParams);

    const exportData = await this.prisma.export.create({
      data: {
        ...dto,
        // exportStatus: 'PROCESSING',
        userId: user.id,
        accountId: user.accountId,
        exportFileType: dto.format,
        inputData: { ...validParams, name: dto.name },
      },
    });

    this.eventDataService
      .createEventExport(exportData)
      .then(({ filename }) => {
        this.updateExport({ id: filename, exportStatus: 'COMPLETED' });
      })
      .catch((error) => {
        this.updateExport({
          id: error.message.filename,
          exportStatus: 'PENDING',
        });
      });

    return { data: { exportData } };
  }

  async getExports(user: TCachedUser, params: GetMyExportsDto) {
    const { limit, offset, ...rest } = params;
    const where: Prisma.ExportWhereInput = {
      userId: user.id,
      accountId: user.accountId,
      ...rest,
    };
    if (params.name) {
      where.inputData = {
        path: ['name'],
        string_contains: params.name,
      };
    }
    const exports = await this.prisma.export.findMany({
      where,
      skip: offset,
      take: limit,
    });
    return exports;
  }

  async getExport(user: TCachedUser, exportId: string) {
    const exportData = await this.prisma.export.findUnique({
      where: { id: exportId, userId: user.id, accountId: user.accountId },
    });
    if (!exportData) {
      throw new HttpException('Export not found', HttpStatus.NOT_FOUND);
    }
    return exportData;
  }

  async getExportData(
    user: TCachedUser,
    exportData: Export,
    reply: FastifyReply,
  ) {
    this.eventDataService.getExport(exportData.id, reply);
  }

  async updateExport(params: UpdateExportDto) {
    const { id, ...data } = params;
    return await this.prisma.export.update({
      where: { id },
      data,
    });
  }
}
