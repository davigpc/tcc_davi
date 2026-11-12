import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ContactEmailDto } from '@email/dto/contact.email.dto';
import { EmailService } from '@email/services/email.service';

@ApiTags('Emails')
@Controller('emails')
export class EmailController {
  public constructor(private readonly emailService: EmailService) {}

  @Post('contact-us')
  @ApiOperation({ summary: 'Send a contact form submission email' })
  @ApiBody({ type: ContactEmailDto, description: 'Contact form data' })
  public async sendContactFormEmail(@Body() emailData: ContactEmailDto) {
    return this.emailService.sendContactFormEmail(emailData);
  }
}
