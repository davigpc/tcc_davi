import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderService } from '@order/services/order.service';
import {
  StripeEvent,
  StripeEventDocument,
} from '@stripe/schemas/stripe-event.schema';
import { LocalStripeEvent } from '@stripe/interfaces/stripe-event.interface';
import { ClientesClient } from '@clients/clientes.client';
import { OrderStatus } from '@order/enums/order-status.enum';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  public constructor(
    @InjectModel(StripeEvent.name)
    private readonly eventModel: Model<StripeEventDocument>,
    private readonly clientesClient: ClientesClient,
    private readonly orderService: OrderService,
  ) {}

  public async createStripeEvent(eventId: string): Promise<StripeEvent> {
    this.logger.log(`Creating event with ID: ${eventId}`);
    const stripeEvent = new this.eventModel({ event_id: eventId });
    try {
      await stripeEvent.save();
      this.logger.log(`Event with ID: ${eventId} created successfully`);
    } catch (error) {
      if (error.code === 11000) {
        this.logger.warn(`Event with ID: ${eventId} was already processed`);
        throw new BadRequestException('This event was already processed');
      }
      this.logger.error(
        `Error creating event with ID: ${eventId}`,
        error.stack,
      );
      throw error;
    }
    return stripeEvent;
  }

  public async processSubscriptionUpdate(event: LocalStripeEvent) {
    this.logger.log(`Processing subscription update for event ID: ${event.id}`);
    await this.createStripeEvent(event.id);

    const data = event.data.object as { customer: string; status: string };
    const customerId: string = data.customer;
    const subscriptionStatus = data.status;

    this.logger.log(
      `Updating subscription status for customer ID: ${customerId} to ${subscriptionStatus}`,
    );
    try {
      await this.clientesClient.updateSubscriptionStatus(
        customerId,
        subscriptionStatus,
      );
      this.logger.log(
        `Subscription status for customer ID: ${customerId} updated successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating subscription status for customer ID: ${customerId}`,
        error.stack,
      );
      throw error;
    }
  }

  public async processPaymentSucceeded(event: LocalStripeEvent) {
    this.logger.log(`Processing payment succeeded for event ID: ${event.id}`);
    await this.createStripeEvent(event.id);

    const data = event.data.object as {
      metadata: { order_id: string };
    };
    const orderId = data.metadata.order_id;

    this.logger.log(
      `Processing order ID: ${orderId} with status: ${OrderStatus.PAID}`,
    );
    try {
      await this.orderService.processOrder(orderId, OrderStatus.PAID);
      this.logger.log(
        `Order ID: ${orderId} processed successfully with status: ${OrderStatus.PAID}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing order ID: ${orderId} with status: ${OrderStatus.PAID}`,
        error.stack,
      );
      throw error;
    }
  }
}
