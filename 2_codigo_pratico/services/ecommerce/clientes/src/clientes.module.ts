import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import mongoConfig from '@config/mongo.config';
import { AuthModule } from '@auth/auth.module';
import { TokenModule } from '@token/token.module';
import { UserModule } from '@user/user.module';
import { AddressModule } from '@address/address.module';
import { HealthController } from './modules/health/health.controller';

/**
 * Serviço de Clientes (Capacidade de Negócio / snapshot-2).
 *
 * Contém identidade, sessão e endereço do comprador: `auth`, `token`, `user` e
 * `address`. O armazenamento local acompanha o `user` porque a foto de perfil é
 * gravada na mesma capacidade.
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
    AuthModule,
    TokenModule,
    UserModule,
    AddressModule,
  ],
  controllers: [HealthController],
})
export class ClientesModule {}
