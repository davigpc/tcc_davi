import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryService } from '@inventory/services/inventory.service';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { AccessTokenModule } from '@shared/guards/access-token.module';
import { StripePaymentService } from '@stripe/services/stripe-payment.service';
import { CatalogoClient } from '@clients/catalogo.client';
import { ClientesClient } from '@clients/clientes.client';
import { ComunicacaoClient } from '@clients/comunicacao.client';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    AccessTokenModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    InventoryService,
    StripePaymentService,
    CatalogoClient,
    ClientesClient,
    ComunicacaoClient,
  ],
  exports: [OrderService],
})
export class OrderModule {}
