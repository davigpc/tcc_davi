import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import path from 'path';
import { ContactEmailDto } from '@email/dto/contact.email.dto';
import { IEmailService } from '@email/interfaces/mail.service.interface';

@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly contactTemplatePath = path.join(
    __dirname,
    '../templates/contact.hbs',
  );

  public constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  public async sendContactFormEmail(
    emailData: ContactEmailDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Sending contact form email from ${emailData.email}`);
    try {
      await this.mailerService.sendMail({
        to: this.configService.get<string>('FEEDBACK_EMAIL'),
        subject: 'New Contact Form Submission',
        template: this.contactTemplatePath,
        context: {
          name: emailData.name,
          email: emailData.email,
          subject: emailData.subject,
          message: emailData.message,
        },
      });
      this.logger.log(
        `Contact form email sent successfully from ${emailData.email}`,
      );
      return { message: 'Email sent successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to send contact form email from ${emailData.email}`,
        error.stack,
      );
      throw error;
    }
  }

  public async sendOrderConfirmationEmail(emailData: any): Promise<void> {
    this.logger.log(`Sending order confirmation email to ${emailData.email}`);
    try {
      await this.mailerService.sendMail({
        to: emailData.email,
        subject: 'Order Confirmation',
        template: path.join(__dirname, '../templates/order-confirmation.hbs'),
        context: {
          orderId: emailData.orderId,
          name: emailData.name,
          items: emailData.items,
          total: emailData.total,
        },
      });
      this.logger.log(
        `Order confirmation email sent successfully to ${emailData.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation email to ${emailData.email}`,
        error.stack,
      );
      throw error;
    }
  }
}
