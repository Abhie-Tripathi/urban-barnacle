import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MeService } from './me.service';
import { CachedUserSchema, TCachedUser } from 'src/utils/types';
import { File, FileInterceptor } from '@nest-lab/fastify-multer';
import { AdminGuard, AuthGuard } from '../auth/guard';
import { GetUser } from '../decorator';
import { UpdateMeDto } from './dto/update.dto';
import {
  GetMyExportsDto,
  GetRecentEventSearchesDto,
  SwitchAccountDto,
  UserDataSchema,
} from './dto';
import { GetTrackersHttpDto } from 'src/tracker/dto';
import { GetSavedLocationsHttpDto } from 'src/saved-location/dto';
import { FastifyReply } from 'fastify';

@Controller('me')
export class MeController {
  cookiePrefix: string | undefined;
  constructor(private readonly meService: MeService) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }

  @UseGuards(AuthGuard)
  @Get()
  async getProfileData(@GetUser() userData: TCachedUser) {
    try {
      const user = UserDataSchema.parse(userData);
      return { data: user };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch()
  async updateProfileData(
    @GetUser() userData: TCachedUser,
    @UploadedFile() file: File,
    @Body() body: UpdateMeDto,
  ) {
    try {
      const user = await this.meService.updateMe(userData.id, body);
      return {
        data: {
          user: UserDataSchema.parse(user),
        },
      };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('exports')
  async getMyExports(
    @GetUser() user: TCachedUser,
    @Query() query: GetMyExportsDto,
  ) {
    try {
      const exports = await this.meService.getMyExports(user, query);
      return { data: exports };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('trackers')
  async getMyTrackers(
    @GetUser() user: TCachedUser,
    @Query() query: GetTrackersHttpDto,
  ) {
    try {
      const trackers = await this.meService.getMyTrackers(user, query);
      return { data: trackers };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('saved-locations')
  async getMySavedLocations(
    @GetUser() user: TCachedUser,
    @Query() query: GetSavedLocationsHttpDto,
  ) {
    try {
      const savedLocations = await this.meService.getMySavedLocations(
        user,
        query,
      );
      return { data: savedLocations };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Get('recent-searches')
  async getMyRecentSearches(
    @GetUser() user: TCachedUser,
    @Query() query: GetRecentEventSearchesDto,
  ) {
    try {
      const recentSearches = await this.meService.getMyRecentSearches(
        user,
        query,
      );
      return { data: recentSearches };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Post('sign-out')
  async signOut(
    @GetUser() user: TCachedUser,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const data = await this.meService.signOut(user.token);
      const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
      reply.clearCookie(key);
      return { data };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }

  @UseGuards(AuthGuard)
  @Post('switch-account')
  async switchAccount(
    @GetUser() user: TCachedUser,
    @Body() body: SwitchAccountDto,
  ) {
    try {
      const data = await this.meService.switchAccount(user, body.accountId);
      return { data };
    } catch (error) {
      return {
        error: new HttpException(
          error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
}
