import { Injectable, Logger } from '@nestjs/common';

export interface OrderConfirmationEmail {
  email: string;
  name: string;
  orderId: string;
  items: unknown[];
  total: number;
}

/**
 * Cliente HTTP da capacidade de Comunicação.
 *
 * O envio do e-mail de confirmação saiu do processo de Vendas junto com a
 * extração da capacidade. A chamada vai direto pela rede dos contêineres.
 */
@Injectable()
export class ComunicacaoClient {
  private readonly logger = new Logger(ComunicacaoClient.name);

  private readonly comunicacaoUrl =
    process.env.COMUNICACAO_URL ?? 'http://comunicacao:3001';

  public async sendOrderConfirmation(
    data: OrderConfirmationEmail,
  ): Promise<void> {
    this.logger.log(`Solicitando e-mail de confirmação do pedido ${data.orderId}`);

    const response = await fetch(
      `${this.comunicacaoUrl}/api/internal/emails/order-confirmation`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao enviar o e-mail do pedido ${data.orderId}: ${response.status}`,
      );
    }
  }
}
