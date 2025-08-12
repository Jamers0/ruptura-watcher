# 📊 Ruptura Watcher - Sistema de Gestão de Ruturas

## 🚀 Visão Geral

O **Ruptura Watcher** é um sistema completo para gestão e análise de ruturas de produtos, desenvolvido com tecnologias modernas e otimizado para deployment no Netlify.

### 🛠 Stack Tecnológica

- **Frontend**: React 18.3.1 + TypeScript + Vite 5.4.19
- **UI Framework**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Gráficos**: Recharts
- **Processamento de Arquivos**: XLSX + PapaParse
- **Deploy**: Netlify com otimizações avançadas

## ✨ Funcionalidades Principais

### 📁 Importação de Dados
- **Suporte a múltiplos formatos**: CSV, XLSX (Excel)
- **Import de Google Sheets**: Processamento automático das abas "14H" e "18H"
- **Validação inteligente**: Verificação automática de dados
- **Preview antes do envio**: Visualização dos dados antes da importação
- **Upload em lote**: Processamento de até 100 registros por lote
- **Cálculo automático de semana**: Baseado na data da requisição

### 📊 Dashboard Avançado
- **KPIs em tempo real**: 
  - Total de ruturas
  - Valor total em falta
  - Produtos únicos afetados
  - Seções com ruturas
- **Visualizações interativas**:
  - Gráfico de barras: Ruturas por semana
  - Gráfico de pizza: Distribuição por tipo de produto
  - Gráfico de área: Evolução temporal
  - Top 10: Produtos e seções mais afetados
- **Filtros avançados**: Por data, seção, tipo de produto
- **Exportação**: Download dos dados filtrados

### 🗃 Gestão de Dados
- **Tabela interativa**: Visualização completa dos dados
- **Busca e filtros**: Localização rápida de informações
- **Ordenação**: Por qualquer coluna
- **Paginação**: Performance otimizada para grandes volumes

## 🏗 Arquitetura do Sistema

### 📂 Estrutura de Arquivos
```
src/
├── components/
│   ├── ui/                     # Componentes UI reutilizáveis
│   ├── Dashboard.tsx           # Dashboard principal
│   ├── DashboardNovo.tsx       # Dashboard avançado (novo)
│   ├── ImportData.tsx          # Importação básica
│   ├── ImportDataNovo.tsx      # Importação avançada (novo)
│   ├── DataTable.tsx           # Tabela de dados
│   └── Layout.tsx              # Layout da aplicação
├── lib/
│   ├── types.ts               # Definições de tipos
│   ├── utils.ts               # Utilitários gerais
│   ├── utils-rutura.ts        # Utilitários específicos para ruturas
│   └── processamento-dados.ts  # Processamento de dados (novo)
├── integrations/supabase/
│   ├── client.ts              # Cliente Supabase
│   └── types.ts               # Tipos do banco de dados
└── hooks/
    └── use-toast.ts           # Hook para notificações
```

### 🗄 Esquema de Banco de Dados (Supabase)

```sql
CREATE TABLE ruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campos de identificação
  semana TEXT,                    -- Calculado automaticamente
  hora_rutura TEXT,               -- 14H ou 18H
  hora_da_rutura TEXT,            -- Horário + tipologia
  secao TEXT,                     -- Seção requisitante
  
  -- Dados da requisição
  tipo_requisicao TEXT DEFAULT 'NORMAL',
  ot TEXT,                        -- Ordem de Transferência
  req TEXT,                       -- Número da Requisição
  
  -- Dados do produto
  tipo_produto TEXT,              -- Departamento
  numero_produto TEXT,            -- Código do produto
  descricao TEXT,                 -- Nome do produto
  
  -- Quantidades
  qtd_req DECIMAL DEFAULT 0,      -- Quantidade solicitada
  qtd_env DECIMAL DEFAULT 0,      -- Quantidade enviada
  qtd_falta DECIMAL DEFAULT 0,    -- Quantidade em falta
  un_med TEXT,                    -- Unidade de medida
  
  -- Dados temporais
  data DATE,                      -- Data da requisição
  
  -- Estoque
  stock_ct DECIMAL DEFAULT 0,     -- Estoque CateringPor
  stock_ff DECIMAL DEFAULT 0,     -- Estoque Frigofril
  em_transito_ff DECIMAL DEFAULT 0, -- Em trânsito FF→CT
  
  -- Classificação
  tipologia_rutura TEXT,          -- Tipo de rutura
  aba_origem TEXT                 -- Origem dos dados
);
```

