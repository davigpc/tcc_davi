import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

/**
 * Gera o identificador de cliente do provedor de pagamento.
 *
 * No baseline o `StripePaymentService` local criava o customer com o mesmo
 * algoritmo, a partir do e-mail. A regra é determinística e sem estado, então o
 * serviço de Clientes repete o cálculo em vez de chamar a capacidade de Vendas
 * durante o registro.
 */
@Injectable()
export class CustomerIdService {
  public createCustomerId(email: string): string {
    const hash = createHash('sha1').update(email).digest('hex').slice(0, 16);
    return `cus_local_${hash}`;
  }
}
