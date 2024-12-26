import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY') ?? '');
  }
  private async mailSending(msg) {
    try {
      await sgMail.send(msg);
      console.log('Email sent successfully');
      return { data: { message: 'OTP send' } };
    } catch (error) {
      console.error('Error sending email:', error);
      return { error: JSON.stringify(error) };
    }
  }
  async otpMail(otp: string, msg:any) {
    const otpArray: string[] = otp.split('');
    return await this.mailSending(msg);
  }
  async exportMail(to: string, from: string, html: string, subject: string) {
    const msg = {
      to,
      from: from,
      subject,
      html,
    };
    return await this.mailSending(msg);
  }
  async resetMail(to: string, from: string, html: string, subject: string) {
    const msg = {
      to,
      from: from,
      subject,
      html,
    };
    return await this.mailSending(msg);
  }
  async accesstracker(to: string, from: string, html: string, subject: string) {
    const msg = {
      to,
      from: from,
      subject,
      html,
    };
    return await this.mailSending(msg);
  }
  async intendeEmail(to: string, from: string, html: string, subject: string) {
    const msg = {
      to,
      from: from,
      subject,
      html,
    };
    return await this.mailSending(msg);
  }
}
