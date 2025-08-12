# 📊 Analise de Ruturas

Sistema completo de gestão e análise de ruturas de produtos, desenvolvido com React + TypeScript + Supabase e otimizado para deploy no Netlify.

## ✨ Funcionalidades

- 📁 **Importação Avançada**: Suporte a CSV, XLSX e Google Sheets
- 📊 **Dashboard Interativo**: Gráficos dinâmicos e KPIs em tempo real
- 🗃 **Gestão de Dados**: Tabelas com busca, filtros e ordenação
- 📈 **Analytics Avançado**: Cálculos automáticos e insights
- 🚀 **Performance Otimizada**: Code splitting e lazy loading
- 📱 **Design Responsivo**: Interface moderna para todos os dispositivos

## � Deploy no Netlify

### Configuração Automática
O projeto está configurado para deploy automático no Netlify com:

- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18
- **Environment**: Todas as devDependencies incluídas

### Variáveis de Ambiente Necessárias
Configure no painel do Netlify:
```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### Arquivos de Configuração
- `netlify.toml`: Configurações de build e headers
- `.nvmrc`: Versão do Node.js
- `package.json`: Scripts otimizados

## �🛠 Tecnologias

- **Frontend**: React 18.3.1, TypeScript, Vite 5.4.19
- **UI**: Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Processamento**: XLSX, PapaParse para arquivos
- **Deploy**: Netlify com otimizações avançadas

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- Conta no Supabase

### Instalação
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ruptura-watcher.git
cd ruptura-watcher

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# Execute em desenvolvimento
npm run dev
```

### Deploy no Netlify
```bash
# Build de produção
npm run build

# Deploy automático via Git
# Configure as variáveis de ambiente no dashboard do Netlify:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 📊 Estrutura de Dados

O sistema processa dados de ruturas com os seguintes campos:

- **Identificação**: Semana, seção, horário
- **Requisição**: OT, REQ, tipo
- **Produto**: Código, descrição, departamento
- **Quantidades**: Solicitado, enviado, em falta
- **Estoque**: CT, FF, em trânsito
- **Classificação**: Tipologia da rutura

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run type-check   # Verificação TypeScript
npm start           # Servidor local
```

## 📁 Importação de Dados

### Formatos Suportados
- **CSV**: Arquivos separados por vírgula
- **XLSX**: Planilhas do Excel
- **Google Sheets**: Abas específicas (14H, 18H)

### Mapeamento de Colunas
O sistema mapeia automaticamente:
- Datas → Cálculo da semana do mês
- Quantidades → Conversão numérica
- Produtos → Validação de códigos
- Seções → Normalização de nomes

## 📈 Dashboard

### KPIs Principais
- Total de ruturas no período
- Valor total em falta
- Produtos únicos afetados  
- Seções com ruturas

### Visualizações
- **Barras**: Ruturas por semana
- **Pizza**: Distribuição por tipo
- **Área**: Evolução temporal
- **Rankings**: Top produtos/seções

## 🛡 Segurança

- Headers de segurança (CSP, HSTS)
- Validação de entrada rigorosa
- Sanitização de dados
- RLS (Row Level Security) no Supabase
- TypeScript para type safety

## 📚 Documentação

Para documentação detalhada, consulte [DOCUMENTACAO.md](DOCUMENTACAO.md).

---

**Desenvolvido com ❤️ para otimizar a gestão de ruturas**

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2f17f380-d0d2-4dde-ae4f-39f967429e95) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
