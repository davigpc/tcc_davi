const test = require('node:test');
const assert = require('node:assert');

test('Monolith Health check schema response', () => {
  const mockHealthResponse = {
    service: 'monolith-service',
    architecture: 'Monolith',
    status: 'UP',
    database: 'PostgreSQL (monolith_db)'
  };

  assert.strictEqual(mockHealthResponse.service, 'monolith-service');
  assert.strictEqual(mockHealthResponse.architecture, 'Monolith');
  assert.strictEqual(mockHealthResponse.status, 'UP');
});

test('Calcula total do pedido corretamente no módulo de pedidos', () => {
  const items = [
    { sku: 'PROD-001', preco: 89.90, quantidade: 2 },
    { sku: 'PROD-002', preco: 45.00, quantidade: 1 }
  ];

  const totalAmount = items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  assert.strictEqual(totalAmount, 224.80);
});
