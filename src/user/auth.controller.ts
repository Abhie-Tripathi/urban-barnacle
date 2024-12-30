import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { FastifyReply } from 'fastify';
import { SignUpDto } from './dto/signup.dto';
import { GetUser } from 'src/decorator';
import { TCachedUser } from 'src/shared/types';
import { OtpCreateDto, OtpDto } from './dto';
import { AuthGuard } from 'src/guard';

@Controller('auth')
export class AuthController {
  cookiePrefix: string | undefined;
  constructor(private readonly authService: AuthService) {
    this.cookiePrefix = process.env.COOKIE_PREFIX;
  }
  @Post('signin')
  async signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { data, error } = await this.authService.signIn(body);
    if (error) {
      return { error };
    }
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    reply.setCookie(key, data.token);
    // reply.setCookie('token', data.token);
    return reply.send({ data: { user: data.userData } });
  }
  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    console.log(await this.authService.signUp(body));

    return await this.authService.signUp(body);
  }
  @UseGuards(AuthGuard)
  @Post('signout')
  async signOut(
    @Res({ passthrough: true }) reply: FastifyReply,
    @GetUser() user: TCachedUser,
  ) {
    const { data, error } = await this.authService.signOut(user.token);
    if (error) {
      return { error };
    }
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    reply.clearCookie(key);
    return { data };
  }
  @Post('verify')
  async verifyOtp(
    @Body() body: OtpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { data, error } = await this.authService.verifyOtp(body);
    if (error) {
      return { error };
    }
    const key = (this.cookiePrefix ? `${this.cookiePrefix}-` : '') + 'token';
    reply.setCookie(key, data.token);
    // reply.setCookie('token', data.token);
    return reply.send({ data: { user: data.userData } });
  }
  @Post('create-otp/sigin')
  async createOtp(@Body() body: OtpCreateDto) {
    const { data, error } = await this.authService.createOtp(body);
    if (error) {
      return { error };
    }
    return  data ;
  }
}
