import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { StripeMetadata } from '@stripe/interfaces/metadata.interface';
import { LocalStripeEvent } from '@stripe/interfaces/stripe-event.interface';

export interface LocalCustomer {
  id: string;
  name: string;
  email: string;
}

export interface LocalPaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  customer: string;
  metadata: StripeMetadata;
  status: string;
}

export interface LocalSubscription {
  id: string;
  customer: string;
  status: string;
  items: {
    data: Array<{ price: string }>;
  };
}

/**
 * Substitui o Stripe por uma implementação local.
 *
 * O monólito original criava clientes, intenções de pagamento e assinaturas na
 * API do Stripe. Para o experimento, os mesmos métodos devolvem objetos
 * sintéticos e o webhook aceita um evento JSON sem verificação de assinatura.
 * Nenhuma chamada de rede é feita.
 */
@Injectable()
export class StripePaymentService {
  private readonly logger = new Logger(StripePaymentService.name);

  private readonly subscriptions = new Map<string, LocalSubscription[]>();

  public async createCustomer(
    name: string,
    email: string,
  ): Promise<LocalCustomer> {
    const id = `cus_local_${createHash('sha1')
      .update(email)
      .digest('hex')
      .slice(0, 16)}`;
    this.logger.log(`Local customer created: ${id} (${email})`);
    return { id, name, email };
  }

  public async createPaymentIntent(
    amount: number,
    metadata: StripeMetadata,
    customerId: string,
  ): Promise<LocalPaymentIntent> {
    const id = `pi_local_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const paymentIntent: LocalPaymentIntent = {
      id,
      client_secret: `${id}_secret_local`,
      amount: Math.round(amount * 100),
      currency: 'usd',
      customer: customerId,
      metadata,
      status: 'requires_confirmation',
    };
    this.logger.log(
      `Local payment intent created: ${id} for customer ${customerId}`,
    );
    return paymentIntent;
  }

  public async createSubscription(
    priceId: string,
    customerId: string,
  ): Promise<LocalSubscription> {
    const subscription: LocalSubscription = {
      id: `sub_local_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      customer: customerId,
      status: 'active',
      items: { data: [{ price: priceId }] },
    };
    const current = this.subscriptions.get(customerId) ?? [];
    current.push(subscription);
    this.subscriptions.set(customerId, current);
    this.logger.log(
      `Local subscription created: ${subscription.id} for customer ${customerId}`,
    );
    return subscription;
  }

  public async attachCreditCard(
    paymentMethodId: string,
    customerId: string,
  ): Promise<{ id: string; customer: string; payment_method: string; status: string }> {
    return {
      id: `seti_local_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      customer: customerId,
      payment_method: paymentMethodId,
      status: 'succeeded',
    };
  }

  public async listCreditCards(
    customerId: string,
  ): Promise<{ data: any[] }> {
    this.logger.log(`Listing local credit cards for customer ${customerId}`);
    return { data: [] };
  }

  public async listSubscriptions(
    priceId: string,
    customerId: string,
  ): Promise<{ data: LocalSubscription[] }> {
    const data = (this.subscriptions.get(customerId) ?? []).filter(
      (subscription) =>
        subscription.items.data.some((item) => item.price === priceId),
    );
    return { data };
  }

  public async constructEventFromPayload(
    signature: string,
    payload: Buffer,
  ): Promise<LocalStripeEvent> {
    this.logger.log(`Parsing local webhook event (signature: ${signature})`);
    try {
      const text = payload ? payload.toString('utf8') : '{}';
      return JSON.parse(text) as LocalStripeEvent;
    } catch {
      throw new BadRequestException('Invalid local event payload');
    }
  }
}
