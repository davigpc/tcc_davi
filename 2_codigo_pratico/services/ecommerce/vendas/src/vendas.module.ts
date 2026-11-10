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
 * Serviço de Vendas (Capacidade de Negócio / snapshot final).
 *
 * Contém carrinho, frete, pedido, estoque e pagamento. O banco é próprio: as
 * validações de usuário e de produto saem por HTTP para Clientes e Catálogo.
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
export class VendasModule {}
