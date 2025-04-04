import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ExportFileType, JobStatus } from '@prisma/client';
import { QueryHttpSchema } from 'src/events/dto';

const CreateExportSchema = z.object({
  name: z.string(),
  format: z.nativeEnum(ExportFileType),
  parameters: QueryHttpSchema,
});

export class CreateExportDto extends createZodDto(CreateExportSchema) {}

const UpdateExportSchema = z.object({
  id: z.string(),
  exportStatus: z.nativeEnum(JobStatus).optional(),
  outputData: z.any().optional(),
  deleted: z.boolean().optional(),
});

export class UpdateExportDto extends createZodDto(UpdateExportSchema) {}
