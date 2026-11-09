import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogoClient } from '@clients/catalogo.client';
import { ClientesClient } from '@clients/clientes.client';
import { Cart, CartSchema } from './schemas/cart.schema';
import { CartService } from './services/cart.service';
import { CartController } from './controllers/cart.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cart.name, schema: CartSchema }]),
  ],
  controllers: [CartController],
  providers: [CartService, CatalogoClient, ClientesClient],
})
export class CartModule {}
