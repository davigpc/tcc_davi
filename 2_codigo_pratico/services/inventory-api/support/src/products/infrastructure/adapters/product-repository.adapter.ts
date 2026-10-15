import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { Product } from '@products/domain';
import { IProductRepository } from '@products/domain/ports';

/**
 * ProductRepositoryAdapter
 * Implements IProductRepository using Prisma
 * Adapts persistence to the interface defined in domain
 */
@Injectable()
export class ProductRepositoryAdapter implements IProductRepository {
  private readonly logger = new Logger(ProductRepositoryAdapter.name);
  private readonly movementsUrl =
    process.env.MOVEMENTS_URL || 'http://movements:3000';

  constructor(private readonly prisma: PrismaService) {}

  async save(product: Product): Promise<void> {
    const data = {
      id: product.getId(),
      sku: product.getSKUValue(),
      name: product.getName(),
      description: product.getDescription(),
      unit: product.getUnit(),
      minStockAlert: product.getMinStockAlert(),
      deletedAt: product.getDeletedAt(),
    };

    const existing = await this.prisma.product.findUnique({
      where: { id: product.getId() },
    });

    if (existing) {
      this.logger.debug(
        `Updating product: id=${product.getId()}, sku=${product.getSKUValue()}`,
      );
      await this.prisma.product.update({
        where: { id: product.getId() },
        data,
      });
      this.logger.log(
        `Product updated: id=${product.getId()}, sku=${product.getSKUValue()}`,
      );
    } else {
      this.logger.debug(
        `Creating product: sku=${product.getSKUValue()}, name=${product.getName()}`,
      );
      await this.prisma.product.create({ data });
      this.logger.log(
        `Product created: id=${product.getId()}, sku=${product.getSKUValue()}`,
      );
    }
  }

  async findById(id: string): Promise<Product | null> {
    const raw = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!raw) {
      return null;
    }

    return Product.restore(
      raw.id,
      raw.sku,
      raw.name,
      raw.description,
      raw.unit,
      raw.minStockAlert,
      raw.createdAt,
      raw.deletedAt,
    );
  }

  async findBySKU(sku: string): Promise<Product | null> {
    const raw = await this.prisma.product.findUnique({
      where: { sku },
    });

    if (!raw) {
      return null;
    }

    return Product.restore(
      raw.id,
      raw.sku,
      raw.name,
      raw.description,
      raw.unit,
      raw.minStockAlert,
      raw.createdAt,
      raw.deletedAt,
    );
  }

  async findAll(): Promise<Product[]> {
    const raw = await this.prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return raw.map((r) =>
      Product.restore(
        r.id,
        r.sku,
        r.name,
        r.description,
        r.unit,
        r.minStockAlert,
        r.createdAt,
        r.deletedAt,
      ),
    );
  }

  async findAllPaginated(
    page: number,
    limit: number,
  ): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [raw, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({
        where: { deletedAt: null },
      }),
    ]);

    const data = raw.map((r) =>
      Product.restore(
        r.id,
        r.sku,
        r.name,
        r.description,
        r.unit,
        r.minStockAlert,
        r.createdAt,
        r.deletedAt,
      ),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<void> {
    const product = await this.findById(id);
    if (product) {
      this.logger.debug(`Deleting product: id=${id}`);
      product.softDelete();
      await this.save(product);
      this.logger.log(`Product deleted (soft delete): id=${id}`);
    }
  }

  async hasMovements(productId: string): Promise<boolean> {
    // Camada anticorrupção: os movimentos pertencem ao serviço de Movimentações
    // (núcleo). Consulta pela API interna via HTTP.
    const res = await fetch(
      `${this.movementsUrl}/api/internal/movements?productId=${productId}&limit=1`,
    );
    if (!res.ok) {
      throw new Error(
        `movements service error ${res.status} for product ${productId}`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    const payload = body?.data ?? body;
    return Number(payload?.total ?? 0) > 0;
  }
}
