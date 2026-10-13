import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@database/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WarehousesModule } from './warehouses/interface/warehouses.module';
import { ProductsModule } from './products/interface/products.module';
import { MovementsModule } from './movements/interface/movements.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WarehousesModule,
    ProductsModule,
    MovementsModule,
    InternalModule,
  ],
})
export class AppModule {}
