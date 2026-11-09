import { Body, Controller, Param, Patch } from '@nestjs/common';
import { StockAdjustmentDto } from '@product/dto/stock-adjustment.dto';
import { ProductService } from '@product/services/product.service';

/**
 * Rota interna de baixa de estoque.
 *
 * Não passa pelo gateway: é chamada direto pelo monólito, na rede do compose.
 * Existe porque o estoque é um campo do produto e, depois da extração, a escrita
 * deixou de ser local ao pedido.
 */
@Controller('internal/products')
export class InternalProductController {
  public constructor(private readonly productService: ProductService) {}

  @Patch(':id/stock')
  public async decrementStock(
    @Param('id') id: string,
    @Body() body: StockAdjustmentDto,
  ) {
    return this.productService.decrementStock(id, body.quantity);
  }
}
