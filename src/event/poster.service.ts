import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import getColors from 'get-image-colors';

@Injectable()
export class PosterService {
  constructor(private configService: ConfigService) {}
  async extractDominantColors(
    imageUrl: string,
    numColors = 3,
  ): Promise<string[]> {
    try {
      const getColorsModule = await import('get-image-colors');
      const getColors = getColorsModule.default || getColorsModule;
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const buffer = Buffer.from(response.data, 'binary');
      // Validate buffer start (SOI marker for JPEG and PNG)
      const isJpeg =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      if (!isJpeg && !isPng) {
        throw new Error('Invalid image format');
      }
      const imageType = isJpeg ? 'image/jpeg' : 'image/png';
      const colors = await getColors(buffer, { type: imageType });
      return colors.slice(0, numColors).map((color) => color.hex());
    } catch (error) {
      console.error('Error extracting dominant colors:', error);
      throw new HttpException(
        'Failed to extract colors',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async generateCustomPoster(
    eventName: string,
    imageUrl: string,
    participationType: string,
  ) {
    const width = 600;
    const height = 300;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    try {
      const dominantColors = (await this.extractDominantColors(imageUrl)) || [
        '#000000',
      ];
      const gradient = context.createLinearGradient(0, 0, width, 0);
      dominantColors.forEach((color, index) => {
        gradient.addColorStop(index / (dominantColors.length - 1), color);
      });
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'destination-in';
      context.beginPath();
      context.moveTo(10, 0);
      context.lineTo(width - 10, 0);
      context.quadraticCurveTo(width, 0, width, 10);
      context.lineTo(width, height - 10);
      context.quadraticCurveTo(width, height, width - 10, height);
      context.lineTo(10, height);
      context.quadraticCurveTo(0, height, 0, height - 10);
      context.lineTo(0, 10);
      context.quadraticCurveTo(0, 0, 10, 0);
      context.closePath();
      context.fill();
      context.globalCompositeOperation = 'source-over';
      const userPoster = await loadImage(imageUrl);
      const imageWidth = 250;
      const imageHeight = 250;
      const imageX = width - imageWidth - 20;
      const imageY = (height - imageHeight) / 2;
      context.shadowColor = '#171717';
      context.shadowBlur = 15;
      context.shadowOffsetX = 4;
      context.shadowOffsetY = 4;
      context.beginPath();
      context.moveTo(imageX + 15, imageY);
      context.lineTo(imageX + imageWidth - 15, imageY);
      context.quadraticCurveTo(
        imageX + imageWidth,
        imageY,
        imageX + imageWidth,
        imageY + 15,
      );
      context.lineTo(imageX + imageWidth, imageY + imageHeight - 15);
      context.quadraticCurveTo(
        imageX + imageWidth,
        imageY + imageHeight,
        imageX + imageWidth - 15,
        imageY + imageHeight,
      );
      context.lineTo(imageX + 15, imageY + imageHeight);
      context.quadraticCurveTo(
        imageX,
        imageY + imageHeight,
        imageX,
        imageY + imageHeight - 15,
      );
      context.lineTo(imageX, imageY + 15);
      context.quadraticCurveTo(imageX, imageY, imageX + 15, imageY);
      context.closePath();
      context.fill();
      context.shadowColor = 'transparent';
      context.save();
      context.beginPath();
      context.moveTo(imageX + 15, imageY);
      context.lineTo(imageX + imageWidth - 15, imageY);
      context.quadraticCurveTo(
        imageX + imageWidth,
        imageY,
        imageX + imageWidth,
        imageY + 15,
      );
      context.lineTo(imageX + imageWidth, imageY + imageHeight - 15);
      context.quadraticCurveTo(
        imageX + imageWidth,
        imageY + imageHeight,
        imageX + imageWidth - 15,
        imageY + imageHeight,
      );
      context.lineTo(imageX + 15, imageY + imageHeight);
      context.quadraticCurveTo(
        imageX,
        imageY + imageHeight,
        imageX,
        imageY + imageHeight - 15,
      );
      context.lineTo(imageX, imageY + 15);
      context.quadraticCurveTo(imageX, imageY, imageX + 15, imageY);
      context.closePath();
      context.clip();
      context.drawImage(userPoster, imageX, imageY, imageWidth, imageHeight);
      context.restore();
      const logoPath = 'src/event/logo.png';
      const logo = await loadImage(logoPath);
      context.drawImage(logo, 20, 20, 130, 44);
      context.font = 'bold 20px Arial';
      context.fillStyle = '#ffffff';
      context.textAlign = 'left';
      this.wrapText(context, eventName, 20, 114, 300, 25);
      context.font = 'regular 14px Arial';
      context.fillText(participationType, 20, 214);
      const mediaHost = this.configService.get('MEDIA_STORAGE_DOMAIN') ?? '';
      const buffer = canvas.toBuffer('image/png');
      const fileName =
        randomUUID() + 'card' + new Date().toISOString() + '.jpg';
      const dir = path.resolve('./public/temp/');
      console.log(dir + '/' + fileName, fileName);
      await fs.promises.writeFile(dir + '/' + fileName, buffer);
      //   fs.writeFileSync(outputPath, buffer);
      console.log(`Poster generated and saved at ${fileName}`);
      return mediaHost + '/public/' + fileName;
    } catch (error) {
      console.error('Error generating poster:', error);
      //   throw error;
    }
  }
  wrapText(
    context,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
  ) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, x, y);
  }
}
