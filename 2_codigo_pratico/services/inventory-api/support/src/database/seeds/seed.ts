import { PrismaClient } from '@prisma/client';

/**
 * Seed do serviço de Suporte (banco próprio).
 * Usa identificadores FIXOS que coincidem com os seeds da Identidade (usuários)
 * e de Movimentações (referências lógicas aos produtos/armazéns).
 */
const IDS = {
  warehouse1: '00000000-0000-0000-0000-0000000000a1',
  warehouse2: '00000000-0000-0000-0000-0000000000a2',
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
  console.log('🌱 Seed do Suporte...');

  await prisma.product.deleteMany({});
  await prisma.warehouse.deleteMany({});

  await prisma.warehouse.create({
    data: {
      id: IDS.warehouse1,
      name: 'Almacén Central',
      location: 'Bogotá, Colombia',
      capacity: 10000,
      isActive: true,
    },
  });
  await prisma.warehouse.create({
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

  await Promise.all(
    productData.map((p, i) =>
      prisma.product.create({ data: { id: IDS.products[i], ...p } }),
    ),
  );

  console.log('✅ Suporte: 2 armazéns, 5 produtos');
}

main()
  .catch((e) => {
    console.error('Error in support seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
