import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmailService } from '@email/services/email.service';

/**
 * Rota interna da Comunicação.
 *
 * O serviço de Vendas pede o e-mail de confirmação do pedido por aqui, direto na
 * rede dos contêineres. Não passa pelo gateway.
 */
@ApiTags('Internal')
@Controller('internal/emails')
export class InternalEmailController {
  public constructor(private readonly emailService: EmailService) {}

  @Post('order-confirmation')
  @ApiOperation({ summary: 'Send order confirmation email' })
  public async sendOrderConfirmation(@Body() data: any): Promise<void> {
    await this.emailService.sendOrderConfirmationEmail(data);
  }
}
