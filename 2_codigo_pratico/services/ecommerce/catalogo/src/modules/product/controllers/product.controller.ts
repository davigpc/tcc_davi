import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFiles,
  HttpStatus,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { CreateProductDto } from '@product/dto/create-product.dto';
import { UpdateProductDto } from '@product/dto/update-product.dto';
import { Product } from '@product/schemas/product.schema';
import { ProductService } from '@product/services/product.service';
import { LocalStorageService } from '@storages/services/local-storage.service';
import { PaginatedResourceDto } from '@search/dto/paginated-resource.dto';
import {
  Pagination,
  PaginationParams,
} from '@shared/decorators/pagination.decorator';
import {
  Filtering,
  FilteringParams,
} from '@shared/decorators/filtering.decorator';

@ApiTags('Products')
@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  public constructor(
    private readonly productService: ProductService,
    private readonly localStorage: LocalStorageService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images'))
  @ApiOperation({ summary: 'Create a product' })
  @ApiConsumes('multipart/form-data')
  public async createProduct(
    @UploadedFiles() images: Array<Express.Multer.File>,
    @Body() product: CreateProductDto,
  ): Promise<Product> {
    const imageUrls = await this.localStorage.uploadMultipleFiles(images);
    const productWithImages = { ...product, images: imageUrls };
    return this.productService.createProduct(productWithImages);
  }

  @Get()
  @ApiOperation({ summary: 'Get products by filters' })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Size of items per page',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'text',
    required: false,
    type: String,
    description: 'Text to search for',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Category to filter by',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successful retrieval of products',
    type: PaginatedResourceDto<Product>,
  })
  public async getAllProducts(
    @PaginationParams() pagination: Pagination,
    @FilteringParams() filters: Filtering,
    @Query('text') text: string,
  ) {
    this.logger.debug(
      `Getting products with filters: ${JSON.stringify(filters)} and pagination: ${JSON.stringify(pagination)}`,
    );
    if (text) {
      return this.productService.getProductBySearchQuery(pagination, text);
    } else {
      return this.productService.getProductByFilters(pagination, filters);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  public async getByProductById(@Param('id') id: string): Promise<Product> {
    return this.productService.getProductById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  public async updateProduct(
    @Param('id') id: string,
    @Body() product: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProduct(id, product);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID' })
  public async removeProduct(@Param('id') id: string): Promise<void> {
    return this.productService.remove(id);
  }
}
