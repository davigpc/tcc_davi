import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderModule } from '@order/order.module';
import { AccessTokenModule } from '@shared/guards/access-token.module';
import { ClientesClient } from '@clients/clientes.client';
import { StripePaymentController } from './controllers/stripe-payment.controller';
import { StripeSubscriptionController } from './controllers/stripe-subscription.controller';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { StripePaymentService } from './services/stripe-payment.service';
import { StripeSubscriptionService } from './services/stripe-subscription.service';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { StripeEvent, StripeEventSchema } from './schemas/stripe-event.schema';

@Module({
  imports: [
    AccessTokenModule,
    MongooseModule.forFeature([
      { name: StripeEvent.name, schema: StripeEventSchema },
    ]),
    OrderModule,
  ],
  controllers: [
    StripePaymentController,
    StripeSubscriptionController,
    StripeWebhookController,
  ],
  providers: [
    StripePaymentService,
    StripeSubscriptionService,
    StripeWebhookService,
    ClientesClient,
  ],
})
export class StripeModule {}
