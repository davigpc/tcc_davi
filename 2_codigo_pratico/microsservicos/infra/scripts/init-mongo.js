db = db.getSiblingDB('catalog_db');

db.products.drop();

db.products.insertMany([
  {
    sku: "PROD-001",
    nome: "Camiseta Tech Algodão Premium",
    descricao: "Camiseta 100% algodão penteado, ideal para desenvolvedores.",
    preco: 89.90,
    categoria: "Vestuário",
    estoque: 15,
    imagemUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500"
  },
  {
    sku: "PROD-002",
    nome: "Caneca de Cerâmica Debug King",
    descricao: "Caneca 350ml resistente a micro-ondas para suas sessões de depuração.",
    preco: 45.00,
    categoria: "Acessórios",
    estoque: 30,
    imagemUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"
  },
  {
    sku: "PROD-003",
    nome: "Mousepad Extra Large Dark Theme",
    descricao: "Mousepad emborrachado 90x40cm com costura reforçada e design minimalista.",
    preco: 79.90,
    categoria: "Periféricos",
    estoque: 20,
    imagemUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500"
  },
  {
    sku: "PROD-004",
    nome: "Teclado Mecânico RGB Wireless",
    descricao: "Teclado mecânico compacto layout 65% com switches táteis silenciados.",
    preco: 349.90,
    categoria: "Periféricos",
    estoque: 8,
    imagemUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500"
  }
]);

print("MongoDB inicializado com sucesso para o catalog-service.");
