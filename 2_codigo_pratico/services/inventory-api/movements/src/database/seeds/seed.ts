import { PrismaClient } from '@prisma/client';

/**
 * Seed do serviço de Movimentações (núcleo, banco próprio).
 * Usa identificadores FIXOS que coincidem com os seeds do Suporte (produtos e
 * armazéns) e da Identidade (usuários). Não há integridade referencial entre os
 * bancos: as referências são lógicas e o e-mail do usuário é denormalizado.
 */
const IDS = {
  warehouse1: '00000000-0000-0000-0000-0000000000a1',
  warehouse2: '00000000-0000-0000-0000-0000000000a2',
  admin: '00000000-0000-0000-0000-0000000000b1',
  operator: '00000000-0000-0000-0000-0000000000b2',
  products: [
    '00000000-0000-0000-0000-0000000000c1',
    '00000000-0000-0000-0000-0000000000c2',
    '00000000-0000-0000-0000-0000000000c3',
    '00000000-0000-0000-0000-0000000000c4',
    '00000000-0000-0000-0000-0000000000c5',
  ],
};

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de Movimentações...');

  await prisma.stockMovement.deleteMany({});

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const adminEmail = 'admin@example.com';
  const operatorEmail = 'operator@example.com';

  const movements = [
    { productId: IDS.products[0], warehouseId: IDS.warehouse1, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 500, notes: 'Initial stock', createdAt: threeDaysAgo },
    { productId: IDS.products[1], warehouseId: IDS.warehouse1, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 300, notes: 'Compra a proveedor', createdAt: threeDaysAgo },
    { productId: IDS.products[2], warehouseId: IDS.warehouse1, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 1000, notes: 'Gran compra', createdAt: threeDaysAgo },
    { productId: IDS.products[3], warehouseId: IDS.warehouse1, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 2000, notes: 'Entrada masiva', createdAt: threeDaysAgo },
    { productId: IDS.products[4], warehouseId: IDS.warehouse1, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 500, notes: 'Metros iniciales', createdAt: threeDaysAgo },
    { productId: IDS.products[0], warehouseId: IDS.warehouse2, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 200, notes: 'Stock regional', createdAt: threeDaysAgo },
    { productId: IDS.products[0], warehouseId: IDS.warehouse1, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 100, notes: 'Venta a cliente corporate', createdAt: yesterday },
    { productId: IDS.products[1], warehouseId: IDS.warehouse1, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 50, notes: 'Venta minorista', createdAt: yesterday },
    { productId: IDS.products[3], warehouseId: IDS.warehouse1, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 1900, notes: 'Liquidación de stock', createdAt: now },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.stockMovement.createMany({ data: movements as any });

  console.log(`✅ Movimentações: ${movements.length} movimentos`);
}

main()
  .catch((e) => {
    console.error('Error in movements seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
