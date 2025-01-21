import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AccessDataService } from './access.data.service';
import { CreateAccessHttpDto, GetAccessDto, UpdateAccessHttpDto } from './dto';
import { TrackerDataService } from 'src/tracker/tracker.data.service';
import { TCachedUser } from 'src/utils/types';
import { STATUS_CODES } from 'http';

@Injectable()
export class AccessService {
  constructor(private readonly accessDataService: AccessDataService) {}

  async createAccess(user: TCachedUser, data: CreateAccessHttpDto) {
    if (data.sourceEntity === 'TRACKER' && data.sourceEntityId) {
      const [hasAccess, result] = await this.hasAccess({
        ...data,
        accountId: user.accountId,
        accessTypes: ['ADMIN', 'SUPER_ADMIN'],
        accessReceiverId: user.id,
        limit: 1,
        offset: 0,
      });
      if (!hasAccess) {
        throw new HttpException(result.message, result.status);
      }
    }
    return this.accessDataService.createAccess({
      ...data,
      accessProviderId: user.id,
      accountId: user.accountId,
    });
  }

  async getAccess(data: GetAccessDto) {
    const access = await this.accessDataService.getAccess({
      ...data,
      accountId: data.accountId,
    });
    return access;
  }

  async updateAccess(
    user: TCachedUser,
    accessId: string,
    data: UpdateAccessHttpDto,
  ) {
    const access = await this.getAccess({
      id: accessId,
      accountId: user.accountId,
      accessTypes: ['ADMIN', 'SUPER_ADMIN'],
      accessReceiverId: user.id,
      limit: 1,
      offset: 0,
    });
    if (access.length === 0) {
      throw new HttpException('Access not found', HttpStatus.NOT_FOUND);
    }
    const updatedAccess = await this.accessDataService.updateAccess(user.id, {
      ...data,
      id: access[0].id,
    });
    return updatedAccess;
  }

  async deleteAccess(user: TCachedUser, accessId: string) {
    const access = await this.getAccess({
      id: accessId,
      accountId: user.accountId,
      accessTypes: ['ADMIN', 'SUPER_ADMIN'],
      accessReceiverId: user.id,
      limit: 1,
      offset: 0,
    });
    if (access.length === 0) {
      throw new HttpException('Access not found', HttpStatus.NOT_FOUND);
    }
    await this.accessDataService.updateAccess(user.id, {
      id: accessId,
      deleted: true,
    });
    return { message: 'Access deleted successfully' };
  }

  async hasAccess(data: GetAccessDto): Promise<[boolean, Record<string, any>]> {
    if (
      !(
        data.sourceEntityId &&
        data.sourceEntity &&
        data.accessReceiverId &&
        data.accountId
      )
    ) {
      return [
        false,
        {
          message:
            'Source entity id, source entity and access receiver id are required',
          status: HttpStatus.BAD_REQUEST,
        },
      ];
    }
    const access = await this.getAccess({
      accountId: data.accountId,
      sourceEntity: data.sourceEntity,
      sourceEntityId: data.sourceEntityId,
      accessReceiverId: data.accessReceiverId,
      accessTypes: data.accessTypes,
      limit: 1,
      offset: 0,
    });
    if (access.length > 0) {
      return [true, { access }];
    }
    return [false, { message: 'Access not found' }];
  }
}
