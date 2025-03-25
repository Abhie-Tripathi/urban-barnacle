import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  AuthenticatDto,
  SignInDto,
  SignUpDto,
  SourceDto,
  VerifyAccessDto,
  VerifyOtpDto,
} from './dto';
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
import { AccountService } from '../account/account.service';
import { KitService } from 'src/widgets/kit.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    // @InjectQueue('otpProcessor') private readonly otpEmailQueue: Queue,
    private readonly userDataService: UserDataService,
    private readonly accountDataService: AccountDataService,
    private readonly accountService: AccountService,
    private readonly companyDataService: CompanyDataService,
    private readonly authDataService: AuthDataService,
    private readonly configService: ConfigService,
    private readonly communicationService: CommunicationService,
    private readonly sharedService: SharedService,
    private readonly accessService: AccessService,
    private readonly brandKitService: KitService
  ) { }

  async signUp(data: SignUpDto) {
    const domain = data.email.split('@')[1];
    // let nonBusinessFlag: Boolean = false;
    // if (blackListDomain.includes(domain)) {
    //   nonBusinessFlag = true;
    // }
    let [users, company] = await Promise.all([
      this.userDataService.getUsers({
        email: [data.email],
        limit: 1,
        offset: 0,
      }),
      blackListDomain.includes(domain)
        ? null
        : await this.companyDataService.getCompany({
          domain: domain,
        }),
    ]);
    let user = users && users.length > 0 ? users[0] : null;
    let account = company ? {
      id: company.accountId, currentSubscriptionId: company.accounts.currentSubscriptionId,
      configurationId: company.accounts.configurationId
    } : null;
    if (
      user &&
      user.currentOnboardingState !== OnboardingState.VERIFICATION &&
      company
    ) {
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
        const accountDefault = {};
        if (blackListDomain.includes(domain)) {
          accountDefault['domain'] = domain;
        }
        const createSubscription =
          await this.accountDataService.createSubscription({
            planEndDate: new Date('2126-01-01'),
          });
        account = await this.accountDataService.createAccount({
          ...accountDefault,
          currentSubscriptionId: createSubscription.id,
          interestConfig: data.industry
            ? InterestDefaultConfigurationsWithIndustry[data.industry]
            : InterestDefaultConfigurations.interests,
        });
        const updateSubscription =
          await this.accountDataService.updateSubscription(
            { accountId: account.id },
            createSubscription.id,
          );
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
          firstname: data.email.split('@')[0],
          ...data,
          role: 'CUSTOMER',
          primaryCompanyId: company?.id,
          accountId: account.id,
          primaryAccountId: account.id,
        });
      } else if (
        user &&
        user.currentOnboardingState === OnboardingState.VERIFICATION &&
        company
      ) {
        await this.userDataService.updateUser({
          id: user.id,
          ...data,
        });
        const accounts = await this.accountDataService.getAccounts({
          id: company.accountId,
          userId: user.id,
          limit: 1,
          offset: 0,
        });
        const account = accounts && accounts.length > 0 ? accounts[0] : null;
        if (account) {
          await this.accountService.updateAccountConfiguration(
            {
              ...user,
              accountId: account.id,
              accountConfigurationId: account.configurationId,
              currentSubscriptionId: account.currentSubscriptionId,
              token: '',
            },
            'interest',
            data.industry
              ? InterestDefaultConfigurationsWithIndustry[data.industry]
              : InterestDefaultConfigurations.interests,
          );
        }
      }
      this.createDefaultBrandKit({
        id: user.id,
        accountId: account.id,
        domain: domain,
      }, blackListDomain.includes(domain));
      await this.authDataService.createVerificationToken(user, 'sign-up');
      return {
        message: 'otp sent successfully',
      };
    }
  }

  async signIn(data: SignInDto, emailFlag: boolean = true) {
    const domain = data.email.split('@')[1];
    // if (blackListDomain.includes(domain)) {
    //   throw new HttpException('Domain not allowed', HttpStatus.BAD_REQUEST);
    // }
    const users = await this.userDataService.getUsers({
      email: [data.email],
      limit: 1,
      offset: 0,
    });
    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const user = users[0];
    if (emailFlag)
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
    let userDetail: User | null = null;
    if (user.currentOnboardingState === OnboardingState.VERIFICATION) {
      const updatedUser = await this.userDataService.updateUser({
        id: user.id,
        currentOnboardingState: OnboardingState.COMPLETED,
      });
      userDetail = updatedUser;
      // return {
      //   user: await this.sharedService.UserResponse({
      //     ...updatedUser,
      //     accountId: currentAccount.id,
      //     accountConfigurationId: currentAccount.configurationId,
      //     primaryAccountId: user.primaryAccountId,
      //     primaryCompanyId: user.primaryCompanyId,
      //   }),
      // };
    } else {
      userDetail = user;
    }
    return {
      user: await this.sharedService.UserResponse({
        ...userDetail,
        accountId: currentAccount.id,
        primaryAccountId: user.primaryAccountId,
        primaryCompanyId: user.primaryCompanyId,
        accountConfigurationId: currentAccount.configurationId,
        currentSubscriptionId: currentAccount.currentSubscriptionId,
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
          currentSubscriptionId: currentAccount.currentSubscriptionId,
        }),
      };
    }
    return {
      user: await this.sharedService.UserResponse({
        ...user,
        accountId: currentAccount.id,
        accountConfigurationId: currentAccount.configurationId,
        currentSubscriptionId: currentAccount.currentSubscriptionId,
      }),
    };
  }

  async authenticateUserFromToken(source: SourceDto, body: AuthenticatDto) {
    const response = await this.authDataService.authenticateUserFromToken(source, body);
    console.log({ response });
    if (0 === response.status.code && response.message.toLowerCase().includes('invalid')) {
      throw new HttpException(`Invalid token`, HttpStatus.BAD_REQUEST);
    }
    const data: {
      name: string;
      email: string;
      profilepicture?: string;
      company?: string;
      designationName?: string;
      industry?: string;
      departmentName?: string;
      location?: {
        cityId?: number;
        cityName?: string;
        countryId?: string;
        countryName?: string;
      };
    } = response.data;

    const users = await this.userDataService.getUsers({
      email: [data['email'] as string],
      limit: 1,
      offset: 0,
    });
    if (users.length > 0) {
      const user = users[0];
      const userData = await this.signIn({ email: user.email }, false);
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
      let userDetail: User | null = null;
      if (user.currentOnboardingState === OnboardingState.VERIFICATION) {
        const updatedUser = await this.userDataService.updateUser({
          id: user.id,
          currentOnboardingState: OnboardingState.COMPLETED,
          socialIds: {
            google: source.source === 'google' && response.socialId ? response.socialId['userId'] : (user.socialIds as any)['google']
            , linkedin: source.source === 'linkedin' && response.socialId ? response.socialId['userId'] : (user.socialIds as any)['linkedin']
          }
        });
        userDetail = updatedUser;
      } else {
        userDetail = user;
      }
      return {
        user: await this.sharedService.UserResponse({
          ...userDetail,
          accountId: currentAccount.id,
          primaryAccountId: user.primaryAccountId,
          primaryCompanyId: user.primaryCompanyId,
          accountConfigurationId: currentAccount.configurationId,
          currentSubscriptionId: currentAccount.currentSubscriptionId,
        }),
        isNewUser: false
      };
    } else {
      const domain = data.email.split('@')[1];
      // let nonBusinessFlag: Boolean = false;
      // if (blackListDomain.includes(domain)) {
      //   nonBusinessFlag = true;
      // }
      let [users, company] = await Promise.all([
        this.userDataService.getUsers({
          email: [data.email],
          limit: 1,
          offset: 0,
        }),
        blackListDomain.includes(domain)
          ? null
          : await this.companyDataService.getCompany({
            domain: domain,
          }),
      ]);
      let user = users && users.length > 0 ? users[0] : null;
      let account = company ? {
        id: company.accountId, currentSubscriptionId: company.accounts.currentSubscriptionId,
        configurationId: company.accounts.configurationId
      } : null;
      if (!company) {
        const accountDefault = {};
        if (blackListDomain.includes(domain)) {
          accountDefault['domain'] = domain;
        }
        const createSubscription =
          await this.accountDataService.createSubscription({
            planEndDate: new Date('2126-01-01'),
          });
        account = await this.accountDataService.createAccount({
          ...accountDefault,
          currentSubscriptionId: createSubscription.id,
          interestConfig: data.industry
            ? InterestDefaultConfigurationsWithIndustry[data.industry]
            : InterestDefaultConfigurations.interests,
        });
        const updateSubscription =
          await this.accountDataService.updateSubscription(
            { accountId: account.id },
            createSubscription.id,
          );
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
          firstname: data.name.split(' ')[0],
          ...(data.name.split(' ').length > 1 ? { lastname: data.name.substring(data.name.indexOf('') + 1) } : {}),
          email: data.email,
          role: 'CUSTOMER',
          primaryCompanyId: company?.id,
          accountId: account.id,
          primaryAccountId: account.id,
          socialIds: {
            google: source.source === 'google' && response.socialId ? response.socialId['userId'] : undefined
            , linkedin: source.source === 'linkedin' && response.socialId ? response.socialId['userId'] : undefined
          }
        });
        if (data.profilepicture && data.profilepicture.length > 5) {
          const profilepicture = await this.authDataService.fetchImageFromOtherDomian(data.profilepicture, user.id);
          if (profilepicture) {
            await this.userDataService.updateUser({
              id: user.id,
              imageUrl: profilepicture.fileUrl,
              profileImageId: profilepicture.id
            });
          }
        }
      } else if (
        user &&
        user.currentOnboardingState === OnboardingState.VERIFICATION &&
        company
      ) {
        await this.userDataService.updateUser({
          id: user.id,
          ...data,
        });
        const accounts = await this.accountDataService.getAccounts({
          id: company.accountId,
          userId: user.id,
          limit: 1,
          offset: 0,
        });
        const account = accounts && accounts.length > 0 ? accounts[0] : null;
        if (account) {
          await this.accountService.updateAccountConfiguration(
            {
              ...user,
              accountId: account.id,
              accountConfigurationId: account.configurationId,
              currentSubscriptionId: account.currentSubscriptionId,
              token: '',
            },
            'interest',
            data.industry
              ? InterestDefaultConfigurationsWithIndustry[data.industry]
              : InterestDefaultConfigurations.interests,
          );
        }
      }
      this.createDefaultBrandKit({
        id: user.id,
        accountId: account.id,
        domain: domain,
      }, blackListDomain.includes(domain));
      return {
        user: await this.sharedService.UserResponse({
          ...user,
          accountId: account.id,
          primaryAccountId: user.primaryAccountId,
          primaryCompanyId: user.primaryCompanyId,
          accountConfigurationId: account.configurationId,
          currentSubscriptionId: account.currentSubscriptionId,
        }),
        isNewUser: true,
        industryExist: user.industry && user.industry.length > 3 ? true : false
      };
    }
  }
  async createDefaultBrandKit(userData: {
    accountId: string;
    id: string;
    domain: string
  }, blackListDomain: boolean) {
    const { data, error } = await this.brandKitService.getKit(userData.accountId);
    if ((data && Object.keys(data.otherData).length <= 0 && data.color.length <= 0) && blackListDomain) {
      await this.brandKitService.defaultKitCreate(userData);
    } else {
      if ((data && Object.keys(data.otherData).length <= 0 && data.color.length <= 0)) {
        const { data, error } = await this.brandKitService.createWidgetKit({ url: userData.domain }, userData, null);
        if (error) {
          await this.brandKitService.defaultKitCreate(userData);
        }
      }
    }
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
