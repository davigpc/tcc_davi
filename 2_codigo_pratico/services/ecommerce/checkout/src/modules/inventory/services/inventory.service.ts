import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { CatalogoClient } from '@clients/catalogo.client';
import { ItemTypes } from '@item/enums/item-types.enum';
import { Item } from '@item/schemas/item.schema';

/**
 * Baixa de estoque do pedido.
 *
 * No snapshot final o estoque é um contador próprio do Checkout. A baixa roda
 * na mesma sessão Mongo do status do pedido, que é o motivo de o grupo ter sido
 * extraído junto. Depois do commit, o Catálogo recebe a mesma baixa para manter
 * a cópia de leitura que aparece na listagem de produtos.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  public constructor(
    @InjectModel('Stock') private readonly stockModel: Model<any>,
    private readonly catalogoClient: CatalogoClient,
  ) {}

  public async updateInventory(
    items: Item[],
    session?: ClientSession,
  ): Promise<void> {
    this.logger.log(`Updating inventory for items`);

    const productsToUpdate = items.filter(
      (item) => item.type === ItemTypes.PRODUCT,
    );

    await Promise.all(
      productsToUpdate.map((item) =>
        this.stockModel.updateOne(
          { productId: item.id },
          { $inc: { available: -item.quantity } },
          { session },
        ),
      ),
    );
  }

  public async syncDisplay(items: Item[]): Promise<void> {
    const productsToUpdate = items.filter(
      (item) => item.type === ItemTypes.PRODUCT,
    );

    await Promise.all(
      productsToUpdate.map((item) =>
        this.catalogoClient.decrementDisplay(item.id, item.quantity),
      ),
    );
  }
}
