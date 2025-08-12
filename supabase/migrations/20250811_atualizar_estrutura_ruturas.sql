-- Atualização da tabela ruturas para suportar todos os campos necessários
-- Data: 2025-08-11

-- Adicionar colunas se não existirem
ALTER TABLE public.ruturas 
ADD COLUMN IF NOT EXISTS semana TEXT,
ADD COLUMN IF NOT EXISTS hora_rutura TEXT,
ADD COLUMN IF NOT EXISTS hora_da_rutura TEXT,
ADD COLUMN IF NOT EXISTS secao TEXT,
ADD COLUMN IF NOT EXISTS tipo_requisicao TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS ot TEXT,
ADD COLUMN IF NOT EXISTS req TEXT,
ADD COLUMN IF NOT EXISTS tipo_produto TEXT,
ADD COLUMN IF NOT EXISTS numero_produto TEXT,
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS qtd_req DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS qtd_env DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS qtd_falta DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS un_med TEXT,
ADD COLUMN IF NOT EXISTS data DATE,
ADD COLUMN IF NOT EXISTS stock_ct DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_ff DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS em_transito_ff DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipologia_rutura TEXT,
ADD COLUMN IF NOT EXISTS aba_origem TEXT;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_ruturas_secao ON public.ruturas(secao);
CREATE INDEX IF NOT EXISTS idx_ruturas_data ON public.ruturas(data);
CREATE INDEX IF NOT EXISTS idx_ruturas_numero_produto ON public.ruturas(numero_produto);
CREATE INDEX IF NOT EXISTS idx_ruturas_ot ON public.ruturas(ot);
CREATE INDEX IF NOT EXISTS idx_ruturas_req ON public.ruturas(req);
CREATE INDEX IF NOT EXISTS idx_ruturas_tipologia ON public.ruturas(tipologia_rutura);
CREATE INDEX IF NOT EXISTS idx_ruturas_aba_origem ON public.ruturas(aba_origem);

-- Criar função para calcular semana automaticamente
CREATE OR REPLACE FUNCTION calcular_semana_mes(data_input DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    primeiro_dia DATE;
    semana_numero INTEGER;
    mes_nome TEXT[];
    ordinal TEXT[];
BEGIN
    -- Array com nomes dos meses
    mes_nome := ARRAY['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    -- Array com ordinais
    ordinal := ARRAY['1ª', '2ª', '3ª', '4ª', '5ª'];
    
    -- Primeiro dia do mês
    primeiro_dia := DATE_TRUNC('month', data_input)::DATE;
    
    -- Calcular número da semana (começando do 1)
    semana_numero := CEIL(EXTRACT(DAY FROM data_input) / 7.0)::INTEGER;
    
    -- Garantir que não exceda 5
    IF semana_numero > 5 THEN
        semana_numero := 5;
    END IF;
    
    -- Retornar string formatada
    RETURN ordinal[semana_numero] || ' Semana de ' || mes_nome[EXTRACT(MONTH FROM data_input)];
END;
$$;

-- Criar trigger para atualizar semana automaticamente
CREATE OR REPLACE FUNCTION trigger_atualizar_semana()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.data IS NOT NULL THEN
        NEW.semana := calcular_semana_mes(NEW.data);
    END IF;
    
    -- Atualizar timestamps
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, NOW());
    END IF;
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_atualizar_semana_ruturas ON public.ruturas;
CREATE TRIGGER trigger_atualizar_semana_ruturas
    BEFORE INSERT OR UPDATE ON public.ruturas
    FOR EACH ROW
    EXECUTE FUNCTION trigger_atualizar_semana();

-- Atualizar registros existentes
UPDATE public.ruturas 
SET semana = calcular_semana_mes(data)
WHERE data IS NOT NULL AND (semana IS NULL OR semana = '');

-- Comentários nas colunas para documentação
COMMENT ON COLUMN public.ruturas.semana IS 'Semana do mês calculada automaticamente baseada na data (ex: 1ª Semana de Abril)';
COMMENT ON COLUMN public.ruturas.hora_rutura IS 'Horário de envio dos dados (14h ou 18h)';
COMMENT ON COLUMN public.ruturas.hora_da_rutura IS 'Horário + tipologia de rutura';
COMMENT ON COLUMN public.ruturas.secao IS 'Seção que fez a requisição';
COMMENT ON COLUMN public.ruturas.tipo_requisicao IS 'Tipo de pedido: NORMAL, EXTRA';
COMMENT ON COLUMN public.ruturas.ot IS 'Número da Ordem de Transferência';
COMMENT ON COLUMN public.ruturas.req IS 'Número da Requisição';
COMMENT ON COLUMN public.ruturas.tipo_produto IS 'Departamento: Secos, Congelados, Refrigerados, etc.';
COMMENT ON COLUMN public.ruturas.numero_produto IS 'Código do produto no sistema';
COMMENT ON COLUMN public.ruturas.descricao IS 'Nome/descrição do produto';
COMMENT ON COLUMN public.ruturas.qtd_req IS 'Quantidade solicitada';
COMMENT ON COLUMN public.ruturas.qtd_env IS 'Quantidade enviada';
COMMENT ON COLUMN public.ruturas.qtd_falta IS 'Quantidade em falta';
COMMENT ON COLUMN public.ruturas.un_med IS 'Unidade de medida: KG, L, UN, RL';
COMMENT ON COLUMN public.ruturas.data IS 'Data da requisição (DD/MM/YYYY)';
COMMENT ON COLUMN public.ruturas.stock_ct IS 'Estoque CateringPor';
COMMENT ON COLUMN public.ruturas.stock_ff IS 'Estoque Frigofril';
COMMENT ON COLUMN public.ruturas.em_transito_ff IS 'Quantidade em trânsito FF para CT';
COMMENT ON COLUMN public.ruturas.tipologia_rutura IS 'Tipo de rutura: Sem Stock Físico e BC, A pedir à FF, etc.';
COMMENT ON COLUMN public.ruturas.aba_origem IS 'Aba de origem: 14H, 18H, CSV, EXCEL';
