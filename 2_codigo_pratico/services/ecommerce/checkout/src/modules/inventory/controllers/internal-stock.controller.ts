import { Body, Controller, Param, Put } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * Sincronização do contador de estoque do Checkout.
 *
 * O Catálogo chama esta rota quando um produto é criado ou tem o estoque
 * redefinido. A partir daí o saldo autoritativo é o do Checkout; o campo `stock`
 * do produto passa a ser a cópia de leitura.
 */
@Controller('internal/stock')
export class InternalStockController {
  public constructor(@InjectModel('Stock') private readonly stockModel: Model<any>) {}

  @Put(':productId')
  public async set(
    @Param('productId') productId: string,
    @Body() body: { available: number },
  ): Promise<{ updated: boolean }> {
    await this.stockModel.updateOne(
      { productId },
      { $set: { available: body.available } },
      { upsert: true },
    );
    return { updated: true };
  }
}
