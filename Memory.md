# EasyMoney - Memory

## Visão Geral
Sistema web de controle financeiro (contas a pagar, contas a receber, dashboard, categorias, relatórios). Multi-tenant com autenticação Google OAuth.

## Stack
- **Backend**: Node.js + Express
- **Banco**: SQLite via sql.js (WASM), arquivo em `data/financeiro.db`
- **Frontend**: SPA vanilla JS (sem framework), Chart.js via CDN
- **Autenticação**: Passport.js + Google OAuth 2.0 + express-session

## Arquivos Principais

### Backend
| Arquivo | Função |
|---------|--------|
| `server.js` | Entry point, configura Express, sessão, passport, rotas |
| `config.js` | Carrega config de `config.json` com fallback para env vars |
| `config.json` | Configuração persistente (porta, Google OAuth, sessão) |
| `.env` | Configuração via variáveis de ambiente (alternativa ao config.json) |
| `database.js` | Inicialização do SQLite, schema, migrações, seed de dados |
| `auth.js` | Passport Google Strategy, rotas `/auth/*`, middleware `ensureAuth` |

### Rotas (em `/routes/`)
| Arquivo | Endpoints |
|---------|-----------|
| `categorias.js` | CRUD categorias (GET, POST, PUT, DELETE) |
| `contasPagar.js` | CRUD contas a pagar + pagar + estatísticas |
| `contasReceber.js` | CRUD contas a receber + receber + estatísticas |
| `dashboard.js` | Dashboard com resumos e gráficos |
| `relatorios.js` | Relatórios (previsão, detalhado, por categoria) |
| `admin.js` | Admin: CRUD clientes, usuários (protegido para admin) |

### Frontend (em `/public/`)
| Arquivo | Função |
|---------|--------|
| `login.html` | Página de login (Google + modo dev) |
| `index.html` | SPA principal |
| `js/app.js` | Core: API helper, roteador hash, modal, formatação |
| `js/dashboard.js` | Página Dashboard |
| `js/contasPagar.js` | Página Contas a Pagar |
| `js/contasReceber.js` | Página Contas a Receber |
| `js/relatorios.js` | Página Relatórios |
| `js/admin.js` | Página Configurações (clientes, usuários, categorias) |
| `css/style.css` | Estilos completos |

## Modelo de Dados

### Multi-tenancy
```
clientes (1) ──→ usuarios (N)
clientes (1) ──→ categorias (N)
clientes (1) ──→ contas_pagar (N)
clientes (1) ──→ contas_receber (N)
```

### Tabelas
- **clientes**: id, nome, dominio, ativo, created_at
- **usuarios**: id, cliente_id, google_id, email, nome, avatar, papel (admin/usuario), ativo, ultimo_acesso, created_at
- **categorias**: id, nome, tipo (receita/despesa/ambos), cliente_id — UNIQUE(nome, cliente_id)
- **contas_pagar**: id, descricao, valor, data_vencimento, ..., status, recorrente, ..., cliente_id
- **contas_receber**: id, descricao, valor, data_vencimento, ..., status, ..., cliente_id

### Categorias Base (17)
**Receita**: Salário, Freelance, Investimentos
**Despesa**: Aluguel, Água, Luz, Internet, Telefone, Alimentação, Transporte, Saúde, Educação, Lazer, Assinaturas, Seguros, Impostos
**Ambos**: Outros

## Fluxo de Autenticação

1. Usuário acessa `/` → `ensureAuth` → redireciona para `/login.html`
2. Login via Google: `/auth/google` → Google OAuth → callback `/auth/google/callback`
3. Primeiro usuário do sistema vira admin automaticamente
4. Usuários com mesmo domínio de email são associados ao mesmo cliente
5. Se nenhum cliente existir para o domínio, usa "Cliente Padrão" (id=1)
6. Modo Dev: `/auth/dev-login` (POST) cria/loga como admin local

### Middleware de Proteção
- `/api/*` → `ensureAuth` (redireciona para login se não autenticado)
- `/api/admin/*` → `ensureAdmin` (retorna 403 se não for admin)
- Assets públicos: `/css/*`, `/js/*`, `/login.html` (sem auth)

## Configuração

### Via config.json (recomendado)
```json
{
  "port": 3003,
  "session": { "secret": "..." },
  "google": {
    "clientID": "...",
    "clientSecret": "...",
    "callbackURL": "http://localhost:3003/auth/google/callback"
  }
}
```

### Via .env (alternativa)
```
PORT=3003
SESSION_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=...
```

### Via variáveis de ambiente
`PORT`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`

Ordem de precedência: env vars > config.json > .env > defaults

## Migrações
As migrações são aplicadas automaticamente na inicialização em `database.js`:
1. `createTables()` → `CREATE TABLE IF NOT EXISTS`
2. `migrateSchema()` → Adiciona colunas faltantes, corrige UNIQUE constraint
3. `seedDefaultClient()` → Cria "Cliente Padrão" se não existir, seed categorias para todos os clientes
4. `ensureAdminUser()` → Promove primeiro usuário a admin se não houver admin

## Portas Padrão
- Desenvolvimento: 3001 (configurável via config.json)
- Docker: 3002
- Atual: 3003

## Observações
- sql.js carrega o banco inteiro em memória e persiste via `fs.writeFileSync`
- A sessão usa MemoryStore (não persiste entre restart)
- Google OAuth requer config.json ou .env com credenciais válidas
- O primeiro usuário a logar via Google é promovido a admin
