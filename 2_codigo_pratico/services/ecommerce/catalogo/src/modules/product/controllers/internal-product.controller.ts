import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { StockAdjustmentDto } from '@product/dto/stock-adjustment.dto';
import { ProductService } from '@product/services/product.service';

/**
 * Rotas internas do Catálogo.
 *
 * Não passam pelo gateway: são chamadas direto pelos outros serviços, na rede do
 * compose. Depois do snapshot final o banco é isolado, então Vendas consulta o
 * produto (existência) e o preço por aqui, e baixa o estoque por aqui.
 */
@Controller('internal/products')
export class InternalProductController {
  public constructor(private readonly productService: ProductService) {}

  @Get(':id')
  public async getById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Post('batch')
  public async getMany(@Body() body: { ids: string[] }) {
    return this.productService.getProductsByIds(body.ids ?? []);
  }

  @Patch(':id/stock')
  public async decrementStock(
    @Param('id') id: string,
    @Body() body: StockAdjustmentDto,
  ) {
    return this.productService.decrementStock(id, body.quantity);
  }
}
