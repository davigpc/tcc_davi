import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { InventoryService } from '@inventory/services/inventory.service';
import { CreateOrderDto } from '@order/dto/create-order.dto';
import { OrderStatus } from '@order/enums/order-status.enum';
import { Order, OrderDocument } from '@order/schemas/order.schema';
import { StripePaymentService } from '@stripe/services/stripe-payment.service';
import { CatalogoClient } from '@clients/catalogo.client';
import { ClientesClient } from '@clients/clientes.client';
import { ComunicacaoClient } from '@clients/comunicacao.client';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name, {
    timestamp: true,
  });

  public constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
    private readonly comunicacaoClient: ComunicacaoClient,
    private readonly stripeService: StripePaymentService,
    private readonly catalogoClient: CatalogoClient,
    private readonly clientesClient: ClientesClient,
  ) {}

  public async placeOrder(
    order: CreateOrderDto,
    stripeCustomerId: string,
  ): Promise<{ client_secret: string }> {
    this.logger.log(
      `Placing order for customer ${stripeCustomerId} with amount ${order.amount}`,
    );
    const newOrder = await this.createOrder(order);

    const paymentIntent = await this.stripeService.createPaymentIntent(
      order.amount,
      { order_id: newOrder._id.toString() },
      stripeCustomerId,
    );

    this.logger.log(
      `Order placed successfully for customer ${stripeCustomerId}`,
    );
    return { client_secret: paymentIntent.client_secret };
  }

  public async getOrderWithItemsById(orderId: string): Promise<any> {
    this.logger.log(`Fetching order with ID: ${orderId}`);
    const order = await this.orderModel.findById(orderId).lean();

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const products = await this.catalogoClient.getProducts(
      order.items.map((item) => String(item.id)),
    );

    this.logger.log(`Order with ID ${orderId} fetched successfully`);
    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        id: products.get(String(item.id)) ?? String(item.id),
      })),
    };
  }

  public async processOrder(
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    this.logger.log(
      `Processing order with ID: ${orderId} to status: ${status}`,
    );
    const session = await this.orderModel.db.startSession();
    session.startTransaction();
    try {
      const order = await this.updateOrder(orderId, { status }, session);
      await this.updateInventory(order.items);
      await session.commitTransaction();
      this.logger.log(`Order with ID ${orderId} processed successfully`);
      await this.comunicacaoClient.sendOrderConfirmation({
        email: order.billing_details?.email,
        name: order.billing_details?.name,
        orderId: orderId,
        items: order.items,
        total: order.amount,
      });
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Failed to process order with ID: ${orderId}`,
        error.stack,
      );
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Valida comprador e itens antes de gravar.
   *
   * Com o banco isolado, o usuário pertence ao Clientes e o item ao Catálogo.
   * A validação deixou de ser um `exists` local e passou a ser duas chamadas
   * HTTP dentro do caminho de escrita do pedido.
   */
  private async createOrder(order: CreateOrderDto): Promise<OrderDocument> {
    this.logger.log(`Creating new order`);

    await this.clientesClient.assertUser(String(order.customer));
    await this.assertItems(order);

    const newOrder = new this.orderModel(order);
    await newOrder.save();
    this.logger.log(`Order created with ID: ${newOrder._id}`);
    return newOrder;
  }

  private async assertItems(order: CreateOrderDto): Promise<void> {
    for (const item of order.items) {
      await this.catalogoClient.getProduct(String(item.id));
    }
  }

  private async updateOrder(
    orderId: string,
    data: Partial<OrderDocument>,
    session: ClientSession,
  ): Promise<Order> {
    this.logger.log(`Updating order with ID: ${orderId}`);
    const order = await this.orderModel.findOneAndUpdate(
      { _id: orderId },
      data,
      { new: true, session },
    );

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    this.logger.log(`Order with ID ${orderId} updated successfully`);
    return order;
  }

  private async updateInventory(items: any[]): Promise<void> {
    this.logger.log(`Updating inventory for items`);
    await this.inventoryService.updateInventory(items);
  }
}
