import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripePaymentService } from '@stripe/services/stripe-payment.service';

@Injectable()
export class StripeSubscriptionService {
  private readonly logger = new Logger(StripeSubscriptionService.name);

  public constructor(
    private readonly stripeService: StripePaymentService,
    private readonly configService: ConfigService,
  ) {}

  public async createMonthlySubscription(customerId: string) {
    this.logger.log(`Creating monthly subscription for customer ${customerId}`);
    const subscription = await this.getSubscription(customerId);

    if (subscription) {
      this.logger.warn(`Customer ${customerId} already subscribed`);
      throw new BadRequestException('Customer already subscribed');
    }
    const priceId = this.configService.get('MONTHLY_SUBSCRIPTION_priceId');
    const newSubscription = await this.stripeService.createSubscription(
      priceId,
      customerId,
    );
    this.logger.log(`Subscription created for customer ${customerId}`);
    return newSubscription;
  }

  public async getMonthlySubscription(customerId: string) {
    this.logger.log(
      `Retrieving monthly subscription for customer ${customerId}`,
    );
    const subscription = await this.getSubscription(customerId);

    if (!subscription) {
      this.logger.warn(`Customer ${customerId} not subscribed`);
      throw new NotFoundException('Customer not subscribed');
    }
    this.logger.log(`Subscription found for customer ${customerId}`);
    return subscription;
  }

  private async getSubscription(customerId: string) {
    this.logger.log(`Checking subscription for customer ${customerId}`);
    const priceId = this.configService.get('MONTHLY_SUBSCRIPTION_priceId');
    const subscriptions = await this.stripeService.listSubscriptions(
      priceId,
      customerId,
    );

    const subscription = subscriptions.data.length
      ? subscriptions.data[0]
      : null;
    if (subscription) {
      this.logger.log(`Subscription found for customer ${customerId}`);
    } else {
      this.logger.log(`No subscription found for customer ${customerId}`);
    }
    return subscription;
  }
}
