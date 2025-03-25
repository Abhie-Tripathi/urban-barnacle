import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatDto, SignInDto, SignUpDto, SourceDto, VerifyAccessDto, VerifyOtpDto } from './dto';
import { FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { GetUser } from '../decorator';
import { TCachedUser } from 'src/utils/types';
import { AuthGuard } from './guard';

@Controller('auth')
export class AuthController {
  cookiePrefix: string | undefined;
  constructor(private readonly authService: AuthService) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }

  // @Post('signin')
  // async signIn(
  //   @Body() body: SignInDto,
  //   @Res({ passthrough: true }) reply: FastifyReply,
  // ) {
  //   const { data, error } = await this.authService.signIn(body);
  //   if (error) {
  //     return { error };
  //   }
  //   const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
  //   reply.setCookie(key, data.token);
  //   // reply.setCookie('token', data.token);
  //   return reply.send({ data: { user: data.userData } });
  // }

  @Post('sign-up')
  async signUp(@Body() body: SignUpDto) {
    try {
      const user = await this.authService.signUp(body);
      return { data: user };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          error: new HttpException(
            'User already exists',
            HttpStatus.BAD_REQUEST,
          ),
        };
      }
      return { error: error };
    }
  }

  @Post('sign-in')
  async signIn(@Body() body: SignInDto) {
    try {
      const user = await this.authService.signIn(body);
      return { data: user };
    } catch (error) {
      return { error: error };
    }
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() body: VerifyOtpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const data = await this.authService.verifyOtp(body);
      const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
      reply.cookie(key, data.user.token);
      return { data: { user: data.user.userData } };
    } catch (error) {
      return { error: error };
    }
  }

  @Post('verify-access')
  async verifyAccess(
    @Body() body: VerifyAccessDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const data = await this.authService.verifyAccess(body);
      const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
      reply.cookie(key, data.user.token);
      return { data: { user: data.user.userData } };
    } catch (error) {
      return { error: error };
    }
  }
  @Post(':source/sso')
  async authenticateUserFromToken(@Param() source: SourceDto, @Body() body: AuthenticatDto, @Res({ passthrough: true }) reply: FastifyReply) {
    try {
      const data = await this.authService.authenticateUserFromToken(source, body);
      const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
      reply.cookie(key, data.user.token);
      return { data: { user: { ...data.user.userData, isNewUser: data.isNewUser, industryExist: data.industryExist } } };
    } catch (error) {
      return { error: error };
    }
  }
  // @UseGuards(AuthGuard)
  // @Post('signout')
  // async signOut(
  //   @Res({ passthrough: true }) reply: FastifyReply,
  //   @GetUser() user: TCachedUser,
  // ) {
  //   const { data, error } = await this.authService.signOut(user.token);
  //   if (error) {
  //     return { error };
  //   }
  //   const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
  //   reply.clearCookie(key);
  //   return { data };
  // }

  // @Post('verify')
  // async verifyOtp(
  //   @Body() body: OtpDto,
  //   @Res({ passthrough: true }) reply: FastifyReply,
  // ) {
  //   const { data, error } = await this.authService.verifyOtp(body);
  //   if (error) {
  //     return { error };
  //   }
  //   const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
  //   reply.setCookie(key, data.token);
  //   // reply.setCookie('token', data.token);
  //   return reply.send({ data: { user: data.userData } });
  // }

  // @Post('create-otp/sigin')
  // async createOtp(@Body() body: OtpCreateDto) {
  //   const { data, error } = await this.authService.createOtp(body);
  //   if (error) {
  //     return { error };
  //   }
  //   return  data ;
  // }
}
