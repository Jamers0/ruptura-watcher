# 🚀 Deploy no Netlify - Ruptura Watcher

## 📋 Pré-requisitos

1. **Conta no Netlify** - [Criar conta gratuita](https://www.netlify.com/)
2. **Projeto no Supabase** - [Criar projeto](https://supabase.com/)
3. **Repositório Git** (GitHub, GitLab, etc.)

## 🛠️ Configuração do Deploy

### 1. Configurar Variáveis de Ambiente

No painel do Netlify, vá em **Site Settings > Environment Variables** e adicione:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_NAME=Ruptura Watcher
VITE_ENVIRONMENT=production
```

### 2. Configurações de Build

As configurações estão no arquivo `netlify.toml`:
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18

### 3. Deploy Automático

1. Conecte seu repositório Git ao Netlify
2. O deploy será automático a cada push na branch principal
3. Verifique os logs de build em caso de erro

## 🔧 Comandos Úteis

```bash
# Instalar dependências
npm install

# Executar localmente
npm run dev

# Build para produção
npm run build:prod

# Preview do build
npm run preview

# Verificar tipos TypeScript
npm run type-check

# Lint e correção automática
npm run lint:fix

# Auditoria de segurança
npm audit
```

## 📁 Arquivos de Configuração

- `netlify.toml` - Configurações do Netlify
- `public/_redirects` - Redirecionamentos para SPA
- `.env.example` - Exemplo das variáveis de ambiente

## 🚨 Problemas Comuns

### Build falhando
- Verificar se todas as variáveis de ambiente estão definidas
- Confirmar se o Node.js versão 18+ está sendo usado

### Roteamento não funcionando
- Verificar se o arquivo `_redirects` está em `public/`
- Confirmar configuração SPA no `netlify.toml`

### Conexão com Supabase
- Validar URLs e chaves do Supabase
- Verificar políticas RLS (Row Level Security)

## 🔒 Segurança

- ✅ Variáveis de ambiente configuradas
- ✅ Headers de segurança aplicados
- ✅ Cache otimizado para assets estáticos
- ⚠️ Executar `npm audit` regularmente

## 📊 Otimizações Aplicadas

- **Bundle Splitting**: Vendor, UI, Supabase separados
- **Minificação**: Terser para JS, CSS otimizado
- **Cache**: Headers configurados para 1 ano
- **Compressão**: Gzip automático no Netlify

## 🚀 Deploy Manual

Se preferir deploy manual:

```bash
npm run build:prod
# Upload da pasta 'dist' diretamente no Netlify
```
