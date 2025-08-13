import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AuthGuard } from '../auth/guard';
import { GetUser } from '../decorator';
import { TCachedUser } from 'src/utils/types';
import { GetEnquiriesDto, GetEnquiriesHttpDto } from 'src/enquiry/dto';
import { GetUserHttpDto } from '../dto';
import { FastifyRequest } from 'fastify';
import {
  AccountConfigDto,
  FilterConfigurationDto,
  InterestConfigurationDto,
  MembershipDto,
  membershipSchema,
  OutreachConfigurationDto,
  UpdateCurrentMembershipDto,
  updateMembershipSchema,
} from './account.config';
import {
  AccountConfigKey,
  GetAccountEnquiriesCountDto,
  GetBookmarkedEventDto,
  UpdateSubscriptionWebhookDto,
} from './dto';
import { ZodError } from 'zod';

@Controller('me/account')
export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @UseGuards(AuthGuard)
  @Get('company')
  async getAccountCompany(@GetUser() user: TCachedUser) {
    try {
      const company = await this.accountService.getAccountCompany(user);
      return { data: company };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('latest-comment')
  async getLatestComment(@GetUser() user: TCachedUser) {
    try {
      const comments = await this.accountService.getLatestComment(user);
      return { data: comments };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('saved-events')
  async getSavedEvent(
    @GetUser() user: TCachedUser,
    @Query() query: GetBookmarkedEventDto,
  ) {
    try {
      const showValues = 'basic,advance,insights,audience';
      const events = await this.accountService.getSavedEvent(user, query, showValues);
      return { data: events };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Get('enquiries')
  async getAccountEnquiries(
    @GetUser() user: TCachedUser,
    @Query() query: GetEnquiriesHttpDto,
  ) {
    try {
      const showValues = 'basic,advance,insights,audience';
      const enquiries = await this.accountService.getAccountEnquiries(
        user,
        query,
        showValues,
      );
      return { data: enquiries };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('enquiries/count')
  async getAccountEnquiriesCount(
    @GetUser() user: TCachedUser,
    @Query() query: GetAccountEnquiriesCountDto,
  ) {
    try {
      const count = await this.accountService.getAccountEnquiriesCount(
        user,
        query,
      );
      return { data: { count } };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('users')
  async getAccountUsers(
    @GetUser() user: TCachedUser,
    @Query() query: GetUserHttpDto,
  ) {
    try {
      const users = await this.accountService.getAccountUsers(user, query);
      return { data: users };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Get('configuration/:key')
  async getAccountConfiguration(
    @GetUser() user: TCachedUser,
    @Param('key') key: AccountConfigKey,
  ) {
    try {
      const configuration = await this.accountService.getAccountConfiguration(
        user,
        key,
      );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/interest')
  async updateAccountConfigurationInterest(
    @GetUser() user: TCachedUser,
    @Body() data: InterestConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'interest',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/outreach')
  async updateAccountConfigurationOutreach(
    @GetUser() user: TCachedUser,
    @Body() data: OutreachConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'outreach',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }

  @UseGuards(AuthGuard)
  @Put('configuration/filter')
  async updateAccountConfigurationFilter(
    @GetUser() user: TCachedUser,
    @Body() data: FilterConfigurationDto,
  ) {
    try {
      const configuration =
        await this.accountService.updateAccountConfiguration(
          user,
          'filter',
          data,
        );
      return { data: configuration };
    } catch (error) {
      return { error: error };
    }
  }
  @UseGuards(AuthGuard)
  @Patch('membership/:action')
  async updateAccountMembership(
    @Param('action') currentAction: 'create' | 'cancel',
    @GetUser() user: TCachedUser,
    @Body() data: MembershipDto | UpdateCurrentMembershipDto
  ) {
    try {
      switch (currentAction) {
        case 'create': {
          const configuration = await this.accountService.updateAccountMembership(
            user,
            membershipSchema.parse(data)
          );
          return { data: configuration };
        }

        case 'cancel': {
          const cancelPayload = updateMembershipSchema.parse(data);
          const result = await this.accountService.cancelMembershipRenewal(user, cancelPayload);
          return { data: result };
        }

        default:
          return {
            error: 'Invalid action provided',
            statusCode: HttpStatus.BAD_REQUEST,
          };
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          error: 'Validation failed',
          details: error.errors,
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        };
      }

      return {
        error: error?.message || 'Something went wrong',
        statusCode: error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }


  @UseGuards(AuthGuard)
  @Post('membership-token')
  async createMembershipToken(@GetUser() user: TCachedUser) {
    try {
      console.log(user);
      const data = await this.accountService.createMembershipToken(user);
      return { data: { user: data } };
    } catch (error) {
      return { error: error };
    }
  }
  @Patch(':token/membership')
  async updateMembership(@Param('token') token: string, @Body() body: UpdateSubscriptionWebhookDto) {
    try {
      if (process.env.STRIPE_PASS_TOKEN !== token) {
        throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
      }
      const data = await this.accountService.updateMembershipFromWebhook(body)
      return { data: data };
    } catch (error) {
      return { error: error };
    }
  }
}
