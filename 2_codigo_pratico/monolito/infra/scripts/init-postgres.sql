-- Script de inicialização do Banco de Dados Único do Monólito (PostgreSQL)

-- Tabela de Produtos (Domínio do Catálogo)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    preco NUMERIC(10, 2) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    imagem_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens do Carrinho (Domínio do Carrinho)
CREATE TABLE IF NOT EXISTS cart_items (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_customer_sku UNIQUE(customer_id, sku)
);

-- Tabela de Pedidos (Domínio de Pedidos)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    items JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pagamentos (Domínio de Pedidos / Pagamentos)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seeds Iniciais de Produtos (Equivalente ao MongoDB)
INSERT INTO products (sku, nome, descricao, preco, categoria, estoque, imagem_url)
VALUES
  ('PROD-001', 'Camiseta Tech Algodão Premium', 'Camiseta 100% algodão penteado, ideal para desenvolvedores.', 89.90, 'Vestuário', 15, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500'),
  ('PROD-002', 'Caneca de Cerâmica Debug King', 'Caneca 350ml resistente a micro-ondas para suas sessões de depuração.', 45.00, 'Acessórios', 30, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500'),
  ('PROD-003', 'Mousepad Extra Large Dark Theme', 'Mousepad emborrachado 90x40cm com costura reforçada e design minimalista.', 79.90, 'Periféricos', 20, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500'),
  ('PROD-004', 'Teclado Mecânico RGB Wireless', 'Teclado mecânico compacto layout 65% com switches táteis silenciados.', 349.90, 'Periféricos', 8, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500')
ON CONFLICT (sku) DO NOTHING;

-- Seed de Exemplo de um Pedido Histórico (Equivalente ao PostgreSQL dos microsserviços)
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
