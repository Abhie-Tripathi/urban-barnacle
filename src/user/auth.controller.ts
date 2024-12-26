import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';
import { FastifyReply } from 'fastify';
import { SignUpDto } from './dto/signup.dto';
import { GetUser } from 'src/decorator';
import { TCachedUser } from 'src/shared/types';
import { OtpDto } from './dto';

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
  @Post('signout')
  async signOut(
    @Res({ passthrough: true }) reply: FastifyReply,
    @GetUser() user: TCachedUser,
  ) {
    return await this.authService.signOut(user.token);
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
}
