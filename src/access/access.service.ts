import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AccessDataService } from './access.data.service';
import {
  CreateAccessDto,
  CreateAccessHttpDto,
  GetAccessCountDto,
  GetAccessDto,
  UpdateAccessHttpDto,
} from './dto';
import { TrackerDataService } from 'src/tracker/tracker.data.service';
import { QueueActionOptions, TCachedUser } from 'src/utils/types';
import { STATUS_CODES } from 'http';
import { UserService } from 'src/user/user.service';
import { UserDataService } from 'src/user/user.data.service';
import { User } from '@prisma/client';
import { CommunicationService } from 'src/communication/communication.service';
import { AccessEmailDataDto } from 'src/communication/bull.dto';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CompanyDataService } from 'src/user/company/company.data.service';
import { getNameFromEmail } from 'src/utils';

@Injectable()
export class AccessService {
  constructor(
    private readonly accessDataService: AccessDataService,
    private readonly userDataService: UserDataService,
    private readonly communicationService: CommunicationService,
    private readonly configService: ConfigService,
    private readonly companyDataService: CompanyDataService,
  ) { }

  async createAccess(
    user: TCachedUser,
    data: CreateAccessDto,
    sourceMetaData: Record<string, any>,
  ) {
    const { redirectQueryParams, redirectDomain, ...rest } = data;
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
    let receiver: User | null = null;
    if (data.accessReceiverId) {
      const users = await this.userDataService.getUsers({
        id: [data.accessReceiverId],
        limit: 1,
        offset: 0,
      });
      if (users.length === 0) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      receiver = users[0];
    } else if (data.accessReceiverEmail) {
      if (data.accessReceiverEmail.split('@')[1] !== user.email.split('@')[1]) {
        throw new HttpException('User domain not matched', HttpStatus.NOT_FOUND);
      }
      const users = await this.userDataService.getUsers({
        email: [data.accessReceiverEmail],
        limit: 1,
        offset: 0,
      });
      if (!users || (users && users.length === 0)) {
        const newUserPrimaryCompany = await this.companyDataService.getCompany({
          domain: data.accessReceiverEmail.split('@')[1],
        });
        const primaryDetails = newUserPrimaryCompany
          ? {
            primaryCompanyId: newUserPrimaryCompany.id,
            primaryAccountId: newUserPrimaryCompany.accountId,
          }
          : null;
        const newUser = await this.userDataService.createUser({
          source: 'ACCESS_INVITE',
          email: data.accessReceiverEmail,
          accountId: user.accountId,
          role: 'CUSTOMER',
          ...primaryDetails,
        });
        receiver = newUser;
      } else {
        const [receiverAccess, result] = await this.hasAccess({
          accessReceiverId: users[0].id,
          accessTypes: ['ADMIN', 'SUPER_ADMIN', 'USER'],
          sourceEntity: 'TRACKER',
          sourceEntityId: data.sourceEntityId,
          accountId: user.accountId,
          limit: 1,
          offset: 0,
        });
        if (receiverAccess) {
          throw new HttpException(
            'User already has access to this tracker',
            HttpStatus.CONFLICT,
          );
        }
        receiver = users[0];
      }
    }
    if (!receiver) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // const hash = createHash('sha256').digest('hex');
    // const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const access = await this.accessDataService.createAccess({
      ...rest,
      accessProviderId: user.id,
      accountId: user.accountId,
      accessReceiverId: receiver.id,
    });

    if (data.redirectQueryParams && receiver && rest.token) {
      await this.communicationService.createJobForBull(
        QueueActionOptions.SEND_TRACKER_ACCESS_EMAIL,
        {
          accessMetaData: {
            givenToUserEmail: receiver?.email,
            givenByUserEmail: user.email,
            givenByUserDesignation: user.designation,
            givenToUserName: getNameFromEmail(
              receiver.email,
              receiver.firstname,
              receiver.lastname,
            ),
            givenByUserName: getNameFromEmail(
              user.email,
              user.firstname,
              user.lastname,
            ),
          },
          redirectUrl:
            (data.redirectDomain ||
              this.configService.get('FRONTEND_URL') ||
              '') +
            '/login?' +
            data.redirectQueryParams +
            `&email=${receiver.email}&otp=${rest.token}`,
          trackerName: sourceMetaData['trackerName'] || '',
          sourceId: access.id,
        } as AccessEmailDataDto,
        user.id,
      );
    }

    return access;
  }

  async getAccess(data: GetAccessDto, includesToken: boolean = false) {
    const access = await this.accessDataService.getAccess(
      {
        ...data,
        accountId: data.accountId,
      },
      includesToken,
    );
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

  async getAccessCount(data: GetAccessCountDto) {
    const accessCount = await this.accessDataService.getAccessCount({
      ...data,
      accountId: data.accountId,
    });
    return accessCount;
  }
}
