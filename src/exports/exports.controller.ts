import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, OptionalAuthGuard } from 'src/user/auth/guard';
import { GetUser } from 'src/user/decorator';
import { TCachedUser } from 'src/utils/types';
import { CreateExportDto } from './dto';
import { ExportsService } from './exports.service';
import { FastifyReply } from 'fastify';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportService: ExportsService) {}

  @UseGuards(AuthGuard)
  @Post()
  async createExport(
    @Body() dto: CreateExportDto,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const createdExport = await this.exportService.createExport(dto, user);
      return { data: { export: createdExport } };
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Get(':exportId')
  async getExport(
    @Param('exportId') exportId: string,
    @GetUser() user: TCachedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      await this.exportService.getExport(user, exportId, reply);
    } catch (error) {
      return { error };
    }
  }

  @UseGuards(AuthGuard)
  @Delete(':exportId')
  async deleteExport(
    @Param('exportId') exportId: string,
    @GetUser() user: TCachedUser,
  ) {
    try {
      const deletedExport = await this.exportService.deleteExport(
        exportId,
        user,
      );
      return { data: deletedExport };
    } catch (error) {
      return { error };
    }
  }
}
