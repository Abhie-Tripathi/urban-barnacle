import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY') ?? '');
  }
  private async mailSending(msg: {
    from: string;
    to: string;
    subject: string;
    html: any;
  }) {
    try {
      const mail = await sgMail.send(msg);
      console.log(mail);
      console.dir(mail, { depth: null });
      console.log('Email sent successfully');
      return { data: { message: 'OTP send' } };
    } catch (error) {
      console.error('Error sending email:', error);
      return { error: JSON.stringify(error) };
    }
  }
  async mailSender(to: string, from: string, subject: string, html: any, attachments: any[] | null = null) {
    console.log({ attachments });

    return await this.mailSending({
      to: to,
      from: from,
      subject: subject,
      html: html,
      ...(attachments && attachments.length > 0 ? { attachments } : {})
    });
  }
  private async multiMailSending(msg: {
    from: string;
    to: string[];
    subject: string;
    html: any;
  }) {
    try {
      await sgMail.sendMultiple(msg);
      console.log('Email sent successfully');
      return { data: { message: 'OTP send' } };
    } catch (error) {
      console.error('Error sending email:', error);
      console.error("SendGrid Error:", error.response?.body?.errors || error);
      return { error: JSON.stringify(error) };
    }
  }
  async multiMailSender(
    to: string[],
    from: string,
    subject: string,
    html: any,
    attachments: any[] | null = null
  ) {
    return await this.multiMailSending({
      to: to,
      from: from,
      subject: subject,
      html: html,
      ...(attachments ? { attachments } : {})
    });
  }
}
