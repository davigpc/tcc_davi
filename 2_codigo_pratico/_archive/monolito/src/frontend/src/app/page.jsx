'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Server, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState(null);

  // URL da aplicação monolítica unificada
  const MONOLITH_URL = process.env.NEXT_PUBLIC_MONOLITH_URL || 'http://localhost:8000';

  const [status, setStatus] = useState({ status: 'CHECKING', db: 'PostgreSQL (monolith_db)' });

  // Verificar status do monólito e carregar dados
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      setCheckoutStatus(null);

      try {
        const resMono = await fetch(`${MONOLITH_URL}/health`);
        if (resMono.ok) {
          setStatus({ status: 'UP', db: 'PostgreSQL (monolith_db)' });
          
          // Buscar catálogo do monólito
          const resProd = await fetch(`${MONOLITH_URL}/api/products`);
          const prodData = await resProd.json();
          setProducts(prodData);

          // Buscar carrinho do monólito
          const resCart = await fetch(`${MONOLITH_URL}/api/cart/usr_demo`);
          const cartData = await resCart.json();
          setCart(cartData.items || []);
        } else {
          setStatus({ status: 'DOWN', db: 'PostgreSQL (monolith_db)' });
          setProducts([]);
          setCart([]);
        }
      } catch {
        setStatus({ status: 'DOWN', db: 'PostgreSQL (monolith_db)' });
        setProducts([]);
        setCart([]);
      }

      setLoading(false);
    }

    loadInitialData();
  }, [MONOLITH_URL]);

  // Adicionar produto ao carrinho
  const addToCart = async (product) => {
    try {
      const res = await fetch(`${MONOLITH_URL}/api/cart/usr_demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { ...product, quantidade: 1 } })
      });
      const data = await res.json();
      if (data.items) {
        setCart(data.items);
      }
    } catch (err) {
      alert('Erro ao adicionar produto ao carrinho (Monólito): ' + err.message);
    }
  };

  // Finalizar Compra
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`${MONOLITH_URL}/api/orders`, {
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
        setCart([]);
      } else {
        alert('Erro ao processar pedido no Monólito: ' + (data.error || data.details));
      }
    } catch (err) {
      alert('Erro ao conectar ao Serviço Monolítico: ' + err.message);
    }
  };

  const totalCart = cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  // Renderizar vitrine de produtos
  function renderProductsContent() {
    if (loading) {
      return <p style={{ color: '#9ca3af' }}>Carregando catálogo (PostgreSQL Monólito)...</p>;
    }

    if (products.length === 0) {
      return (
        <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: '#f87171' }}>
            Nenhum produto encontrado no <strong>Servidor Monolítico</strong>.
          </p>
          <p style={{ marginTop: '0.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
            Certifique-se de subir a aplicação monolítica: <code>docker compose up</code>
          </p>
        </div>
      );
    }

    return (
      <div className="products-grid">
        {products.map((p) => (
          <div key={p.id || p.sku} className="product-card">
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
          Finalizar Pedido (Transação ACID Monolítica)
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
          <span>E-Commerce Monolítico (PoC TCC)</span>
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
            Arquitetura: <span style={{ color: '#10b981' }}>Monolítica Unificada</span>
          </h3>
          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '20px', color: '#9ca3af' }}>
            1 Servidor Único | 1 Banco de Dados (PostgreSQL)
          </span>
        </div>

        <div className="status-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="status-card" style={{ borderColor: 'rgba(16, 185, 129, 0.4)' }}>
            <Server size={24} color="#10b981" />
            <div className="status-info">
              <h4>Monolith Service App (Porta 8000)</h4>
              <p>Módulos Integrados: Catálogo, Carrinho & Pedidos | Banco: {status.db} | Status: {status.status}</p>
            </div>
            <div className={`status-indicator ${status.status.toLowerCase()}`} />
          </div>
        </div>

        {/* Vitrine de Produtos */}
        <h2 style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
          Vitrine de Produtos (Monólito - PostgreSQL)
        </h2>
        {renderProductsContent()}
      </div>

      {/* Modal de Carrinho */}
      {isCartOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Seu Carrinho (PostgreSQL Monólito)</h2>
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
                  <strong>Transação ACID Monolítica Unificada</strong> com sucesso.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
