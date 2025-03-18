import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { File } from '@nest-lab/fastify-multer';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { PrismaService } from 'src/prisma/prisma.service';
import { AttachmentSourceModule, FileType } from '@prisma/client';
@Injectable()
export class FileCreationService {
  constructor(private prisma: PrismaService) { }
  async createFile(
    fileName: string,
    file: File,
    userId: string,
    fileType: FileType,
    sourceModule: AttachmentSourceModule,
    sourceId: string,
  ) {
    try {
      if (fileName.length < 2) {
        fileName =
          randomUUID() +
          file.originalname.substring(file.originalname.lastIndexOf('.'));
      }
      const mediaHost = process.env.MEDIA_STORAGE_DOMAIN;
      const dir = './public/temp/';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      let fileData: {
        id: string;
        fileName: string;
        fileUrl: string;
        fileType: string;
        fileSize: Number;
      } | null = null;
      if (file.buffer !== undefined) {
        await fs.promises.writeFile(dir + fileName, file.buffer);
        //   const filetype = file.mimetype.includes('pdf') ? 'PDF' : 'IMAGE';
        const upload = await this.prisma.attachment.upsert({
          where: {
            fileUrl: mediaHost + '/public/' + fileName
          },
          create: {
            fileName: file.originalname,
            fileType: fileType,
            fileSize: file.size ? file.size / 1024 : 0,
            fileUrl: mediaHost + '/public/' + fileName,
            createdByUser: { connect: { id: userId } },
            sourceModule: sourceModule,
            sourceId: sourceId,
          },
          update: {

          },
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
          },
        });
        fileData = upload;
      }
      return { fileData };
    } catch (error) {
      console.error(error);
      throw new HttpException(
        'something went wrong file not saved.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
