# 🗄️ Arasaka Data Fortress — Cloud Drive

> "Project Mikoshi // Secure File Hosting"

## 📋 Sobre o Projeto

O **Arasaka Data Fortress** é um serviço de armazenamento de arquivos em nuvem, no estilo de um "Google Drive" próprio, com estética Cyberpunk. Cada usuário tem seu drive com pastas aninhadas, favoritos, lixeira e cota de armazenamento; os arquivos ficam em um **object storage MinIO (compatível com S3)** e os downloads são feitos por **URLs pré-assinadas**, sem passar pelo Django.

A arquitetura separa um **frontend SPA** em React + Vite, uma **API tipada** em Django Ninja e a infraestrutura (PostgreSQL + MinIO) orquestrada via Docker Compose.

## 🚀 Tecnologias Utilizadas

### Frontend
- **Build:** [Vite 7](https://vite.dev/) + SWC
- **Runtime:** React 19
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS 4
- **Estado global:** Zustand (com persistência da sessão)
- **Animações:** Framer Motion
- **Rotas:** React Router 7
- **HTTP:** Axios
- **Ícones:** Lucide React

### Backend
- **Framework:** Django 6 + [Django Ninja](https://django-ninja.dev/) (API com schemas Pydantic e docs OpenAPI automáticas)
- **Usuário customizado:** `ArasakaUser` com UUID, ID corporativo, nível de acesso (*clearance*) e avatar
- **Database:** PostgreSQL 17
- **Object Storage:** MinIO (SDK `minio` para Python)
- **Servidor:** Gunicorn / Uvicorn
- **Gerenciador de Pacotes:** Poetry
- **Qualidade:** Ruff + Black

### Infraestrutura
- **Docker Compose** com 3 serviços: `db` (Postgres), `minio` (storage + console web) e `createbuckets` (cria o bucket automaticamente no primeiro boot)

---

## ✨ Funcionalidades

- 📁 **Pastas aninhadas:** criação de diretórios em qualquer nível, com cor personalizada e nomes únicos por nível (ignorando itens na lixeira).
- ⬆️ **Upload com drag & drop:** arraste arquivos para a tela; o progresso aparece em notificações em tempo real.
- 🔗 **Download por URL pré-assinada:** o MinIO gera um link temporário (1h) e o arquivo vem direto do storage.
- 👁️ **Pré-visualização:** imagens e PDFs abrem dentro da aplicação.
- ⭐ **Favoritos ("Priority Intel"):** marque arquivos importantes para acesso rápido.
- 🗑️ **Lixeira ("Incinerator"):** exclusão suave com restauração, ou expurgo definitivo que remove também o objeto do MinIO.
- 🔍 **Busca:** procura arquivos pelo nome em todo o drive.
- 📊 **Cota de armazenamento:** painel com espaço usado e percentual do limite (10 GB por usuário).
- 🧑‍💻 **Perfil com avatar:** upload de foto de perfil salva no MinIO.
- 🖱️ **Menu de contexto:** clique direito em um arquivo para abrir, baixar, favoritar ou excluir.

---

## 🏗️ Arquitetura

```
┌──────────────┐  REST/JSON  ┌──────────────┐   ORM    ┌──────────────┐
│ React + Vite │◄───────────►│ Django Ninja │◄────────►│  PostgreSQL  │
│  (Frontend)  │             │  (Backend)   │          │              │
└──────┬───────┘             └──────┬───────┘          └──────────────┘
       │                            │ put_object / presigned URL
       │   download direto          ▼
       └───────────────────►┌──────────────┐
                            │    MinIO     │
                            │ (S3 Storage) │
                            └──────────────┘
```

---

## 🔧 Como Rodar o Projeto

### Pré-requisitos
- Docker & Docker Compose
- Python 3.13+ e [Poetry](https://python-poetry.org/)
- Node.js 20+

### 1. Clonar o repositório
```bash
git clone https://github.com/LuizPitohui/arasaka-data-fortress.git
cd arasaka-data-fortress
```

### 2. Subir a infraestrutura (Postgres + MinIO)
```bash
docker compose up -d
```

O serviço `createbuckets` cria o bucket `arasaka-vault` automaticamente. O console do MinIO fica em `http://localhost:9001`.

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` em `backend/` (os valores abaixo são os padrões de desenvolvimento):

```env
DJANGO_SECRET_KEY=troque-esta-chave
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=arasaka_db
DB_USER=arasaka_admin
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=arasaka-vault
MINIO_USE_SSL=False
```

### 4. Rodar o backend
```bash
poetry install
cd backend
poetry run python manage.py migrate
poetry run python manage.py createsuperuser
poetry run python manage.py runserver
```

A API fica em `http://127.0.0.1:8000/api/` e a documentação interativa (Swagger) em `http://127.0.0.1:8000/api/docs`.

### 5. Rodar o frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173` e entre com o usuário criado no passo 4.

---

## 📡 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/login` | Autenticação do usuário |
| GET | `/api/user/me` | Dados do usuário logado (com URL do avatar) |
| POST | `/api/user/avatar` | Upload do avatar |
| GET | `/api/drive/stats` | Espaço usado e limite |
| GET | `/api/drive/files` | Lista arquivos (filtros: `folder_id`, `search`, `starred`, `trash`) |
| GET/POST | `/api/drive/folders` | Lista / cria pastas |
| POST | `/api/drive/upload` | Upload de arquivo para o MinIO |
| GET | `/api/drive/download/{id}` | Gera URL pré-assinada de download |
| POST | `/api/drive/files/{id}/star` | Favorita / desfavorita |
| POST | `/api/drive/files/{id}/restore` | Restaura da lixeira |
| DELETE | `/api/drive/{id}?hard=true` | Envia para a lixeira ou exclui definitivamente |

---

## 📂 Estrutura do Projeto

```
arasaka-data-fortress/
├── docker-compose.yml      # Postgres 17 + MinIO + criação do bucket
├── pyproject.toml          # Dependências do backend (Poetry)
├── backend/
│   ├── config/             # settings, urls (registro da NinjaAPI), asgi/wsgi
│   ├── core/               # ArasakaUser + rota de login
│   ├── drive/              # Models Folder/File, API do drive, serviço MinIO
│   └── user/               # Perfil e avatar
└── frontend/
    └── src/
        ├── Login.tsx       # Tela de acesso
        ├── Dashboard.tsx   # Drive: navegação, upload, preview, lixeira
        └── lib/
            ├── api.ts      # Cliente Axios
            └── store.ts    # Zustand: sessão + notificações de upload
```

---

## 🗺️ Próximos Passos

- Compartilhamento de arquivos por link público (o botão já existe no frontend; falta o endpoint)
- Mover arquivos entre pastas e renomear
- Autenticação por token (JWT) e CORS restrito para produção
- Dockerfiles para backend e frontend

## 📄 Licença

MIT
