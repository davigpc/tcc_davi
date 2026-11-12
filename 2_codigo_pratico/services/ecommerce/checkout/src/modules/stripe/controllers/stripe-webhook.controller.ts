import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { StripeWebhookService } from '@stripe/services/stripe-webhook.service';
import { StripePaymentService } from '@stripe/services/stripe-payment.service';

@ApiTags('Stripe Webhook')
@Controller('webhook')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  public constructor(
    private readonly stripeService: StripePaymentService,
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Handle incoming Stripe events' })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Signature from Stripe to verify the request',
    required: true,
  })
  public async handleIncomingEvents(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    this.logger.debug(`Received Stripe event with signature: ${signature}`);

    const event = await this.stripeService.constructEventFromPayload(
      signature,
      request.rawBody,
    );

    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        this.logger.log(`Subscription updated for customer: ${event.id}`);
        return this.stripeWebhookService.processSubscriptionUpdate(event);

      case 'payment_intent.created':
        await this.stripeWebhookService.processPaymentSucceeded(event);

      case 'payment_intent.succeeded':
        this.logger.log(`Payment succeeded for payment intent: ${event.id}`);
        await this.stripeWebhookService.processPaymentSucceeded(event);

      case 'payment_intent.payment_failed':
        this.logger.warn(`Payment failed for payment intent: ${event.id}`);

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }
  }
}
