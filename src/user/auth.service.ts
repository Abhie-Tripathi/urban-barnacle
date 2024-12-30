import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignInDto, UserResponseSchema } from './dto/signin.dto';
import { CachedUserSchema, TCachedUser } from 'src/shared/types';
import { randomInt, randomUUID } from 'crypto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { SignUpDto } from './dto/signup.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { OtpCreateDto, OtpDto } from './dto';
import { SharedService } from 'src/shared/shared.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sharedService: SharedService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue('otpProcessor') private readonly otpEmailQueue: Queue,
  ) {}
  async signToken(value: any) {
    console.log({ node_env: process.env.NODE_ENV });
    const token = randomUUID();
    const tokenData: TCachedUser = { ...value, token };
    await this.cacheManager.set(token, tokenData, 1000 * 60 * 60 * 24 * 365);
    return token;
  }
  async userBasicInfo(email: string) {
    try {
      const [checkUserExist, companyDataExist] = await Promise.all([
        this.prisma.user.findUnique({
          where: {
            email: email,
          },
          select: {
            firstname: true,
            email: true,
            id: true,
            role: true,
            currentOnboardingState: true,
            imageUrl: true,
            accounts: true,
          },
        }),
        this.prisma.company.findUnique({
          where: {
            domain: email.split('@')[1],
          },
          select: {
            id: true,
            domain: true,
            accountId: true,
          },
        }),
      ]);
      console.log({ checkUserExist, companyDataExist });

      return { checkUserExist, companyDataExist };
    } catch (error) {}
  }
  async signIn(body: SignInDto) {
    try {
      const { checkUserExist, companyDataExist } = await this.userBasicInfo(
        body.email,
      );
      if (!checkUserExist)
        return {
          error: new HttpException(
            'No account found with this email. Kindly signup.',
            HttpStatus.CONFLICT,
          ),
        };
      if (checkUserExist.currentOnboardingState !== 'COMPLETED') {
        return {
          error: new HttpException(
            'No account found with this email. Kindly signup.',
            HttpStatus.CONFLICT,
          ),
        };
      }
      if (!checkUserExist.role)
        return {
          error: new HttpException(
            'User does not have role',
            HttpStatus.FORBIDDEN,
          ),
        };
      const passKeyData = await this.prisma.verification.findUnique({
        where: {
          userId: checkUserExist.id,
        },
      });
      console.log(passKeyData, new Date().toISOString());

      if (
        passKeyData.expiresAt.getTime() < Date.now() ||
        parseInt(passKeyData.passkey) !== body.otp
      ) {
        return {
          error: new HttpException(
            'Invalid OTP or OTP expired',
            HttpStatus.UNAUTHORIZED,
          ),
        };
      }
      const userData = CachedUserSchema.parse(checkUserExist);
      userData['accountId'] = checkUserExist.accounts.filter(
        (accountInfo) => accountInfo.id === companyDataExist.accountId,
      )[0].id;
      const token = await this.signToken(userData);
      if (checkUserExist.imageUrl)
        userData['imageUrl'] = checkUserExist.imageUrl;
      return {
        data: UserResponseSchema.parse({ userData, token }),
      };
    } catch (error) {
      console.log(error + '');
      console.error(error);
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async createOtp(body: OtpCreateDto) {
    try {
      const { checkUserExist, companyDataExist } = await this.userBasicInfo(
        body.email,
      );
      const { jobStatus } = await this.optGenrationProcess(
        checkUserExist,
        'sign-in',
      );
      // console.log(userData, { jobadded });
      if (!jobStatus) {
        return {
          error: new HttpException(
            'otp cannot be sent,please try after some time.',
            HttpStatus.EXPECTATION_FAILED,
          ),
        };
      }
      return { data: { message: 'otp sent successfully.' } };
    } catch (error) {
      console.log(error + '');
      console.error(error);
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async optGenrationProcess(user: any, process: string) {
    try {
      const verificationCode = () => randomInt(1000, 10000).toString();
      const currentDateTime = new Date();
      const otpExpirtyTimeInMinutes: number = 5;
      const expiryDateTime = new Date(
        currentDateTime.getTime() + otpExpirtyTimeInMinutes * 60 * 1000,
      );
      const generateOtpForVerify = await this.prisma.verification.upsert({
        where: {
          userId: user.id,
        },
        update: {
          passkey: verificationCode(),
          expiresAt: expiryDateTime,
        },
        create: {
          userId: user.id,
          passkey: verificationCode(),
          createdAt: new Date(),
          expiresAt: expiryDateTime,
        },
      });
      console.log(generateOtpForVerify);
      const { error, job } = await this.sharedService.jobCreation(
        user.id,
        {
          otp: generateOtpForVerify.passkey,
          userInfo: user,
          process: process,
        },
        'SEND_OTP',
      );
      if (error) {
        return error;
      }
      const jobadded = await this.otpEmailQueue.add(
        'signUp/InEmail',
        {
          otp: generateOtpForVerify.passkey,
          userInfo: user,
          process: process,
          jobRequestId: job.id,
        },
        { priority: 1 },
      );
      return { jobStatus: true };
    } catch (error) {
      return { jobStatus: false };
    }
  }
  async createCompany(domain: String) {
    try {
      const createAccountForCompany = await this.prisma.account.create({
        data: {},
      });
      const createCompany = await this.prisma.company.create({
        data: {
          name: domain.split('.')[0],
          domain: String(domain),
          accountId: createAccountForCompany.id,
        },
      });
      console.log({
        companyInfo: createCompany,
        accountInfo: createAccountForCompany,
      });

      return {
        companyInfo: createCompany,
        accountInfo: createAccountForCompany,
      };
    } catch (error) {}
  }
  async signUp(body: SignUpDto) {
    try {
      const { checkUserExist, companyDataExist } = await this.userBasicInfo(
        body.email,
      );
      const companydomainarray: string[] = body.email.split('@');
      const userResponse = async (user: any, companyData: any) => {
        const userData = CachedUserSchema.parse(user);
        userData['accountId'] = user.accounts.filter(
          (accountInfo) => accountInfo.id === companyData.accountId,
        )[0].id;
        if (user.imageUrl) userData['imageUrl'] = user.imageUrl;
        const { jobStatus } = await this.optGenrationProcess(user, 'sign-up');
        // console.log(userData, { jobadded });
        if (!jobStatus) {
          return {
            error: new HttpException(
              'otp cannot be sent,please try after some time.',
              HttpStatus.EXPECTATION_FAILED,
            ),
          };
        }
        return {
          data: userData,
        };
      };
      if (!checkUserExist && !companyDataExist) {
        const { accountInfo, companyInfo } = await this.createCompany(
          companydomainarray[1],
        );
        const [userCreation] = await Promise.all([
          this.prisma.user.create({
            data: {
              firstname: companydomainarray[0],
              email: body.email,
              role: 'CUSTOMER',
              accounts: { connect: { id: accountInfo.id } },
            },
          }),
        ]);
        console.warn('case 1');
        return await userResponse(userCreation, companyInfo);
      } else if (checkUserExist && !companyDataExist) {
        const { accountInfo, companyInfo } = await this.createCompany(
          companydomainarray[1],
        );
        const updateUser = await this.prisma.user.update({
          where: {
            id: checkUserExist.id,
          },
          data: {
            accounts: { connect: { id: accountInfo.id } },
          },
        });
        console.warn('case 2');
        return await userResponse(
          { ...checkUserExist, ...updateUser },
          companyInfo,
        );
      } else if (!checkUserExist && companyDataExist) {
        const [userCreation] = await Promise.all([
          this.prisma.user.create({
            data: {
              firstname: companydomainarray[0],
              email: body.email,
              role: 'CUSTOMER',
              accounts: { connect: { id: companyDataExist.accountId } },
            },
          }),
        ]);
        console.warn('case 3');
        return await userResponse(userCreation, companyDataExist);
      } else {
        if (checkUserExist.currentOnboardingState === 'COMPLETED') {
          return {
            error: new HttpException(
              'Email already exists',
              HttpStatus.CONFLICT,
            ),
          };
        }
        const checkUserHasAccount = checkUserExist.accounts.find(
          (accountInfo) => accountInfo.id === companyDataExist.accountId,
        );
        console.log('checkUserHasAccount', checkUserHasAccount);
        if (!checkUserHasAccount) {
          const updateUser = await this.prisma.user.update({
            where: {
              id: checkUserExist.id,
            },
            data: {
              accounts: { connect: { id: companyDataExist.id } },
            },
          });
          console.warn('case 4');
          return await userResponse(
            { ...checkUserExist, ...updateUser },
            companyDataExist,
          );
        }
        if (checkUserExist.currentOnboardingState === 'VERIFICATION') {
          return await userResponse({ ...checkUserExist }, companyDataExist);
        }
      }
      console.log('nothing');
    } catch (error) {
      console.log(error);
      console.error(error);
      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async signOut(token: string) {
    try {
      await this.cacheManager.del(token);
      return {
        data: { message: 'Successfully logged out' },
      };
    } catch (error) {
      console.log(error + '');

      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
  async verifyOtp(body: OtpDto) {
    try {
      const { checkUserExist, companyDataExist } = await this.userBasicInfo(
        body.email,
      );
      const verifyOtp = await this.prisma.verification.findFirst({
        where: {
          userId: checkUserExist.id,
          passkey: String(body.otp),
        },
      });
      // console.log(verifyOtp, verifyOtp.expiresAt > new Date());

      if (!verifyOtp || verifyOtp?.expiresAt?.getTime() < Date.now()) {
        return {
          error: new HttpException(
            'Invalid OTP or OTP expired',
            HttpStatus.UNAUTHORIZED,
          ),
        };
      }
      await Promise.all([
        this.prisma.verification.delete({
          where: {
            userId: checkUserExist.id,
            passkey: String(body.otp),
          },
        }),
        this.prisma.user.update({
          where: {
            id: checkUserExist.id,
          },
          data: {
            currentOnboardingState: 'COMPLETED',
          },
        }),
      ]);
      const userData = CachedUserSchema.parse(checkUserExist);
      userData['accountId'] = checkUserExist.accounts.filter(
        (accountInfo) => accountInfo.id === companyDataExist.accountId,
      )[0].id;
      const token = await this.signToken({ ...userData });
      if (checkUserExist.imageUrl)
        userData['imageUrl'] = checkUserExist.imageUrl;
      return {
        data: {
          ...UserResponseSchema.parse({ userData, token }),
          isVerified: true,
        },
      };
    } catch (error) {
      console.log(error + '');

      return {
        error: new HttpException(
          'something went wrong',
          HttpStatus.BAD_REQUEST,
        ),
      };
    }
  }
}