## 🚀 Deploy e Configuração

### 📋 Variáveis de Ambiente
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 🌐 Configuração Netlify
O projeto inclui `netlify.toml` com:
- **Redirects SPA**: Suporte para roteamento React
- **Headers de Segurança**: CSP, HSTS, etc.
- **Cache otimizado**: 1 ano para assets estáticos
- **Build otimizada**: Code splitting automático

### 🔧 Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run preview      # Preview do build
npm run type-check   # Verificação TypeScript
npm start           # Servidor de produção local
```

## 📊 Processamento de Dados

### 🔄 Pipeline de Importação
1. **Upload do arquivo** (CSV/XLSX)
2. **Parsing e validação** dos dados
3. **Cálculo automático** da semana do mês
4. **Formatação** de datas e números
5. **Preview** com estatísticas
6. **Importação em lote** para Supabase
7. **Feedback** em tempo real do progresso

### 📈 Cálculos Automáticos
- **Semana do Mês**: Baseado na data da requisição
- **Percentuais**: Distribuição por categoria
- **Agregações**: Somas e médias automáticas
- **Validações**: Verificação de consistência dos dados

## 🎨 Interface do Usuário

### 🎯 Características da UI
- **Design Responsivo**: Funciona em desktop, tablet e mobile
- **Tema Moderno**: Interface limpa e profissional
- **Acessibilidade**: Suporte a screen readers
- **Performance**: Componentes otimizados e lazy loading
- **Feedback Visual**: Loading states e notificações

### 🖱 Interatividade
- **Tooltips Informativos**: Detalhes ao passar o mouse
- **Gráficos Interativos**: Zoom e pan nos gráficos
- **Filtros Dinâmicos**: Atualizações em tempo real
- **Drag & Drop**: Upload de arquivos por arrastar

## 🔧 Otimizações Implementadas

### 🏃‍♂️ Performance
- **Code Splitting**: Bundle dividido por funcionalidade
- **Lazy Loading**: Carregamento sob demanda
- **Memoização**: Cache de componentes custosos
- **Virtual Scrolling**: Para tabelas grandes
- **Tree Shaking**: Remoção de código não utilizado

### 📦 Bundle Analysis
```
dist/assets/
├── vendor-*.js      (157KB) # React, bibliotecas
├── supabase-*.js    (122KB) # Cliente Supabase
├── index-*.js       (985KB) # Código da aplicação
├── ui-*.js          (29KB)  # Componentes UI
└── utils-*.js       (21KB)  # Utilitários
```

## 🛡 Segurança

### 🔒 Medidas Implementadas
- **CSP Headers**: Content Security Policy
- **HTTPS Only**: Redirecionamento automático
- **Sanitização**: Limpeza de dados de entrada
- **Validação Tipada**: TypeScript end-to-end
- **Rate Limiting**: Via Supabase RLS

## 📱 Compatibilidade

### 🌍 Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 📱 Dispositivos
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (320px - 767px)

## 🤝 Como Usar

### 1️⃣ Importar Dados
1. Acesse a aba "Importar"
2. Arraste ou selecione arquivo CSV/XLSX
3. Aguarde o preview dos dados
4. Confirme a importação
5. Acompanhe o progresso

### 2️⃣ Visualizar Analytics
1. Acesse o "Dashboard"
2. Explore os gráficos interativos
3. Use os filtros para refinar
4. Exporte dados se necessário

### 3️⃣ Gerenciar Dados
1. Acesse "Dados"
2. Use busca e filtros
3. Ordene por colunas
4. Navegue pela paginação

## 🆘 Troubleshooting

### ❓ Problemas Comuns
- **Arquivo não carrega**: Verifique formato (CSV/XLSX apenas)
- **Dados não aparecem**: Verifique conexão com Supabase
- **Gráficos não carregam**: Aguarde processamento dos dados
- **Build falha**: Execute `npm run type-check`

### 📞 Suporte
Para problemas técnicos, verifique:
1. Console do navegador para erros JavaScript
2. Network tab para problemas de API
3. Logs do Netlify para problemas de deploy
4. Status do Supabase para problemas de banco

---

**Desenvolvido com ❤️ usando React, TypeScript e tecnologias modernas**
