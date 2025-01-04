import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWidgetKitDto, UpdateWidgetKitDto } from './dto';
import { TCachedUser } from 'src/shared/types';
import { File } from '@nest-lab/fastify-multer';
import * as fs from 'fs';
import * as getImageColors from 'get-image-colors';
import puppeteer from 'puppeteer';
import { FileCreationService } from 'src/shared/file-creation.service';

@Injectable()
export class KitService {
  private userId: string;
  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService,
    private readonly fileService: FileCreationService,
  ) {}
  async getFontFamily(url: string) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_PATH,
      });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });

      const fontFamilies: string[] = await page.evaluate(() => {
        const allStyles: any[] = [];
        const nodes = document.body.getElementsByTagName('*');
        for (let i = 0; i < nodes.length; i++) {
          const style = window.getComputedStyle(nodes[i]).fontFamily;
          if (style && allStyles.indexOf(style) === -1) {
            allStyles.push(style);
          }
        }
        return allStyles;
      });

      console.log('Font Families:', fontFamilies);
      await browser.close();

      return { fontFamilies };
    } catch (error) {
      console.error('Error fetching font family:', error);
      return { fontFamilies: [] };
      // throw new HttpException(
      //   'Internal Server Error',
      //   HttpStatus.INTERNAL_SERVER_ERROR,
      // );
    }
  }

  async fetchLogoURL(domain) {
    console.log('domain', domain);

    const clearbitURL = `https://img.logo.dev/${domain}?token=pk_fNO6abUPT72mIx0CoSeW1w`;
    return clearbitURL;
  }
  //  to download the logo
  async downloadImage(url, imagePath, flag: string) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image. Status: ${response.status}`);
    }

    const fileName = `${randomUUID() + new Date().toISOString()}.${flag}`; // or any other logic to generate file name
    // const filePath = join(__dirname, '..', 'uploads', fileName);
    const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
    const dir = './public/temp/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const writer = fs.createWriteStream(dir + fileName);
    // response.body?.
    console.log();
    const picData = await response.arrayBuffer();
    if (picData !== undefined) {
      const buffer = Buffer.from(picData);
      await fs.promises.writeFile(dir + fileName, buffer);
      const upload = await this.prisma.attachment.create({
        data: {
          fileName: fileName,
          fileType: 'IMAGE',
          fileUrl: mediaHost + '/public/' + fileName,
          sourceId: 'kit',
          fileSize: 0,
          sourceModule: 'BRANDKIT',
          createdByUser: { connect: { id: this.userId } },
        },
        select: {
          id: true,
        },
      });
    }
    return mediaHost + '/public/' + fileName;
  }

  //  to extract colors from the downloaded logo
  async extractColors(imagePath) {
    console.log('imagePath', imagePath);

    const colors = await getImageColors(imagePath);
    return colors.map((color) => color.hex());
  }

  // Main
  async fetchColorsFromLogo(domain: string) {
    try {
      const extractDomain: string = domain
        .replace('http://', '')
        .replace('https://', '')
        .replace('www.', '');
      const baseURL = this.configService.get('API10TIMES') || '';
      const endpoint = 'v4/company/detail';
      const queryString = new URLSearchParams({
        website: extractDomain.split('/')[0],
        infoType: 'basic',
      } as unknown as Record<string, string>).toString();

      const url = `${baseURL}${endpoint}?${queryString}&username=${
        this.configService.get('USERNAME10TIMES') || ''
      }&password=${this.configService.get('PASSWORD10TIMES') || ''}`;
      console.log(url);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const [checkBrandKitExist, checkBrandKitupdate] = await Promise.all([
        this.prisma.brand.findFirst({
          where: {
            domain:  extractDomain.split('/')[0],
            deleted: false,
            updateAt: { gte: threeMonthsAgo },
          },
        }),
        this.prisma.brand.findFirst({
          where: {
            domain:  extractDomain.split('/')[0],
            deleted: false,
          },
        }),
      ]);
      let flagForBrand: Boolean = false;
      if (checkBrandKitExist) {
        flagForBrand = true;
      }
      let logoUrl: string = '';
      if (flagForBrand) {
        logoUrl = checkBrandKitExist.logoUrl;
      } else {
        const response = await fetch(url, {
          method: 'GET',
        });
        let logoResponse = (await response.json()) as {
          data: {
            id: number;
            name: string;
            logo?: string;
            vqCompanyLogo?: string;
            company: string;
          };
        };
        console.log('logoResponse.data?.logo', logoResponse.data?.logo);

        const logoURL: string = logoResponse.data?.logo
          ? logoResponse.data.logo
          : await this.fetchLogoURL(domain);
        const imagePath = './public/temp';
        console.log('logoURL', logoURL);
        let flag: string = '';
        if (logoResponse.data?.logo) {
          flag = logoURL.substring(logoURL.lastIndexOf('.') + 1);
        } else {
          flag = 'jpg';
        }
        const finalImagePath: string = await this.downloadImage(
          logoURL,
          imagePath,
          flag,
        );
        console.log('finalImagePath', finalImagePath);

        await this.prisma.brand.upsert({
          where: {
            domain: extractDomain.split('/')[0],
          },
          create: {
            domain: extractDomain.split('/')[0],
            name: extractDomain.split('.')[0],
            logoUrl: finalImagePath,
          },
          update: {
            logoUrl: finalImagePath,
          },
        });
        logoUrl = finalImagePath;
      }
      console.log('finalImagePath', logoUrl);

      console.log('Colors for ', domain);
      return { image: logoUrl };
    } catch (error) {
      console.error('Error fetching colors from logo:', error);
    }
  }
  async createWidgetKit(
    createWidgetKitDto: CreateWidgetKitDto,
    user: TCachedUser,
    file: File,
  ) {
    try {
      this.userId = user.id;
      console.time('start');
      const [check0] = await Promise.all([
        this.prisma.widget.count({
          where: {
            createdBy: user.id,
            status: { in: ['active', 'draft'] },
            deleted: false,
          },
        }),
      ]);
      if (check0 > 0) {
        console.log('check');

        return '';
      }
      const check3 = await this.prisma.customBrandKit.findUnique({
        where: {
          accountId: user.accountId,
        },
        select: {
          id: true,
          otherData: true,
        },
      });

      let obj: any = {};
      obj = { ...(check3?.otherData as object) };
      console.table(check3);

      if (!check3) {
        await this.prisma.customBrandKit.create({
          data: {
            account: { connect: { id: user.accountId } },
            data: {
              domain: createWidgetKitDto.url,
            },
            user: { connect: { id: user.id } },
          },
        });
      } else {
        await this.prisma.customBrandKit.update({
          where: {
            accountId: user.accountId,
          },
          data: {
            color: null,
            fontFamily: null,
            logoUrl: null,
            data: { domain: createWidgetKitDto.url },
            otherData: {},
            deleted: false,
          },
        });
      }

      // if (check0 > 0) {
      //   const check = await this.prisma.customBrandKit.findUnique({
      //     where: {
      //       companyId: user.companyId ?? '',
      //       published: true,
      //     },
      //     select: {
      //       id: true,
      //       logoUrl: true,
      //     },
      //   });
      //   if (check?.logoUrl) {
      //     console.log('record alredy exists');
      //     return '';
      //   }
      // }
      const [fetchFontFamily, fetchimage] = await Promise.all([
        this.getFontFamily(createWidgetKitDto.url),
        this.fetchColorsFromLogo(
          createWidgetKitDto.url
            .replace('https://', '')
            .replace('http://', '')
            .replace('www.', ''),
        ),
      ]);
      console.log('fetchimage', fetchimage);

      // const fetchimage = await this.fetchColorsFromLogo(
      //   createWidgetKitDto.url
      //     .replace('https://', '')
      //     .replace('http://', '')
      //     .replace('www.', ''),
      // );
      const colors: string[] = await this.extractColors(
        './public/temp' +
          fetchimage?.image?.substring(fetchimage?.image?.lastIndexOf('/')),
      );
      let data: any = {};
      // const check2 = await this.prisma.customBrandKit.findUnique({
      //   where: {
      //     companyId: company[0].id,
      //     // published: false,
      //   },
      //   select: {
      //     id: true,
      //     otherData: true,
      //   },
      // });
      console.log('check3', check3, { obj });
      // if (check3?.otherData) obj = {};
      // if (check2?.id) {
      //   const data = await this.prisma.customBrandKit.update({
      //     where: {
      //       companyId: company[0].id,
      //     },
      //     data: {
      //       color: colors?.join(','),
      //       fontFamily: fetchFontFamily?.fontFamilies?.join(','),
      //       logoUrl: fetchimage?.image,
      //       data: { domain: createWidgetKitDto.url },
      //       otherData: {
      //         ['domain' + 0]: createWidgetKitDto.url,
      //       },
      //       published: true,
      //     },
      //   });
      //   console.log('updaet 1');
      // } else {
      data = await this.prisma.customBrandKit.update({
        where: {
          accountId: user.accountId,
        },
        data: {
          // companyId: user?.companyId ?? '',
          color: colors?.join(','),
          fontFamily: fetchFontFamily?.fontFamilies?.join(','),
          logoUrl: fetchimage?.image,
          data: { domain: createWidgetKitDto.url },
          otherData: {
            ['domain' + Object.keys(obj).length]: createWidgetKitDto.url,
            ...(obj || {}),
          },
        },
      });
      // }
      console.log(
        'updaet ',
        obj,
        { length: Object.keys(obj).length },
        {
          test: 'test',
          ['domain' + Object.keys(obj).length]: createWidgetKitDto.url,
        },
        obj,
      );
      console.timeEnd('start');
      return { data: { message: 'data inserted', data: data.id } };
    } catch (error) {
      console.error('' + error);
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
  // async updateWidgetKit(
  //   uopdateWidgetKitDto: UpdateWidgetKitDto,
  //   file: File,
  //   user: TCachedUser,
  // ) {
  //   try {
  //     const logodata = await this.prisma.customBrandKit.findFirst({
  //       where: {
  //         accountId: user.accountId,
  //         deleted: false,
  //       },
  //       select: {
  //         id: true,
  //         logoUrl: true,
  //       },
  //     });
  //     if (!logodata?.id) {
  //       return {
  //         error: new HttpException('kit not found', HttpStatus.NOT_FOUND),
  //       };
  //     }
  //     let logoURL: any = {};
  //     if (file) {
  //       const fileName = `${randomUUID() + new Date().toISOString()}.jpg`;
  //       const { error, fileData } = await this.fileService.createFile(
  //         fileName,
  //         file,
  //         user.id,
  //         'IMAGE',
  //         'BRANDKIT',
  //         logodata.id,
  //       );
  //       if (error) {
  //         return error;
  //       }

  //       let logo = '';
  //       // if (
  //       //   uopdateWidgetKitDto.logoUrl &&
  //       //   logodata?.logoUrl?.includes(
  //       //     uopdateWidgetKitDto.logoUrl ?? '&^%$#@@@@@@#$',
  //       //   )
  //       // ) {
  //       //   logo = logodata?.logoUrl?.replace(
  //       //     (uopdateWidgetKitDto.logoUrl || '') + ',',
  //       //     attachmenId.filePath,
  //       //   );
  //       // } else {
  //       logo = fileData.fileUrl;
  //       // }
  //       logoURL['logoUrl'] = logo;
  //       uopdateWidgetKitDto.color = (
  //         (await this.extractColors(
  //           './public/temp' + logo.substring(logo.lastIndexOf('/')),
  //         )) as string[]
  //       ).join(',');
  //     } else {
  //       if (
  //         uopdateWidgetKitDto.logoUrl &&
  //         logodata?.logoUrl?.includes(
  //           uopdateWidgetKitDto.logoUrl || '&^%$#@@@@@@#$',
  //         )
  //       ) {
  //         logoURL['logoUrl'] = logodata?.logoUrl?.replace(
  //           (uopdateWidgetKitDto.logoUrl || '') + ',',
  //           '',
  //         );
  //       } else {
  //         logoURL['logoUrl'] = logodata?.logoUrl;
  //       }
  //     }
  //     const data = await this.prisma.customBrandKit.update({
  //       where: {
  //         accountId: user.accountId,
  //       },
  //       data: {
  //         ...uopdateWidgetKitDto,
  //         ...logoURL,
  //       },
  //     });
  //     if (uopdateWidgetKitDto.published === false) {
  //       return { message: 'kit deleted' };
  //     }
  //     return {
  //       data: {
  //         message: 'data updated',
  //         data: {
  //           color: data.color,
  //           fontFamily: data.fontFamily,
  //           logo: data.logoUrl,
  //           data: data.data,
  //           otherData: data.otherData,
  //         },
  //       },
  //     };
  //   } catch (error) {
  //     console.log(error);

  //     return {
  //       error: new HttpException(
  //         'Internal Server down',
  //         HttpStatus.INTERNAL_SERVER_ERROR,
  //       ),
  //     };
  //   }
  // }
  async getKit(user: TCachedUser) {
    try {
      const data = await this.prisma.customBrandKit.findFirst({
        where: {
          accountId: user.accountId,
          deleted: false,
        },
        select: {
          color: true,
          fontFamily: true,
          logoUrl: true,
          data: true,
          otherData: true,
        },
      });
      return {
        data: {
          color: data?.color?.split(',').filter((val) => val.length > 0) ?? [],
          fontFamily:
            data?.fontFamily?.split(',').filter((val) => val.length > 0) ?? [],
          logo: data?.logoUrl?.split(',') ?? [],
          domain: data?.data ?? {},
          otherData: data?.otherData ?? {},
        },
      };
    } catch (error) {
      return {
        error: new HttpException(
          'Internal Server down',
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      };
    }
  }
}
