/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
// import { IntendService } from './intend.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BodyInviteDto, QueryInvite_Dto } from './dto';
import { InviteDataService } from './invite.data.service';
import { SelectedUserDetails } from 'src/utils/types';
import { IntendService } from 'src/intend/intend.service';
@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteDataService: InviteDataService,
    private readonly intendService: IntendService,
  ) { }
  async getInvite(query: QueryInvite_Dto, user: SelectedUserDetails) {
    try {
      if (query.invites) {
        let allowcation = await this.prisma.credit.findFirst({
          where: {
            entityId: user.id,
            entityType: 'USER',
          },
        });
        if (allowcation && allowcation.updatedAt) {
          const updatedAtDate = new Date(allowcation.updatedAt);
          const twoDaysAgo = new Date();
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

          if (updatedAtDate <= twoDaysAgo) {
            allowcation = await this.prisma.credit.update({
              where: {
                id: allowcation.id,
              },
              data: {
                count: 15,
              },
            });
          }
        }

        if (!allowcation) {
          allowcation = await this.prisma.credit.create({
            data: {
              entityId: user.id,
              entityType: 'USER',
              count: 15,
              creditType: 'INVITAION',
            },
          });
        }
        return { data: { inviteCount: allowcation.count } };
      }
      let where: object = {};
      if (query.q) {
        where = {
          where: {
            email: {
              contains: query.q,
              mode: 'insensitive',
            },
          },
        };
      }
      const { count, invite } =
        await this.inviteDataService.getInviteCountAndData(
          where,
          query.limit,
          query.offset,
        );
      return { data: { totalCount: count, invite: invite } };
    } catch (error) {
      console.log(error + ' 567');
      return { error };
    }
  }
  async sendInvite(query: BodyInviteDto, user: SelectedUserDetails) {
    try {
      let allowcation = await this.inviteDataService.findAllowance(user.id);
      if (!allowcation) {
        allowcation = await this.inviteDataService.createAllowance(user.id);
      }
      const { event } = await this.inviteDataService.findEvent(query.eventId);
      let count: number = allowcation.count;
      console.log(count);
      if (!event) {
        throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
      }
      const allemails: string[] = query.emails.split(',');
      for (const email of allemails) {
        if (count <= 0) {
          break;
        }
        count--;
        const convertInterestOfevnt: object = {
          ATTENDEE: 'ATTEND',
          SPEAKER: 'SPEAK',
          EXHIBITOR: 'EXHIBIT',
          ORGANISER: 'ORGANIZE',
        };
        const { data, error } = await this.intendService.createIntend({
          email: email,
          eventId: query.eventId,
          firstname: 'Anonymous',
          lastname: '',
          interest:
            convertInterestOfevnt[
            (event?.data as any)['participationType'].toUpperCase()
            ],
          sourceId: 'widget',
          status: 'INVITATION',
          note: 'admin@eventgeni.admin.com',
          redirectUrl: query.redirectUrl,
          source: 'PROMOTE_EVENT_INVITE'
        });
        if (data && data.id) {
          const invitation = await this.inviteDataService.createInvitation(
            email,
            user.accountId,
            user.id,
            query.eventId,
          );
          // console.log(data?.id);

          this.inviteDataService.SendInvitation(
            email,
            event,
            query.redirectUrl,
            data.id,
            user.id,
            invitation.id
          );
          console.log('loop', count);
        }
      }
      await this.inviteDataService.updateAllowance(allowcation.id, count);
    } catch (error) {
      console.log(error + ' 567');

      return { error };
    }
  }
}
