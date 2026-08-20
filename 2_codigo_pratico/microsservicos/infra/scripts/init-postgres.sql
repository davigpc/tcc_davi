CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed de exemplo de um pedido histórico
INSERT INTO orders (id, customer_id, total_amount, status, items)
VALUES (
    'ord_demo_001',
    'usr_demo_123',
    89.90,
    'COMPLETED',
    '[{"sku": "PROD-001", "nome": "Camiseta Tech Algodão Premium", "quantidade": 1, "preco": 89.90}]'::jsonb
) ON CONFLICT (id) DO NOTHING;

INSERT INTO payments (id, order_id, amount, payment_method, status)
VALUES (
    'pay_demo_001',
    'ord_demo_001',
    89.90,
    'PIX',
    'APPROVED'
) ON CONFLICT (id) DO NOTHING;
