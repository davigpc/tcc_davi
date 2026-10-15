import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@database/prisma/prisma.service';
import { Movement } from '@movements/domain';
import { IMovementRepository } from '@movements/domain/ports';
import {
  ProductNotFoundForMovementError,
  WarehouseNotFoundForMovementError,
  UserNotFoundForMovementError,
  UnauthorizedMovementError,
  InsufficientStockError,
} from '@movements/domain/errors';
import { MovementTypeMapper } from '@movements/infrastructure/mappers';

/**
 * MovementRepositoryAdapter
 * Implementa IMovementRepository usando Prisma
 * Maneja transacciones para operaciones críticas
 * También valida existencia de recursos (productos, bodegas, usuarios)
 */
@Injectable()
export class MovementRepositoryAdapter implements IMovementRepository {
  private readonly logger = new Logger(MovementRepositoryAdapter.name);
  private readonly identityUrl =
    process.env.IDENTITY_URL || 'http://identity:3000';
  private readonly supportUrl = process.env.SUPPORT_URL || 'http://support:3000';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Camada anticorrupção: o serviço de Movimentações (núcleo) não possui as
   * tabelas de produtos/armazéns (propriedade do serviço de Suporte). Consulta
   * pela API interna do Suporte via HTTP.
   */
  private async fetchProduct(productId: string): Promise<{ id: string } | null> {
    const res = await fetch(`${this.supportUrl}/api/internal/products`);
    if (!res.ok) {
      throw new Error(`support service error ${res.status} listing products`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    const products = body?.data ?? body;
    return Array.isArray(products)
      ? (products.find((p) => p.id === productId) ?? null)
      : null;
  }

  private async fetchWarehouse(
    warehouseId: string,
  ): Promise<{ id: string; isActive?: boolean; deletedAt?: string | null } | null> {
    const res = await fetch(
      `${this.supportUrl}/api/internal/warehouses/${warehouseId}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `support service error ${res.status} for warehouse ${warehouseId}`,
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    return body?.data ?? body;
  }

  /**
   * Camada anticorrupção: o serviço de Movimentações não tem a tabela de usuários
   * (propriedade da Identidade). Consulta o usuário pela API interna da
   * Identidade via HTTP.
   */
  private async fetchUser(userId: string): Promise<{
    id: string;
    email: string;
    role: string;
    warehouseId: string | null;
  } | null> {
    const res = await fetch(
      `${this.identityUrl}/api/internal/users/${userId}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `identity service error ${res.status} for user ${userId}`,
      );
    }
    // O ResponseInterceptor da Identidade envelopa em { data, message, statusCode }.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await res.json();
    return body?.data ?? body;
  }


  /**
   * Guarda un movimiento con validaciones previas
   * Usa transacción para atomicidad
   */
  async save(
    movement: Movement,
    validateExistence: boolean = true,
  ): Promise<void> {
    this.logger.debug(
      `Validando movimiento: producto=${movement.getProductId()}, bodega=${movement.getWarehouseId()}, tipo=${movement.getTypeValue()}, cantidad=${movement.getQuantityValue()}`,
    );

    let userEmail: string | null = null;

    if (validateExistence) {
      // Validate that el producto existe (via API interna do Suporte)
      const product = await this.fetchProduct(movement.getProductId());
      if (!product) {
        this.logger.warn(
          `Producto no encontrado: id=${movement.getProductId()}`,
        );
        throw new ProductNotFoundForMovementError(movement.getProductId());
      }

      // Validate that la bodega existe (via API interna do Suporte)
      const warehouse = await this.fetchWarehouse(movement.getWarehouseId());
      if (!warehouse) {
        this.logger.warn(
          `Bodega no encontrada: id=${movement.getWarehouseId()}`,
        );
        throw new WarehouseNotFoundForMovementError(movement.getWarehouseId());
      }

      // Validate that el usuario existe (via API interna da Identidade)
      const user = await this.fetchUser(movement.getUserId());
      if (!user) {
        this.logger.warn(`Usuario no encontrado: id=${movement.getUserId()}`);
        throw new UserNotFoundForMovementError(movement.getUserId());
      }
      userEmail = user.email;

      // If is OPERATOR, validar que está asignado a esta bodega
      if (
        user.role === 'OPERATOR' &&
        user.warehouseId !== movement.getWarehouseId()
      ) {
        this.logger.warn(
          `OPERATOR no autorizado: usuario=${movement.getUserId()}, bodega=${movement.getWarehouseId()}`,
        );
        throw new UnauthorizedMovementError(
          movement.getUserId(),
          movement.getWarehouseId(),
        );
      }

      // Si es SALIDA, validar stock disponible
      if (movement.isExit()) {
        const currentStock = await this.getStockByProductAndWarehouse(
          movement.getProductId(),
          movement.getWarehouseId(),
        );

        this.logger.debug(
          `Stock actual: producto=${movement.getProductId()}, bodega=${movement.getWarehouseId()}, stock=${currentStock}, requerido=${movement.getQuantityValue()}`,
        );

        if (currentStock < movement.getQuantityValue()) {
          this.logger.warn(
            `Stock insuficiente: producto=${movement.getProductId()}, bodega=${movement.getWarehouseId()}, disponible=${currentStock}, requerido=${movement.getQuantityValue()}`,
          );
          throw new InsufficientStockError(
            movement.getProductId(),
            movement.getWarehouseId(),
            currentStock,
            movement.getQuantityValue(),
          );
        }
      }
    }

    const data = {
      id: movement.getId(),
      productId: movement.getProductId(),
      warehouseId: movement.getWarehouseId(),
      userId: movement.getUserId(),
      userEmail,
      type: MovementTypeMapper.toPersistence(movement.getTypeValue()),
      quantity: movement.getQuantityValue(),
      notes: movement.getNotes(),
      createdAt: movement.getCreatedAt(),
    };

    // Usar transacción para asegurar atomicidad
    this.logger.debug(`Guardando movimiento en transacción: id=${data.id}`);
    await this.prisma.$transaction(async (prisma) => {
      await prisma.stockMovement.create({ data });
    });
    this.logger.log(
      `Movimiento guardado exitosamente: id=${data.id}, tipo=${movement.getTypeValue()}`,
    );
  }

  async findById(id: string): Promise<Movement | null> {
    const raw = await this.prisma.stockMovement.findUnique({
      where: { id },
    });

    if (!raw) {
      return null;
    }

    return Movement.restore(
      raw.id,
      raw.productId,
      raw.warehouseId,
      raw.userId,
      raw.type,
      raw.quantity,
      raw.notes,
      raw.createdAt,
    );
  }

  async getStockByProductAndWarehouse(
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    const entries = await this.prisma.stockMovement.aggregate({
      where: {
        productId,
        warehouseId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'ENTRADA' as any,
      },
      _sum: {
        quantity: true,
      },
    });

    const exits = await this.prisma.stockMovement.aggregate({
      where: {
        productId,
        warehouseId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'SALIDA' as any,
      },
      _sum: {
        quantity: true,
      },
    });

    const entryQuantity = entries._sum.quantity || 0;
    const exitQuantity = exits._sum.quantity || 0;

    return entryQuantity - exitQuantity;
  }

  async listMovements(
    productId?: string,
    warehouseId?: string,
    type?: string,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Movement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (productId) {
      where.productId = productId;
    }
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.type = type as any;
    }
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      where.createdAt = {
        gte: startDate,
      };
    } else if (endDate) {
      where.createdAt = {
        lte: endDate,
      };
    }

    const skip = (page - 1) * limit;

    const [raw, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    const data = raw.map((r) =>
      Movement.restore(
        r.id,
        r.productId,
        r.warehouseId,
        r.userId,
        r.type,
        r.quantity,
        r.notes,
        r.createdAt,
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
}
