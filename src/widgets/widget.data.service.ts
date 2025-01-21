import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, WidgetStatus } from '@prisma/client';

@Injectable()
export class WidgetDataService {
  constructor(private readonly prisma: PrismaService) {}
  async widgetCountForKit(userId: string) {
    const count = await this.prisma.widget.count({
      where: {
        createdBy: userId,
        status: { in: ['active', 'draft'] },
        deleted: false,
      },
    });
    return count;
  }
  async findKit(userAccountId: string, published: boolean) {
    let whereDeleted = {};
    if (published) {
      whereDeleted = { deleted: false };
    }
    const check = await this.prisma.customBrandKit.findUnique({
      where: {
        accountId: userAccountId,
        ...whereDeleted,
      },
    });
    return check;
  }
  async createKit(data: any) {
    const create = await this.prisma.customBrandKit.create({
      data: {
        ...data,
      },
    });
    return create;
  }
  async updateKit(data: any, userAccountId: string) {
    const update = await this.prisma.customBrandKit.update({
      where: {
        accountId: userAccountId,
      },
      data: {
        ...data,
      },
    });
    return update;
  }
  async createAttachment(data: any) {
    const create = await this.prisma.attachment.create({
      data: {
        ...data,
      },
      select: {
        id: true,
      },
    });
    return create;
  }
  async checkBrandKitLog(domain: string, threeMonthsAgo: Date) {
    const [checkBrandKitExist, checkBrandKitupdate] = await Promise.all([
      this.prisma.brand.findFirst({
        where: {
          domain: domain,
          deleted: false,
          updateAt: { gte: threeMonthsAgo },
        },
      }),
      this.prisma.brand.findFirst({
        where: {
          domain: domain,
          deleted: false,
        },
      }),
    ]);
    return { checkBrandKitExist, checkBrandKitupdate };
  }
  async upsertBandKit(
    domain: string,
    finalImagePath: string,
    domainName: string,
  ) {
    const upsert = await this.prisma.brand.upsert({
      where: {
        domain: domain,
      },
      create: {
        domain: domain,
        name: domainName,
        logoUrl: finalImagePath,
      },
      update: {
        logoUrl: finalImagePath,
      },
    });
    return upsert;
  }
  async deleteEventFromWidget(eventId: string[], widgetId: string) {
    const deleteEvent = await this.prisma.$executeRaw(
      Prisma.raw(
        `
                   DELETE FROM "_EventToWidget" 
         WHERE "A" IN ('${eventId.join("','")}') And
         "B" = '${widgetId}';
                   `,
      ),
    );
    return deleteEvent;
  }
  async updateWidget(widgetId: string, published: boolean, data: any) {
    if (published === false) {
      const deleteEvent = await this.prisma.$executeRaw(
        Prisma.raw(
          `
                          DELETE FROM "_EventToWidget" 
                WHERE "B" = '${widgetId}';
                          `,
        ),
      );
    }
    const updateWidget = await this.prisma.widget.update({
      where: {
        id: widgetId,
      },
      data: {
        ...data,
      },
      select: {
        id: true,
      },
    });
    return updateWidget;
  }
  async createWidget(data: any) {
    const create = await this.prisma.widget.create({
      data: {
        ...data,
      },
    });
    return create;
  }
  async getWidgetCount(userAccountId: string, status: WidgetStatus) {
    const count = await this.prisma.widget.count({
      where: {
        accountId: userAccountId,
        status: status,
        deleted: false,
      },
      select: {
        id: true,
      },
    });
    return count;
  }
  async findManyWidget(
    userAccountId: string,
    status: WidgetStatus,
    limit: number,
    offset: number,
  ) {
    const data = await this.prisma.widget.findMany({
      where: {
        accountId: userAccountId,
        status: status,
        deleted: false,
      },
      select: {
        id: true,
        type: true,
        status: true,
        customizationData: true,
        templatePublicId: true,
        otherData: true,
        domain: true,
        eventId: {
          select: {
            id: true,
          },
        },
      },
      take: limit,
      skip: offset,
    });
    return data;
  }
  async findUniqueWidget(where: any, select: any) {
    const data = await this.prisma.widget.findUnique({
      where: {
        ...where,
      },
      select: {
        id: true,
        type: true,
        status: true,
        customizationData: true,
        templatePublicId: true,
        otherData: true,
        domain: true,
        eventId: {
          select: {
            id: true,
            ...select,
          },
        },
      },
    });
    return data;
  }
}
