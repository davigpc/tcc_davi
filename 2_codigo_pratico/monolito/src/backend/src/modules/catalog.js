const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Listar todos os produtos
router.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, sku, nome, descricao, preco::float, categoria, estoque, imagem_url AS "imagemUrl" FROM products ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('[Catalog Module] Erro ao listar produtos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Buscar produto por ID ou SKU
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let query;
    let params;

    if (!isNaN(id)) {
      query = 'SELECT id, sku, nome, descricao, preco::float, categoria, estoque, imagem_url AS "imagemUrl" FROM products WHERE id = $1';
      params = [parseInt(id, 10)];
    } else {
      query = 'SELECT id, sku, nome, descricao, preco::float, categoria, estoque, imagem_url AS "imagemUrl" FROM products WHERE sku = $1';
      params = [id];
    }

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[Catalog Module] Erro ao buscar produto:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
