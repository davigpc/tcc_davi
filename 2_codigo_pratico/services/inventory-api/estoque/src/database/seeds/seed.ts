import { PrismaClient } from '@prisma/client';

/**
 * Seed do serviço de Estoque (banco próprio).
 * Usa identificadores FIXOS para permitir a referência cruzada pelo serviço de
 * Identidade (banco separado, sem integridade referencial entre os bancos).
 * Os IDs de usuário abaixo DEVEM coincidir com o seed da Identidade.
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
  console.log('🌱 Seed do Estoque...');

  await prisma.stockMovement.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.warehouse.deleteMany({});

  const warehouse1 = await prisma.warehouse.create({
    data: {
      id: IDS.warehouse1,
      name: 'Almacén Central',
      location: 'Bogotá, Colombia',
      capacity: 10000,
      isActive: true,
    },
  });
  const warehouse2 = await prisma.warehouse.create({
    data: {
      id: IDS.warehouse2,
      name: 'Almacén Regional',
      location: 'Medellín, Colombia',
      capacity: 5000,
      isActive: true,
    },
  });

  const productData = [
    { sku: 'LAPTOP001', name: 'Laptop ProBook', description: 'Laptop de alto rendimiento', unit: 'unidad', minStockAlert: 50 },
    { sku: 'MONITOR-27', name: 'Monitor 27"', description: 'Monitor FHD 27 pulgadas', unit: 'unidad', minStockAlert: 30 },
    { sku: 'TECLADO001', name: 'Teclado Mecánico', description: 'Teclado mecánico RGB', unit: 'unidad', minStockAlert: 100 },
    { sku: 'MOUSE-WIRELESS', name: 'Mouse Inalámbrico', description: 'Mouse inalámbrico 2.4GHz', unit: 'unidad', minStockAlert: 150 },
    { sku: 'CABLE-HDMI-2', name: 'Cable HDMI 2.0', description: 'Cable HDMI 2.0 certificado', unit: 'metro', minStockAlert: 50 },
  ];

  const products = await Promise.all(
    productData.map((p, i) =>
      prisma.product.create({ data: { id: IDS.products[i], ...p } }),
    ),
  );

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  const adminEmail = 'admin@example.com';
  const operatorEmail = 'operator@example.com';

  const movements = [
    { productId: products[0].id, warehouseId: warehouse1.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 500, notes: 'Initial stock', createdAt: threeDaysAgo },
    { productId: products[1].id, warehouseId: warehouse1.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 300, notes: 'Compra a proveedor', createdAt: threeDaysAgo },
    { productId: products[2].id, warehouseId: warehouse1.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 1000, notes: 'Gran compra', createdAt: threeDaysAgo },
    { productId: products[3].id, warehouseId: warehouse1.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 2000, notes: 'Entrada masiva', createdAt: threeDaysAgo },
    { productId: products[4].id, warehouseId: warehouse1.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 500, notes: 'Metros iniciales', createdAt: threeDaysAgo },
    { productId: products[0].id, warehouseId: warehouse2.id, userId: IDS.admin, userEmail: adminEmail, type: 'ENTRADA', quantity: 200, notes: 'Stock regional', createdAt: threeDaysAgo },
    { productId: products[0].id, warehouseId: warehouse1.id, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 100, notes: 'Venta a cliente corporate', createdAt: yesterday },
    { productId: products[1].id, warehouseId: warehouse1.id, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 50, notes: 'Venta minorista', createdAt: yesterday },
    { productId: products[3].id, warehouseId: warehouse1.id, userId: IDS.operator, userEmail: operatorEmail, type: 'SALIDA', quantity: 1900, notes: 'Liquidación de stock', createdAt: now },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.stockMovement.createMany({ data: movements as any });

  console.log(
    `✅ Estoque: 2 armazéns, ${products.length} produtos, ${movements.length} movimentos`,
  );
}

main()
  .catch((e) => {
    console.error('Error in estoque seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
