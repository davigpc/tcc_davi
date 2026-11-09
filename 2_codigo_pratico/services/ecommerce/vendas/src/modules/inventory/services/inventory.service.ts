import { Injectable, Logger } from '@nestjs/common';
import { ItemTypes } from '@item/enums/item-types.enum';
import { Item } from '@item/schemas/item.schema';

/**
 * Baixa de estoque do pedido.
 *
 * Depois da extração do Catálogo (Capacidade de Negócio / snapshot-1), o
 * estoque é um campo do produto que passou a viver em outro serviço. A escrita
 * acontece por HTTP, e não mais na sessão Mongo do pedido: a garantia de
 * atomicidade entre status do pedido e estoque deixa de existir. O comportamento
 * funcional (pedido pago baixa o estoque) é preservado.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  private readonly catalogUrl =
    process.env.CATALOG_URL ?? 'http://catalogo:3001';

  public async updateInventory(items: Item[]): Promise<void> {
    this.logger.log(`Updating inventory for items via catalog service`);

    const productsToUpdate = items.filter(
      (item) => item.type === ItemTypes.PRODUCT,
    );

    await Promise.all(
      productsToUpdate.map((item) =>
        this.decrementStock(item.id, item.quantity),
      ),
    );
  }

  private async decrementStock(
    productId: string,
    quantity: number,
  ): Promise<void> {
    const response = await fetch(
      `${this.catalogUrl}/api/internal/products/${productId}/stock`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao baixar o estoque do produto ${productId}: ${response.status}`,
      );
    }
  }
}
