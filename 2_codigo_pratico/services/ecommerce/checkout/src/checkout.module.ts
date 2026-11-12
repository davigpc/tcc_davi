import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { MongooseModule } from '@nestjs/mongoose';
import mongoConfig from '@config/mongo.config';
import { CartModule } from '@cart/cart.module';
import { OrderModule } from '@order/order.module';
import { StripeModule } from '@stripe/stripe.module';
import { HealthController } from './modules/health/health.controller';

/**
 * Serviço de Checkout (Transações / snapshot-1).
 *
 * Contém carrinho, frete, pedido, estoque e pagamento, que é o grupo cuja
 * escrita precisa ser atômica. O MongoDB ainda é o do monólito: a baixa de
 * estoque roda na mesma sessão da mudança de status do pedido.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mongoConfig,
      inject: [ConfigService],
    }),
    CacheModule.register({ isGlobal: true }),
    CartModule,
    OrderModule,
    StripeModule,
  ],
  controllers: [HealthController],
})
export class CheckoutModule {}
