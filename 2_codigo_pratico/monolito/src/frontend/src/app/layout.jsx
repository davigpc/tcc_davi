import './globals.css';

export const metadata = {
  title: 'PoC E-Commerce Microsserviços - TCC',
  description: 'Estudo de Caso de Migração Monolito para Microsserviços com Next.js, Mongo, Redis e Postgres',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
