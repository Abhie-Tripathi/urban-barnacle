import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { BullStatus, ExportFileType } from '@prisma/client';
import { QuerySchema } from 'src/events/dto';

const CreateExportSchema = z.object({
  name: z.string(),
  format: z.nativeEnum(ExportFileType),
  parameters: QuerySchema,
});

export class CreateExportDto extends createZodDto(CreateExportSchema) {}

const UpdateExportSchema = z.object({
  id: z.string(),
  exportStatus: z.nativeEnum(BullStatus).optional(),
  outputData: z.any().optional(),
  deleted: z.boolean().optional(),
});

export class UpdateExportDto extends createZodDto(UpdateExportSchema) {}
