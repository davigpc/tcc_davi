import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProductDto } from '@product/dto/create-product.dto';
import { UpdateProductDto } from '@product/dto/update-product.dto';
import { Product, ProductDocument } from '@product/schemas/product.schema';
import { SearchService } from '@search/services/search.service';
import { Pagination } from '@shared/decorators/pagination.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { clearCacheKeys } from '@shared/cache/clear.cache';

@Injectable()
export class ProductService {
  private readonly searchService: SearchService<ProductDocument>;
  public constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.searchService = new SearchService<ProductDocument>(productModel);
  }

  public async createProduct(
    createProductDto: CreateProductDto,
  ): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    await clearCacheKeys(this.cacheManager);
    return createdProduct.save();
  }

  public async getAllProducts(): Promise<Product[]> {
    return this.productModel.find().lean();
  }

  public async getProductById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).lean();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  /**
   * Consulta em lote usada pelo serviço de Vendas.
   *
   * Com o banco isolado, o carrinho não consegue popular o item nem ler o preço
   * na própria coleção. A composição da resposta passa a ser feita com esta
   * consulta HTTP.
   */
  public async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) {
      return [];
    }
    return this.productModel
      .find({ _id: { $in: ids } })
      .select('name price images stock seller')
      .lean();
  }

  public async getProductByFilters(
    pagination: Pagination,
    filters: {
      [key: string]: any;
    } = {},
  ): Promise<Product[]> {
    return this.searchService.searchWithPaginationAndFilters(
      pagination,
      filters,
    );
  }

  public async getProductBySearchQuery(
    pagination: Pagination,
    searchQuery: string,
  ): Promise<Product[]> {
    return this.searchService.searchWithPaginationAndText(
      pagination,
      searchQuery,
    );
  }

  public async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const existingProduct = await this.productModel.findByIdAndUpdate(
      id,
      updateProductDto,
      { new: true },
    );
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return existingProduct;
  }

  public async updateProductStock(
    productId: string,
    quantity: number,
    session: any,
  ): Promise<void> {
    await this.productModel.updateOne(
      { _id: productId },
      { $inc: { stock: -quantity } },
      { session },
    );
    await clearCacheKeys(this.cacheManager);
  }

  /**
   * Baixa de estoque chamada pelo monólito pela rota interna.
   *
   * Sem sessão: o banco é compartilhado, mas o chamador está em outro processo,
   * então a escrita não participa da transação do pedido.
   */
  public async decrementStock(
    productId: string,
    quantity: number,
  ): Promise<{ id: string; stock: number }> {
    const product = await this.productModel
      .findOneAndUpdate(
        { _id: productId },
        { $inc: { stock: -quantity } },
        { new: true },
      )
      .lean();

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    await clearCacheKeys(this.cacheManager);
    return { id: productId, stock: product.stock };
  }

  public async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await clearCacheKeys(this.cacheManager);
  }
}
