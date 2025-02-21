import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignInDto, SignUpDto, VerifyAccessDto, VerifyOtpDto } from './dto';
import {
  blackListDomain,
  CachedUserSchema,
  QueueActionOptions,
  TCachedUser,
} from 'src/utils/types';
import { randomInt, randomUUID } from 'crypto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SharedService } from 'src/shared/shared.service';
import { UserDataService } from '../user.data.service';
import { AccountDataService } from '../account/account.data.service';
import { CompanyDataService } from '../company/company.data.service';
import { AuthDataService } from './auth.data.service.dto';
import { SelectedUserDetails } from 'src/utils/types';
import { OnboardingState, User } from '@prisma/client';
import { CookieSerializeOptions } from '@fastify/cookie';
import { ConfigService } from '@nestjs/config';
import { CommunicationService } from 'src/communication/communication.service';
import { UserResponseSchema } from '../me/dto';
import { UserService } from '../user.service';
import { AccessService } from 'src/access/access.service';
import { GetAccessDto } from 'src/access/dto';
import { InterestDefaultConfigurations } from '../account/account.config';
import { InterestDefaultConfigurationsWithIndustry } from '../account/account.config';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    // @InjectQueue('otpProcessor') private readonly otpEmailQueue: Queue,
    private readonly userDataService: UserDataService,
    private readonly accountDataService: AccountDataService,
    private readonly companyDataService: CompanyDataService,
    private readonly authDataService: AuthDataService,
    private readonly configService: ConfigService,
    private readonly communicationService: CommunicationService,
    private readonly sharedService: SharedService,
    private readonly accessService: AccessService,
  ) {}

  async signUp(data: SignUpDto) {
    const domain = data.email.split('@')[1];
    if (blackListDomain.includes(domain)) {
      throw new HttpException('Domain not allowed', HttpStatus.BAD_REQUEST);
    }
    let [user, company] = await Promise.all([
      await this.userDataService.getUsers({
        email: [data.email],
        limit: 1,
        offset: 0,
      })[0],
      blackListDomain.includes(domain)
        ? null
        : await this.companyDataService.getCompany({
            domain: domain,
          }),
    ]);

    let account = company ? { id: company.accountId } : null;
    if (user && company) {
      account = (
        await this.accountDataService.getAccounts({
          id: company.accountId,
          userId: user.id,
          limit: 1,
          offset: 0,
        })
      )[0];

      if (account) {
        throw new HttpException('User already exists', HttpStatus.CONFLICT);
      }
      await this.accountDataService.addAccountUser(company.accountId, user.id);
    } else {
      if (!company) {
        const accountDefault = {
          membership: domain === '10times' ? 1 : 0,
          pendingRequests: domain === '10times' ? 1000 : 200,
          pendingPocUnlockRequests: domain === '10times' ? 10000 : 4400,
        };
        if (blackListDomain.includes(domain)) {
          accountDefault['domain'] = domain;
        }
        account = await this.accountDataService.createAccount({
          ...accountDefault,
          interestConfig: data.industry
            ? InterestDefaultConfigurationsWithIndustry[data.industry]
            : InterestDefaultConfigurations.interests,
        });
        if (!blackListDomain.includes(domain)) {
          company = await this.companyDataService.createCompany({
            name: domain,
            domain: domain,
            accountId: account.id,
          });
        }

        if (user) {
          await Promise.all([
            company
              ? this.userDataService.updateUser({
                  id: user.id,
                  companyId: company.id,
                })
              : null,
            this.accountDataService.addAccountUser(account.id, user.id),
          ]);
        }
      }
      if (!account || !(account && account.id)) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }
      if (!user) {
        user = await this.userDataService.createUser({
          ...data,
          role: 'CUSTOMER',
          primaryCompanyId: company?.id,
          accountId: account.id,
          primaryAccountId: account.id,
          firstname: data.email.split('@')[0],
        });
      }

      await this.authDataService.createVerificationToken(user, 'sign-up');
      return {
        message: 'otp sent successfully',
      };
    }
  }

  async signIn(data: SignInDto) {
    const domain = data.email.split('@')[1];
    if (blackListDomain.includes(domain)) {
      throw new HttpException('Domain not allowed', HttpStatus.BAD_REQUEST);
    }
    const users = await this.userDataService.getUsers({
      email: [data.email],
      limit: 1,
      offset: 0,
    });
    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const user = users[0];
    await this.authDataService.createVerificationToken(user, 'sign-in');
    return {
      message: 'otp sent successfully',
    };
  }

  async verifyOtp(data: VerifyOtpDto) {
    const users = await this.userDataService.getUsers({
      email: [data.email],
      limit: 1,
      offset: 0,
    });
    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const user = users[0];
    const verificationToken = await this.authDataService.getVerificationToken(
      data.email,
    );

    if (
      !verificationToken ||
      (verificationToken &&
        (verificationToken.passkey !== data.otp ||
          verificationToken.expiresAt < new Date()))
    ) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    await this.authDataService.deleteVerificationToken(user.id);
    const accounts = await this.accountDataService.getAccounts({
      userId: user.id,
      limit: 10,
      offset: 0,
    });
    let currentAccount = accounts[0];
    const domain = data.email.split('@')[1].split('.')[0];
    accounts.forEach((account) => {
      if (
        (account.company && account.company.domain === domain) ||
        account.domain === domain
      ) {
        currentAccount = account;
      }
    });
    if (user.currentOnboardingState === OnboardingState.VERIFICATION) {
      const updatedUser = await this.userDataService.updateUser({
        id: user.id,
        currentOnboardingState: OnboardingState.COMPLETED,
      });
      return {
        user: await this.sharedService.UserResponse({
          ...updatedUser,
          accountId: currentAccount.id,
          accountConfigurationId: currentAccount.configurationId,
        }),
      };
    }
    return {
      user: await this.sharedService.UserResponse({
        ...user,
        accountId: currentAccount.id,
        primaryAccountId: user.primaryAccountId,
        primaryCompanyId: user.primaryCompanyId,
        accountConfigurationId: currentAccount.configurationId,
      }),
    };
  }

  async verifyAccess(data: VerifyAccessDto) {
    const users = await this.userDataService.getUsers({
      email: [data.email],
      limit: 1,
      offset: 0,
    });
    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const user = users[0];
    const accessParams: GetAccessDto = {
      accessReceiverId: user.id,
      sourceEntity: data.target,
      limit: 1,
      offset: 0,
    };
    if (data.targetId) {
      accessParams.sourceEntityId = data.targetId;
    }
    const access = await this.accessService.getAccess(accessParams, true);

    if (!access || (access && access.length === 0)) {
      throw new HttpException('Invalid Access', HttpStatus.BAD_REQUEST);
    }
    const foundAccess = access[0];

    if (
      foundAccess.token !== data.otp ||
      !foundAccess.expiry ||
      (foundAccess.expiry && foundAccess.expiry < new Date())
    ) {
      throw new HttpException('Invalid Token', HttpStatus.UNAUTHORIZED);
    }

    const accounts = await this.accountDataService.getAccounts({
      userId: user.id,
      limit: 10,
      offset: 0,
    });

    let currentAccount = accounts[0];
    const domain = data.email.split('@')[1].split('.')[0];
    if (domain)
      accounts.forEach((account) => {
        if (account.company!.domain === domain) {
          currentAccount = account;
        }
      });
    if (user.currentOnboardingState === OnboardingState.VERIFICATION) {
      const updatedUser = await this.userDataService.updateUser({
        id: user.id,
        currentOnboardingState: OnboardingState.COMPLETED,
      });
      return {
        user: await this.sharedService.UserResponse({
          ...updatedUser,
          accountId: currentAccount.id,
          accountConfigurationId: currentAccount.configurationId,
        }),
      };
    }
    return {
      user: await this.sharedService.UserResponse({
        ...user,
        accountId: currentAccount.id,
        accountConfigurationId: currentAccount.configurationId,
      }),
    };
  }

  // async userBasicInfo(email: string) {
  //   try {
  //     const [checkUserExist, companyDataExist] = await Promise.all([
  //       this.prisma.user.findUnique({
  //         where: {
  //           email: email,
  //         },
  //         select: {
  //           firstname: true,
  //           email: true,
  //           id: true,
  //           role: true,
  //           currentOnboardingState: true,
  //           imageUrl: true,
  //           accounts: true,
  //         },
  //       }),
  //       this.prisma.company.findUnique({
  //         where: {
  //           domain: email.split('@')[1],
  //         },
  //         select: {
  //           id: true,
  //           domain: true,
  //           accountId: true,
  //         },
  //       }),
  //     ]);
  //     console.log({ checkUserExist, companyDataExist });

  //     return { checkUserExist, companyDataExist };
  //   } catch (error) {}
  // }
  // async signIn(body: SignInDto) {
  //   try {
  //     const { checkUserExist, companyDataExist } = await this.userBasicInfo(
  //       body.email,
  //     );
  //     if (!checkUserExist)
  //       return {
  //         error: new HttpException(
  //           'No account found with this email. Kindly signup.',
  //           HttpStatus.CONFLICT,
  //         ),
  //       };
  //     if (checkUserExist.currentOnboardingState !== 'COMPLETED') {
  //       return {
  //         error: new HttpException(
  //           'No account found with this email. Kindly signup.',
  //           HttpStatus.CONFLICT,
  //         ),
  //       };
  //     }
  //     if (!checkUserExist.role)
  //       return {
  //         error: new HttpException(
  //           'User does not have role',
  //           HttpStatus.FORBIDDEN,
  //         ),
  //       };
  //     const passKeyData = await this.prisma.verification.findUnique({
  //       where: {
  //         userId: checkUserExist.id,
  //       },
  //     });
  //     console.log(passKeyData, new Date().toISOString());

  //     if (
  //       passKeyData.expiresAt.getTime() < Date.now() ||
  //       parseInt(passKeyData.passkey) !== body.otp
  //     ) {
  //       return {
  //         error: new HttpException(
  //           'Invalid OTP or OTP expired',
  //           HttpStatus.UNAUTHORIZED,
  //         ),
  //       };
  //     }
  //     const userData = CachedUserSchema.parse(checkUserExist);
  //     userData['accountId'] =
  //       checkUserExist.accounts.filter(
  //         (accountInfo) => accountInfo.id === companyDataExist.accountId,
  //       )[0]?.id ?? '';
  //     if (userData['accountId'].length === 0) {
  //       userData['accountId'] = checkUserExist.accounts[0].id;
  //     }
  //     const token = await this.signToken(userData);
  //     if (checkUserExist.imageUrl)
  //       userData['imageUrl'] = checkUserExist.imageUrl;
  //     return {
  //       data: UserResponseSchema.parse({ userData, token }),
  //     };
  //   } catch (error) {
  //     console.log(error + '');
  //     console.error(error);
  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
  // async createOtp(body: OtpCreateDto) {
  //   try {
  //     const { checkUserExist, companyDataExist } = await this.userBasicInfo(
  //       body.email,
  //     );
  //     const { jobStatus } = await this.optGenrationProcess(
  //       checkUserExist,
  //       'sign-in',
  //     );
  //     // console.log(userData, { jobadded });
  //     if (!jobStatus) {
  //       return {
  //         error: new HttpException(
  //           'otp cannot be sent,please try after some time.',
  //           HttpStatus.EXPECTATION_FAILED,
  //         ),
  //       };
  //     }
  //     return { data: { message: 'otp sent successfully.' } };
  //   } catch (error) {
  //     console.log(error + '');
  //     console.error(error);
  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
  // async optGenrationProcess(user: any, process: string) {
  //   try {
  //     const verificationCode = () => randomInt(1000, 10000).toString();
  //     const currentDateTime = new Date();
  //     const otpExpirtyTimeInMinutes: number = 5;
  //     const expiryDateTime = new Date(
  //       currentDateTime.getTime() + otpExpirtyTimeInMinutes * 60 * 1000,
  //     );
  //     const generateOtpForVerify = await this.prisma.verification.upsert({
  //       where: {
  //         userId: user.id,
  //       },
  //       update: {
  //         passkey: verificationCode(),
  //         expiresAt: expiryDateTime,
  //       },
  //       create: {
  //         userId: user.id,
  //         passkey: verificationCode(),
  //         createdAt: new Date(),
  //         expiresAt: expiryDateTime,
  //       },
  //     });
  //     console.log(generateOtpForVerify);
  //     const { error, job } = await this.sharedService.jobCreation(
  //       user.id,
  //       {
  //         otp: generateOtpForVerify.passkey,
  //         userInfo: user,
  //         process: process,
  //       },
  //       'SEND_OTP',
  //     );
  //     if (error) {
  //       return error;
  //     }
  //     const jobadded = await this.otpEmailQueue.add(
  //       'signUp/InEmail',
  //       {
  //         otp: generateOtpForVerify.passkey,
  //         userInfo: user,
  //         process: process,
  //         jobRequestId: job.id,
  //       },
  //       { priority: 1 },
  //     );
  //     return { jobStatus: true };
  //   } catch (error) {
  //     return { jobStatus: false };
  //   }
  // }
  // async createCompany(domain: String) {
  //   try {
  //     const createAccountForCompany = await this.prisma.account.create({
  //       data: {},
  //     });
  //     const createCompany = await this.prisma.company.create({
  //       data: {
  //         name: domain.split('.')[0],
  //         domain: String(domain),
  //         accountId: createAccountForCompany.id,
  //       },
  //     });
  //     console.log({
  //       companyInfo: createCompany,
  //       accountInfo: createAccountForCompany,
  //     });

  //     return {
  //       companyInfo: createCompany,
  //       accountInfo: createAccountForCompany,
  //     };
  //   } catch (error) {}
  // }
  // async signUp(body: SignUpDto) {
  //   try {
  //     const { checkUserExist, companyDataExist } = await this.userBasicInfo(
  //       body.email,
  //     );
  //     const companydomainarray: string[] = body.email.split('@');
  //     const userResponse = async (user: any, companyData: any) => {
  //       const userData = CachedUserSchema.parse(user);
  //       userData['accountId'] = user.accounts.filter(
  //         (accountInfo) => accountInfo.id === companyData.accountId,
  //       )[0].id;
  //       if (user.imageUrl) userData['imageUrl'] = user.imageUrl;
  //       const { jobStatus } = await this.optGenrationProcess(user, 'sign-up');
  //       // console.log(userData, { jobadded });
  //       if (!jobStatus) {
  //         return {
  //           error: new HttpException(
  //             'otp cannot be sent,please try after some time.',
  //             HttpStatus.EXPECTATION_FAILED,
  //           ),
  //         };
  //       }
  //       return {
  //         data: userData,
  //       };
  //     };
  //     if (!checkUserExist && !companyDataExist) {
  //       const { accountInfo, companyInfo } = await this.createCompany(
  //         companydomainarray[1],
  //       );
  //       const [userCreation] = await Promise.all([
  //         this.prisma.user.create({
  //           data: {
  //             firstname: companydomainarray[0],
  //             email: body.email,
  //             role: 'CUSTOMER',
  //             accounts: { connect: { id: accountInfo.id } },
  //           },
  //         }),
  //       ]);
  //       console.warn('case 1');
  //       return await userResponse(userCreation, companyInfo);
  //     } else if (checkUserExist && !companyDataExist) {
  //       const { accountInfo, companyInfo } = await this.createCompany(
  //         companydomainarray[1],
  //       );
  //       const updateUser = await this.prisma.user.update({
  //         where: {
  //           id: checkUserExist.id,
  //         },
  //         data: {
  //           accounts: { connect: { id: accountInfo.id } },
  //         },
  //       });
  //       console.warn('case 2');
  //       return await userResponse(
  //         { ...checkUserExist, ...updateUser },
  //         companyInfo,
  //       );
  //     } else if (!checkUserExist && companyDataExist) {
  //       const [userCreation] = await Promise.all([
  //         this.prisma.user.create({
  //           data: {
  //             firstname: companydomainarray[0],
  //             email: body.email,
  //             role: 'CUSTOMER',
  //             accounts: { connect: { id: companyDataExist.accountId } },
  //           },
  //         }),
  //       ]);
  //       console.warn('case 3');
  //       return await userResponse(userCreation, companyDataExist);
  //     } else {
  //       if (checkUserExist.currentOnboardingState === 'COMPLETED') {
  //         return {
  //           error: new HttpException(
  //             'Email already exists',
  //             HttpStatus.CONFLICT,
  //           ),
  //         };
  //       }
  //       const checkUserHasAccount = checkUserExist.accounts.find(
  //         (accountInfo) => accountInfo.id === companyDataExist.accountId,
  //       );
  //       console.log('checkUserHasAccount', checkUserHasAccount);
  //       if (!checkUserHasAccount) {
  //         const updateUser = await this.prisma.user.update({
  //           where: {
  //             id: checkUserExist.id,
  //           },
  //           data: {
  //             accounts: { connect: { id: companyDataExist.id } },
  //           },
  //         });
  //         console.warn('case 4');
  //         return await userResponse(
  //           { ...checkUserExist, ...updateUser },
  //           companyDataExist,
  //         );
  //       }
  //       if (checkUserExist.currentOnboardingState === 'VERIFICATION') {
  //         return await userResponse({ ...checkUserExist }, companyDataExist);
  //       }
  //     }
  //     console.log('nothing');
  //   } catch (error) {
  //     console.log(error);
  //     console.error(error);
  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
  // async signOut(token: string) {
  //   try {
  //     await this.cacheManager.del(token);
  //     return {
  //       data: { message: 'Successfully logged out' },
  //     };
  //   } catch (error) {
  //     console.log(error + '');

  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
  // async verifyOtp(body: OtpDto) {
  //   try {
  //     const { checkUserExist, companyDataExist } = await this.userBasicInfo(
  //       body.email,
  //     );
  //     const verifyOtp = await this.prisma.verification.findFirst({
  //       where: {
  //         userId: checkUserExist.id,
  //         passkey: String(body.otp),
  //       },
  //     });
  //     // console.log(verifyOtp, verifyOtp.expiresAt > new Date());

  //     if (!verifyOtp || verifyOtp?.expiresAt?.getTime() < Date.now()) {
  //       return {
  //         error: new HttpException(
  //           'Invalid OTP or OTP expired',
  //           HttpStatus.UNAUTHORIZED,
  //         ),
  //       };
  //     }
  //     await Promise.all([
  //       this.prisma.verification.delete({
  //         where: {
  //           userId: checkUserExist.id,
  //           passkey: String(body.otp),
  //         },
  //       }),
  //       this.prisma.user.update({
  //         where: {
  //           id: checkUserExist.id,
  //         },
  //         data: {
  //           currentOnboardingState: 'COMPLETED',
  //         },
  //       }),
  //     ]);
  //     const userData = CachedUserSchema.parse(checkUserExist);
  //     userData['accountId'] = checkUserExist.accounts.filter(
  //       (accountInfo) => accountInfo.id === companyDataExist.accountId,
  //     )[0].id;
  //     const token = await this.signToken({ ...userData });
  //     if (checkUserExist.imageUrl)
  //       userData['imageUrl'] = checkUserExist.imageUrl;
  //     return {
  //       data: {
  //         ...UserResponseSchema.parse({ userData, token }),
  //         isVerified: true,
  //       },
  //     };
  //   } catch (error) {
  //     console.log(error + '');

  //     return {
  //       error: new HttpException(
  //         'something went wrong',
  //         HttpStatus.BAD_REQUEST,
  //       ),
  //     };
  //   }
  // }
}
