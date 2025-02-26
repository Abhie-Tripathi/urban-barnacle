import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interest, InterestStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateIntendDto } from './dto/create.dto';
import { IntendDataService } from './intend.data.service';
import { QueryIntend_Dto } from './dto/search.dto';
import { Update_Dto, userSchema } from './dto/update.dto';
import { SelectedUserDetails } from 'src/utils/types';
@Injectable()
export class IntendService {
  constructor(private readonly intendDataService: IntendDataService) { }
  async createIntend(body: CreateIntendDto) {
    try {
      let status: InterestStatus = 'PENDING';
      const { event, usercheck } =
        await this.intendDataService.checkUserAndEventExist(
          body.email,
          body.eventId,
        );
      if (!event) {
        throw new HttpException('event not found', HttpStatus.NOT_FOUND);
      }

      // if (event.registration === false) {
      //   return { data: { message: 'registration closed.' } };
      // }

      if (event.capacity > 0 || event.capacity === -1) {
        status = event.approval ? 'PENDING' : 'CONFIRMED';

        if (status == 'CONFIRMED') {
          await this.intendDataService.updateEvent(
            {
              capacity: event.capacity - 1,
            },
            event.id,
          );
        }
      } else if (event.approval == true || event.approval == false) {
        status = event.waitlisting ? 'WAITLISTING' : 'FOLLOWING';
      }

      let userid: string = usercheck?.id ?? '';
      let userAccountId: string = event.User.accounts[0].id ?? '';
      if (!usercheck) {
        const userCreate = await this.intendDataService.createUser({
          email: body.email,
          firstname: body.firstname,
          lastname: body.lastname,
          role: 'CUSTOMER',
        });
        userid = userCreate.id;
        // userAccountId = userCreate.accountId;
      } else if (usercheck.currentOnboardingState === 'PROMOTED_USER') {
        const userUpdate = await this.intendDataService.updateUser({
          id: usercheck.id,
          firstname: body.firstname,
          lastname: body.lastname,
        });
        userid = userUpdate.id;
      }
      if (
        body.status &&
        body.note &&
        body.note === 'admin@eventgeni.admin.com'
      ) {
        status = 'INVITATION';
      }
      if (body.interest && body.interest === 'ORGANISER') {
        body.interest = 'SPONSOR';
      }
      let interestId: string = '';
      const check = await this.intendDataService.checkEventInterestExist({
        eventId: body.eventId,
        sourceModule: 'PROMOTED_EVENT',
        interest: body.interest as Interest,
        interestedUserId: userid,
        accountId: userAccountId,
      });
      interestId = check?.id ?? '';
      // console.log('intend1', interestId, body.note);

      if (!check) {
        const userInteres =
          await this.intendDataService.createUserEventInterest({
            account: { connect: { id: userAccountId } },
            sourceModule: 'PROMOTED_EVENT',
            interestedUser: { connect: { id: userid } },
            eventId: body.eventId,
            interest: body.interest as Interest,
            status: status,
            note: body.note,
            modifiedBy: userid,
          });
        interestId = userInteres.id;
      } else if (body.note !== 'admin@eventgeni.admin.com') {
        throw new HttpException(
          `user has already registered with current status of ${check.status}`,
          HttpStatus.AMBIGUOUS,
        );
      }
      if (body.note !== 'admin@eventgeni.admin.com') {
        this.intendDataService.createjob(
          event.id,
          userid,
          {
            eventRedirectUrl: body.redirectUrl,
            userShowedInterestType: body.interest,
            sourceId: interestId
          },
          true,
        );
      }
      return { data: { message: 'intend captured', id: interestId } };
    } catch (error) {
      console.error(JSON.stringify(error + ''));
      return {
        error,
      };
    }
  }
  async getIntend(query: QueryIntend_Dto, user: SelectedUserDetails) {
    try {
      if (!query.eventId && !query.widgetId) {
        throw new HttpException(
          'eventId/widgetId is required.',
          HttpStatus.EXPECTATION_FAILED,
        );
      }
      const where: object = {};
      const whereSql: string[] = [];
      where['accountId'] = user.accountId;
      whereSql.push(` "accountId" ='${user.accountId}' `);
      if (query.interest) {
        where['interest'] = query.interest;
        whereSql.push(` interest ='${query.interest}' `);
      }
      if (query.eventId) {
        where['eventId'] = query.eventId;
        whereSql.push(` "eventId" ='${query.eventId}'`);
      }
      //   if (query.widgetId) {
      //     where['sorceId'] = query.widgetId;
      //     whereSql.push(` "sorceId" ='${query.widgetId}' `);
      //   }
      if (query.status) {
        where['status'] = query.status.toUpperCase();
        whereSql.push(` status ='${query.status.toUpperCase()}' `);
      }
      if (!query.sortType) {
        query.sortType = 'desc';
      }
      if (query.name) {
        where['interestedUser'] = {
          OR: [
            { firstname: { contains: query.name, mode: 'insensitive' } },
            { email: { contains: query.name, mode: 'insensitive' } },
          ],
        };
      }
      const { count, stats, userInterest } =
        await this.intendDataService.findIntendData(
          where,
          whereSql,
          Number(query.limit),
          Number(query.offset),
          query.sortType,
          query.eventId,
        );
      console.log({ userInterest });
      // const userTime: { [index: string]: object } = {};
      const userId: string[] = userInterest.map((val) => {
        // userTime[val.userId] = {
        //   registeredTime: val.created,
        //   interestId: val.id,
        // };
        return val.interestedUserId;
      });
      console.log('userId-->', userId);
      const sortByOptions: object = {};
      if (query.sortBy && query.sortType) {
        sortByOptions['orderBy'] = { [query.sortBy]: query.sortType };
      }
      const userDetails = await this.intendDataService.findManyUser(
        userId,
        sortByOptions,
      );
      const dataToreturn: any = [];
      if (['firstname', 'lastname', 'email'].includes(query.sortBy ?? 'aa')) {
        for (const key of userDetails) {
          const userinterest = userInterest.find(
            (user) => user.interestedUserId === key.id,
          );
          if (userinterest) {
            dataToreturn.push({
              userId: key.id,
              firstname: key.firstname,
              lastname: key.lastname,
              email: key.email,
              created: userinterest.createdAt,
              interestId: userinterest.id,
              status: userinterest.status,
            });
          }
        }
      } else {
        for (const key of userInterest) {
          const user = userDetails.find(
            (user) => user.id === key.interestedUserId,
          );
          if (user) {
            dataToreturn.push({
              userId: user.id,
              firstname: user.firstname,
              lastname: user.lastname,
              email: user.email,
              created: key.createdAt,
              interestId: key.id,
              status: key.status,
            });
          }
        }
      }
      return {
        data: {
          totalUser: count.length,
          stats: stats.map((val) => {
            return { status: val.status, count: Number(val.count) };
          }),
          users: dataToreturn,
        },
      };
    } catch (error) {
      console.error(JSON.stringify(error + ''));
      return { error };
    }
  }
  async updateIntend(body: Update_Dto) {
    try {
      const updateInterest = await this.intendDataService.updateEventInterest(
        {},
        body.status as InterestStatus,
        body.id,
      );
      if (!body.firstname && !body.lastname) {
        this.intendDataService.createjob(
          updateInterest.eventId,
          updateInterest.interestedUser.id,
          {
            eventRedirectUrl: body.redirectUrl,
            userShowedInterestType: updateInterest.interest,
            sourceId: updateInterest.id
          },
          false,
        );
      }
      if (body.firstname) {
        const user = userSchema.parse(await this.intendDataService.updateUser({
          firstname: body.firstname,
          lastname: body.lastname ?? '',
          id: updateInterest.interestedUser.id
        }));
        return {
          data: {
            message: 'intend updated',
            data: { ...updateInterest, interestedUser: user },
          },
        };
      }
      return { data: { message: 'intend updated', data: updateInterest } };
    } catch (error) {
      console.error(JSON.stringify(error + ''));
      return {
        error,
      };
    }
  }
}
