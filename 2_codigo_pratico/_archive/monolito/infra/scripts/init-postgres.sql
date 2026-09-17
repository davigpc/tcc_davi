-- Script de Inicialização do Banco de Dados Único do Monólito (PostgreSQL)
-- Suporta os 3 Estudos de Caso do TCC: E-commerce, MES Manufatura e Leilões/Mercado

-- =============================================================================
-- ESTUDO DE CASO 1: E-COMMERCE VAREJISTA
-- =============================================================================

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

-- =============================================================================
-- ESTUDO DE CASO 2: SISTEMA DE EXECUÇÃO DA MANUFATURA (MES)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mes_work_orders (
    op_number VARCHAR(50) PRIMARY KEY,
    product_code VARCHAR(50) NOT NULL,
    target_quantity INT NOT NULL,
    produced_quantity INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mes_production_logs (
    id SERIAL PRIMARY KEY,
    op_number VARCHAR(50) NOT NULL REFERENCES mes_work_orders(op_number),
    machine_id VARCHAR(50) NOT NULL,
    operator_id VARCHAR(50) NOT NULL,
    quantity_produced INT NOT NULL,
    rejected_quantity INT NOT NULL DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mes_quality_inspections (
    id SERIAL PRIMARY KEY,
    op_number VARCHAR(50) NOT NULL REFERENCES mes_work_orders(op_number),
    inspector_id VARCHAR(50) NOT NULL,
    result VARCHAR(20) NOT NULL DEFAULT 'PASSED',
    defect_type VARCHAR(50),
    notes TEXT,
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ESTUDO DE CASO 3: MONITOR DE MERCADO E LEILÕES (ALTA CONCORRÊNCIA)
-- =============================================================================

CREATE TABLE IF NOT EXISTS auctions (
    id VARCHAR(50) PRIMARY KEY,
    asset_name VARCHAR(150) NOT NULL,
    current_price NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id VARCHAR(50) PRIMARY KEY,
    auction_id VARCHAR(50) NOT NULL REFERENCES auctions(id),
    bidder_id VARCHAR(50) NOT NULL,
    bid_amount NUMERIC(12, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- SEEDS INICIAIS DE DADOS
-- =============================================================================

INSERT INTO products (sku, nome, descricao, preco, categoria, estoque, imagem_url)
VALUES
  ('PROD-001', 'Camiseta Tech Algodão Premium', 'Camiseta 100% algodão penteado.', 89.90, 'Vestuário', 15, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500'),
  ('PROD-002', 'Caneca de Cerâmica Debug King', 'Caneca 350ml resistente a micro-ondas.', 45.00, 'Acessórios', 30, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO mes_work_orders (op_number, product_code, target_quantity, produced_quantity, status, priority)
VALUES
  ('OP-2026-001', 'PROD-001', 500, 120, 'IN_PROGRESS', 'HIGH'),
  ('OP-2026-002', 'PROD-002', 1000, 0, 'PLANNED', 'MEDIUM')
ON CONFLICT (op_number) DO NOTHING;

INSERT INTO auctions (id, asset_name, current_price, status, end_time)
VALUES
  ('auc_demo_101', 'Lote de Turbinas Industriais v2', 15000.00, 'ACTIVE', CURRENT_TIMESTAMP + INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;
