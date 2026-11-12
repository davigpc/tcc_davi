import { ContactEmailDto } from '@email/dto/contact.email.dto';

export interface IEmailService {
  sendContactFormEmail(
    emailData: ContactEmailDto,
  ): Promise<{ message: string }>;
}
