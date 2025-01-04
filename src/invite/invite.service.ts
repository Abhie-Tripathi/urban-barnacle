/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CachedUser, TCachedUser } from 'src/shared/types';
// import { IntendService } from './intend.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BodyInviteDto, QueryInvite_Dto } from './dto';
@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly email: EmailService,
    // private readonly intent: IntendService,
    private readonly configService: ConfigService,
  ) {}
  async getInvite(query: QueryInvite_Dto, user: TCachedUser) {
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
      const [count, invite] = await Promise.all([
        this.prisma.invitation.count({
          ...where,
          select: {
            email: true,
          },
        }),
        this.prisma.invitation.findMany({
          ...where,
          select: {
            email: true,
          },
          distinct: ['email'],
          take: parseInt(query.take),
          skip: parseInt(query.skip),
        }),
      ]);
      return { data: { totalCount: count.email, invite: invite } };
    } catch (error) {
      console.log(error + ' 567');

      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async sendInvite(query: BodyInviteDto, userId: TCachedUser) {
    try {
      let allowcation = await this.prisma.credit.findFirst({
        where: {
          entityId: userId.id,
          entityType: 'USER',
        },
      });
      if (!allowcation) {
        allowcation = await this.prisma.credit.create({
          data: {
            entityId: userId.id,
            entityType: 'USER',
            count: 15,
            creditType: 'INVITAION',
          },
        });
      }
      const event = await this.prisma.event.findFirst({
        where: {
          id: query.eventId,
        },
      });
      let count: number = allowcation.count;
      console.log(count);

      const allemails: string[] = query.emails.split(',');
      for (const email of allemails) {
        if (count <= 0) {
          break;
        }
        count--;
        await this.prisma.credit.update({
          where: {
            id: allowcation.id,
          },
          data: {
            count: count,
          },
        });
        // const { data, error } = await this.intent.createIntend({
        //   email: email,
        //   eventId: event?.id ?? '',
        //   firstname: 'Anonymous',
        //   lastname: '',
        //   interest:
        //     (event?.data as any)['participationType'].toUpperCase() ===
        //     'ORGANISER'
        //       ? 'SPONSOR'
        //       : (event?.data as any)['participationType'].toUpperCase(),
        //   redirectUrl: query.redirectUrl,
        //   source: 'eventgeni',
        //   sourceId: 'widget',
        //   status: 'INVITATION',
        //   note: 'admin@eventgeni.admin.com',
        // });
        // console.log(data, error);

        // if (data && data.id) {
        const invitation = await this.prisma.invitation.create({
          data: {
            email: email,
            accountId: userId.accountId,
            userId: userId.id,
            entityType: 'EVENT',
            entityId: query.eventId,
          },
        });
        // console.log(data?.id);

        // this.sendInviteEmail(email, event, query.redirectUrl, data?.id ?? '');
        console.log('loop', count);
        // }
      }
    } catch (error) {
      console.log(error + ' 567');

      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  //   async sendInviteEmail(
  //     email: string,
  //     eventData: any,
  //     redirectUrl: string,
  //     interestId: string,
  //   ) {
  //     try {
  //       const algorithm = 'aes-256-cbc';
  //       const iv = crypto.randomBytes(16);
  //       const decrypt = (encryptedText: string, key: string): string => {
  //         const parts = encryptedText.split(':');
  //         const iv = Buffer.from(parts.shift()!, 'hex');
  //         const encrypted = parts.join(':');
  //         const decipher = crypto.createDecipheriv(
  //           algorithm,
  //           Buffer.from(key, 'utf-8'),
  //           iv,
  //         );
  //         let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  //         decrypted += decipher.final('utf8');
  //         return decrypted;
  //       };
  //       const encrypt = (text: string, key: string): string => {
  //         const cipher = crypto.createCipheriv(
  //           algorithm,
  //           Buffer.from(key, 'utf-8'),
  //           iv,
  //         );
  //         let encrypted = cipher.update(text, 'utf8', 'hex');
  //         encrypted += cipher.final('hex');
  //         return iv.toString('hex') + ':' + encrypted;
  //       };
  //       const originalKey = '@k#e&y(t0)0Pen!@nd^encr!pt*';
  //       const key = crypto
  //         .createHash('sha256')
  //         .update(originalKey)
  //         .digest('base64')
  //         .slice(0, 32);
  //       const date: string[] = (
  //         new Date(eventData?.data?.['start_date']) + ''
  //       ).split(' ');
  //       const { data, error } = await this.email.intendeEmail(
  //         email,
  //         'no-reply@10times.com',
  //         `<!DOCTYPE html>
  // <html lang="en">
  //   <head>
  //     <meta charset="UTF-8" />
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  //     <style>
  //       body {
  //         font-family: Arial, sans-serif;
  //         background-color: #f4f4f4;
  //         color: #333;
  //         margin: 0;
  //         padding: 0;
  //       }

  //       .email-container {
  //         max-width: 600px;
  //         margin: 20px auto;
  //         background-color: #fff;
  //         padding: 20px;
  //         border-radius: 8px;
  //         box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  //       }

  //       .logo {
  //         text-align: center;
  //         margin-bottom: 20px;
  //       }

  //       .logo img {
  //         display: inline-block;
  //         max-width: 50px;
  //         height: auto;
  //         vertical-align: middle;
  //         margin-right: 10px;
  //       }

  //       .logo .brand {
  //         display: inline-block;
  //         font-size: 24px;
  //         font-weight: bold;
  //         color: #333;
  //       }

  //       .content {
  //         font-size: 16px;
  //         line-height: 1.5;
  //       }

  //       .event-name {
  //         font-size: 22px;
  //         font-weight: bold;
  //         text-transform: capitalize;
  //         margin-bottom: 10px;
  //       }

  //       .button,
  //       .res {
  //         background: #7b1fa2;
  //         color: #fff;
  //         padding: 12px 30px;
  //         border: none;
  //         border-radius: 5px;
  //         text-align: center;
  //         text-decoration: none;
  //         font-size: 16px;
  //         display: inline-block;
  //         margin: 15px 5px;
  //         cursor: pointer;
  //       }

  //       .button:hover,
  //       .res:hover {
  //         background: #a045ff;
  //         box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
  //         color: #fff;
  //       }

  //       .footer {
  //         font-size: 12px;
  //         color: #999;
  //         text-align: center;
  //         margin-top: 20px;
  //         border-top: 1px solid #ddd;
  //         padding-top: 10px;
  //       }

  //       .footer a {
  //         color: #007bff;
  //         text-decoration: none;
  //       }
  //     </style>
  //   </head>

  //   <body>
  //     <div class="email-container">
  //       <div class="logo">
  //         <img
  //           src="https://${this.configService.get('FRONTEND_URL')}/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fcroppedlogo.c3b754be.png&w=48&q=75"
  //           alt="Whr.ai"
  //         />
  //         <span class="brand">Whr.ai</span>
  //       </div>

  //       <!-- Email Content -->
  //       <div class="content">
  //         <p>You are invited to</p>
  //         <div class="event-name">${eventData.name}</div>

  //         <!-- Event Details -->
  //         <div class="event-details" style="border: 1px solid #999; padding: 10px; border-radius: 8px; display: block;">
  //           <div
  //             class="date-icon"
  //             style="
  //               display: inline-block;
  //               width: 40px;
  //               height: 55px;
  //               border-radius: 8px;
  //               background-color: #fff;
  //               text-align: center;
  //               border: 1px solid #464545;
  //               margin-right: 20px;
  //             "
  //           >
  //             <div class="month" style="background-color: #d6d6d6; padding: 2px 0;">${date[2]}</div>
  //             <div class="day">${date[1]}</div>
  //           </div>
  //           <div class="event-info" style="display: inline-block; vertical-align: top;">
  //             <strong>${date[0] + ', ' + date[1] + ' ' + date[2]}</strong><br />
  //             ${eventData?.data?.['start_time']} - ${eventData?.data?.['end_time']} GMT +5:30
  //           </div>

  //           <!-- Location Icon and Text -->
  //           <div class="location-icon" style="margin-top: 15px; display: block;">
  //             <div
  //               class="locationIconContainer"
  //               style="
  //                 display: inline-block;
  //                 width: 40px;
  //                 height: 55px;
  //                 border-radius: 8px;
  //                 background-color: #fff;
  //                 text-align: center;
  //                 border: 1px solid #464545;
  //                 vertical-align: top;
  //                 margin-right: 15px;
  //               "
  //             >
  //               <img
  //                 src="https://api.eventgeni.com/public/f2ee2309-e6c5-4e51-90a8-5aa0ce7c6aed.png"
  //                 alt="Location Icon"
  //                 style="width: 20px; height: 30px; margin-top: 10px;"
  //               />
  //             </div>
  //             <div class="event-info" style="display: inline-block; vertical-align: top; padding-left: 6px;">
  //                <strong>${(eventData?.data?.['location_city'].length > 1 ? eventData?.data?.['location_city'] + ', ' : '') + eventData.data['location_country']}</strong>
  //             </div>
  //           </div>
  //         </div>
  //       </div>

  //       <!-- Buttons -->
  //       <div style="text-align: center;">
  //         <a href="${redirectUrl + '?' + encrypt(`email=${email}&onClicked=yes&id=${interestId}`, key)}" class="res" style="color: #fff;">Accept Invite</a>
  //         <a href="${redirectUrl + '?' + encrypt(`email=${email}&onClicked=no&id=${interestId}`, key)}" class="res" style="color: #fff;">Cancel Invite</a>
  //         <a href="${redirectUrl}" class="button" style="color: #fff;">Event Page</a>
  //       </div>

  //       <div class="footer">
  //         <p>
  //           <a href="#">Unsubscribe</a> from this list at any time.
  //         </p>
  //         <p>Manage Email Preferences</p>
  //         <p>Copyright © 10Times</p>
  //       </div>
  //     </div>
  //   </body>
  // </html>
  // `,
  //         `You are invited to ${eventData.name}`,
  //       );
  //       console.log(
  //         encrypt(`email=${email}&onClicked=yes&id=${interestId}`, key),
  //       );
  //     } catch (error) {
  //       console.log(error + ' 567');

  //       return {
  //         error: new HttpException(
  //           'something went wrong',
  //           HttpStatus.BAD_REQUEST,
  //         ),
  //       };
  //     }
  //   }
}
