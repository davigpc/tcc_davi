import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocalStorageService } from '@storages/services/local-storage.service';
import { ProductService } from './services/product.service';
import { ProductController } from './controllers/product.controller';
import { InternalProductController } from './controllers/internal-product.controller';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  controllers: [ProductController, InternalProductController],
  providers: [ProductService, LocalStorageService],
  exports: [ProductService],
})
export class ProductModule {}
