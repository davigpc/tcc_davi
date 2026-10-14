import { SetMetadata } from '@nestjs/common';

// Tipo local: o serviço de Estoque não possui o modelo User (propriedade da
// Identidade), portanto o enum Role não é gerado pelo Prisma aqui.
export type Role = 'ADMIN' | 'OPERATOR';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
