'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Database, HardDrive, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  // URLs dos microsserviços
  const CATALOG_URL = process.env.NEXT_PUBLIC_CATALOG_URL || 'http://localhost:3001';
  const CART_URL = process.env.NEXT_PUBLIC_CART_URL || 'http://localhost:3002';
  const ORDER_URL = process.env.NEXT_PUBLIC_ORDER_URL || 'http://localhost:3003';

  const [statuses, setStatuses] = useState({
    catalog: { status: 'CHECKING', db: 'MongoDB' },
    cart: { status: 'CHECKING', db: 'Redis' },
    order: { status: 'CHECKING', db: 'PostgreSQL' }
  });

  // Verificar status dos microsserviços e carregar dados
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setCheckoutStatus(null);

      // 1. Health Check & Produtos (Catalog Service)
      try {
        const resCat = await fetch(`${CATALOG_URL}/health`);
        if (resCat.ok) {
          setStatuses(prev => ({ ...prev, catalog: { status: 'UP', db: 'MongoDB' } }));
          const resProd = await fetch(`${CATALOG_URL}/api/products`);
          const prodData = await resProd.json();
          setProducts(prodData);
        } else {
          setStatuses(prev => ({ ...prev, catalog: { status: 'DOWN', db: 'MongoDB' } }));
          setProducts([]);
        }
      } catch {
        setStatuses(prev => ({ ...prev, catalog: { status: 'DOWN', db: 'MongoDB' } }));
        setProducts([]);
      }

      // 2. Health Check & Carrinho (Cart Service)
      try {
        const resCart = await fetch(`${CART_URL}/health`);
        if (resCart.ok) {
          setStatuses(prev => ({ ...prev, cart: { status: 'UP', db: 'Redis' } }));
          const resCartItems = await fetch(`${CART_URL}/api/cart/usr_demo`);
          const cartData = await resCartItems.json();
          setCart(cartData.items || []);
        } else {
          setStatuses(prev => ({ ...prev, cart: { status: 'DOWN', db: 'Redis' } }));
          setCart([]);
        }
      } catch {
        setStatuses(prev => ({ ...prev, cart: { status: 'DOWN', db: 'Redis' } }));
        setCart([]);
      }

      // 3. Health Check (Order Service)
      try {
        const resOrd = await fetch(`${ORDER_URL}/health`);
        if (resOrd.ok) {
          setStatuses(prev => ({ ...prev, order: { status: 'UP', db: 'PostgreSQL' } }));
        } else {
          setStatuses(prev => ({ ...prev, order: { status: 'DOWN', db: 'PostgreSQL' } }));
        }
      } catch {
        setStatuses(prev => ({ ...prev, order: { status: 'DOWN', db: 'PostgreSQL' } }));
      }

      setLoading(false);
    }

    loadInitialData();
  }, [CATALOG_URL, CART_URL, ORDER_URL]);

  // Adicionar produto ao carrinho
  const addToCart = async (product) => {
    try {
      const res = await fetch(`${CART_URL}/api/cart/usr_demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { ...product, quantidade: 1 } })
      });
      const data = await res.json();
      if (data.items) {
        setCart(data.items);
      }
    } catch (err) {
      alert('Erro ao adicionar produto ao carrinho: ' + err.message);
    }
  };

  // Finalizar Compra
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`${ORDER_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'usr_demo',
          items: cart,
          paymentMethod: 'PIX'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCheckoutStatus(data.order);
        // Esvaziar carrinho no Redis (Cart Service)
        await fetch(`${CART_URL}/api/cart/usr_demo`, { method: 'DELETE' });
        setCart([]);
      } else {
        alert('Erro ao processar pedido: ' + (data.error || data.details));
      }
    } catch (err) {
      alert('Erro ao conectar ao Serviço de Pedidos: ' + err.message);
    }
  };

  const totalCart = cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // Renderizar vitrine de produtos
  function renderProductsContent() {
    if (loading) {
      return <p style={{ color: '#9ca3af' }}>Carregando catálogo (MongoDB)...</p>;
    }

    if (products.length === 0) {
      return (
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#f87171' }}>
            Nenhum produto encontrado no <strong>Catalog Service</strong>.
          </p>
          <p style={{ marginTop: '0.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
            Certifique-se de que os microsserviços estão rodando: <code>docker compose up</code>
          </p>
        </div>
      );
    }

    return (
      <div className="products-grid">
        {products.map((p) => (
          <div key={p.id || p._id || p.sku} className="product-card">
            <img src={p.imagemUrl} alt={p.nome} className="product-img" />
            <div className="product-body">
              <span className="product-category">{p.categoria}</span>
              <h3 className="product-title">{p.nome}</h3>
              <p className="product-desc">{p.descricao}</p>
              <div className="product-footer">
                <span className="price">R$ {Number(p.preco).toFixed(2)}</span>
                <button className="btn-add" onClick={() => addToCart(p)}>
                  + Adicionar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Renderizar itens do carrinho
  function renderCartContent() {
    if (cart.length === 0) {
      return <p style={{ color: '#9ca3af', margin: '2rem 0' }}>Seu carrinho está vazio.</p>;
    }

    return (
      <div>
        {cart.map((item, idx) => (
          <div key={idx} className="cart-item">
            <div>
              <strong>{item.nome}</strong>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                Qtd: {item.quantidade} x R$ {Number(item.preco).toFixed(2)}
              </div>
            </div>
            <span style={{ fontWeight: 700 }}>
              R$ {(item.quantidade * item.preco).toFixed(2)}
            </span>
          </div>
        ))}

        <div className="cart-total">
          <span>Total:</span>
          <span>R$ {totalCart.toFixed(2)}</span>
        </div>

        <button className="btn-checkout" onClick={handleCheckout}>
          Finalizar Pedido (Order Service - PostgreSQL)
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <nav className="navbar">
        <div className="logo">
          <ShoppingBag size={24} />
          <span>E-Commerce Microsserviços (PoC TCC)</span>
        </div>

        <div className="nav-links">
          <button className="cart-button" onClick={() => setIsCartOpen(true)}>
            <span>Carrinho</span>
            <span className="badge">{cart.reduce((acc, i) => acc + i.quantidade, 0)}</span>
          </button>
        </div>
      </nav>

      <div className="container">
        {/* Painel de Status da Arquitetura */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#9ca3af', margin: 0 }}>
            Arquitetura: <span style={{ color: '#3b82f6' }}>Microsserviços Distribuídos</span>
          </h3>
          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', color: '#9ca3af' }}>
            3 Serviços Distribuídos | 3 Bancos de Dados
          </span>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <Database size={20} color="#38bdf8" />
            <div className="status-info">
              <h4>Catalog Service (Porta 3001)</h4>
              <p>Banco: MongoDB | Status: {statuses.catalog.status}</p>
            </div>
            <div className={`status-indicator ${statuses.catalog.status.toLowerCase()}`} />
          </div>

          <div className="status-card">
            <HardDrive size={20} color="#a855f7" />
            <div className="status-info">
              <h4>Cart Service (Porta 3002)</h4>
              <p>Banco: Redis | Status: {statuses.cart.status}</p>
            </div>
            <div className={`status-indicator ${statuses.cart.status.toLowerCase()}`} />
          </div>

          <div className="status-card">
            <ShieldCheck size={20} color="#10b981" />
            <div className="status-info">
              <h4>Order Service (Porta 3003)</h4>
              <p>Banco: PostgreSQL | Status: {statuses.order.status}</p>
            </div>
            <div className={`status-indicator ${statuses.order.status.toLowerCase()}`} />
          </div>
        </div>

        {/* Vitrine de Produtos */}
        <h2 style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
          Vitrine de Produtos (Catalog Service - MongoDB)
        </h2>
        {renderProductsContent()}
      </div>

      {/* Modal de Carrinho */}
      {isCartOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Seu Carrinho (Cart Service - Redis)</h2>
              <button className="btn-close" onClick={() => setIsCartOpen(false)}>×</button>
            </div>

            {renderCartContent()}

            {/* Confirmação de Pedido Realizado */}
            {checkoutStatus && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700 }}>
                  <CheckCircle2 size={20} />
                  <span>Pedido #{checkoutStatus.id} Confirmado!</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#e5e7eb', marginTop: '0.5rem' }}>
                  O pedido de <strong>R$ {Number(checkoutStatus.total_amount).toFixed(2)}</strong> foi processado via{' '}
                  <strong>Order Service (PostgreSQL)</strong> com sucesso.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
