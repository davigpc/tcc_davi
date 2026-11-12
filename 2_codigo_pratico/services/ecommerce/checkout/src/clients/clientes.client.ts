import { Injectable, Logger, NotFoundException } from '@nestjs/common';

/**
 * Cliente do serviço de Clientes.
 *
 * No snapshot final o banco é isolado: a validação do comprador vira chamada
 * HTTP no caminho de escrita do pedido e do carrinho.
 */
@Injectable()
export class ClientesClient {
  private readonly logger = new Logger(ClientesClient.name);

  private readonly clientesUrl =
    process.env.CLIENTES_URL ?? 'http://clientes:3001';

  public async assertUser(userId: string): Promise<void> {
    const response = await fetch(
      `${this.clientesUrl}/api/internal/users/${userId}`,
    );

    if (response.status === 404) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (!response.ok) {
      throw new Error(
        `Falha ao consultar o usuário ${userId}: ${response.status}`,
      );
    }
  }

  public async updateSubscriptionStatus(
    stripeCustomerId: string,
    status: string,
  ): Promise<void> {
    this.logger.log(
      `Atualizando assinatura do cliente ${stripeCustomerId} para ${status}`,
    );

    const response = await fetch(
      `${this.clientesUrl}/api/internal/users/subscription`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_customer_id: stripeCustomerId,
          status,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao atualizar a assinatura do cliente ${stripeCustomerId}: ${response.status}`,
      );
    }
  }
}
