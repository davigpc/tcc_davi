import { Injectable, Logger, NotFoundException } from '@nestjs/common';

export interface CatalogoProduct {
  _id: string;
  name?: string;
  price?: number;
  images?: string[];
  [key: string]: unknown;
}

/**
 * Cliente HTTP do serviço de Catálogo.
 *
 * Depois do snapshot final o banco é isolado: o carrinho e o pedido não podem
 * mais validar o item nem ler o preço na própria coleção. Cada validação é uma
 * chamada de rede, feita direto na rede dos contêineres, sem passar pelo gateway.
 */
@Injectable()
export class CatalogoClient {
  private readonly logger = new Logger(CatalogoClient.name);

  private readonly catalogoUrl =
    process.env.CATALOG_URL ?? 'http://catalogo:3001';

  public async getProduct(id: string): Promise<CatalogoProduct> {
    const response = await fetch(
      `${this.catalogoUrl}/api/internal/products/${id}`,
    );

    if (response.status === 404) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    if (!response.ok) {
      throw new Error(`Falha ao consultar o produto ${id}: ${response.status}`);
    }

    return (await response.json()) as CatalogoProduct;
  }

  public async getProducts(ids: string[]): Promise<Map<string, CatalogoProduct>> {
    if (ids.length === 0) {
      return new Map();
    }

    const response = await fetch(
      `${this.catalogoUrl}/api/internal/products/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar os produtos: ${response.status}`,
      );
    }

    const products = (await response.json()) as CatalogoProduct[];
    const byId = new Map<string, CatalogoProduct>();
    for (const product of products) {
      byId.set(String(product._id), product);
    }
    this.logger.log(`Produtos consultados no Catálogo: ${byId.size}`);
    return byId;
  }
}
