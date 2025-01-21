import { Injectable } from '@nestjs/common';
import { ExportDataService } from './exports.data.service';
import { TCachedUser } from 'src/utils/types';
import { FastifyReply } from 'fastify';
import { CreateExportDto } from './dto';

@Injectable()
export class ExportsService {
  constructor(private readonly exportDataService: ExportDataService) {}

  async createExport(dto: CreateExportDto, user: TCachedUser) {
    const exportData = await this.exportDataService.createExport(dto, user);
    return exportData;
  }

  async getExport(user: TCachedUser, exportId: string, reply: FastifyReply) {
    const exportData = await this.exportDataService.getExport(user, exportId);
    return exportData;
  }

  async getExportData(
    user: TCachedUser,
    exportId: string,
    reply: FastifyReply,
  ) {
    const exportData = await this.exportDataService.getExport(user, exportId);
    this.exportDataService.getExportData(user, exportData, reply);
  }

  async deleteExport(exportId: string, user: TCachedUser) {
    const exportData = await this.exportDataService.getExport(user, exportId);
    await this.exportDataService.updateExport({
      id: exportData.id,
      deleted: true,
    });
    return { message: 'Export deleted successfully' };
  }
}
