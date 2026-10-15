import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Seed do serviço de Identidade (banco próprio).
 * Usa identificadores FIXOS que DEVEM coincidir com o seed do Estoque, pois os
 * bancos são separados e não há integridade referencial entre eles.
 */
const IDS = {
  admin: '00000000-0000-0000-0000-0000000000b1',
  operator: '00000000-0000-0000-0000-0000000000b2',
  warehouse1: '00000000-0000-0000-0000-0000000000a1',
};

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed da Identidade...');

  await prisma.user.deleteMany({});

  const adminHashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      id: IDS.admin,
      email: 'admin@example.com',
      passwordHash: adminHashedPassword,
      role: 'ADMIN',
    },
  });

  const operatorHashedPassword = await bcrypt.hash('operator123', 10);
  await prisma.user.create({
    data: {
      id: IDS.operator,
      email: 'operator@example.com',
      passwordHash: operatorHashedPassword,
      role: 'OPERATOR',
      warehouseId: IDS.warehouse1,
    },
  });

  console.log('✅ Identidade: 2 usuários (admin, operator)');
}

main()
  .catch((e) => {
    console.error('Error in identity seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
