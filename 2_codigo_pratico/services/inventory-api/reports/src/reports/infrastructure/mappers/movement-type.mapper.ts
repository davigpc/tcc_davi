import { MovementType as PrismaMovementType } from '@prisma/client';

/**
 * MovementTypeMapper (camada anticorrupção)
 *
 * Cópia local mínima do mapper do monólito, criada na extração para NÃO
 * depender do módulo `movements`. Este é o único ponto de vazamento de domínio
 * identificado no pré-registro; a duplicação fica registrada como dívida
 * técnica a ser resolvida em extração posterior.
 */
export class MovementTypeMapper {
  static toPersistence(type: string): PrismaMovementType {
    if (type === 'ENTRADA') return PrismaMovementType.ENTRADA;
    if (type === 'SALIDA') return PrismaMovementType.SALIDA;
    throw new Error(`Invalid movement type: ${type}`);
  }
}
