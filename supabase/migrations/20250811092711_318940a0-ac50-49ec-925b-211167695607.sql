-- Create table for ruturas data
CREATE TABLE public.ruturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semana TEXT NOT NULL,
  hora_rutura TEXT NOT NULL,
  hora_da_rutura TEXT NOT NULL,
  secao TEXT NOT NULL,
  tipo_requisicao TEXT NOT NULL,
  ot TEXT NOT NULL,
  req TEXT NOT NULL,
  tipo_produto TEXT NOT NULL,
  numero_produto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  qtd_req DECIMAL(10,3) NOT NULL,
  qtd_env DECIMAL(10,3) NOT NULL DEFAULT 0,
  qtd_falta DECIMAL(10,3) NOT NULL,
  un_med TEXT NOT NULL,
  data DATE NOT NULL,
  stock_ct DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_ff DECIMAL(10,3) NOT NULL DEFAULT 0,
  em_transito_ff DECIMAL(10,3) NOT NULL DEFAULT 0,
  tipologia_rutura TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ruturas ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your auth needs)
CREATE POLICY "Everyone can view ruturas" 
ON public.ruturas 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can insert ruturas" 
ON public.ruturas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Everyone can update ruturas" 
ON public.ruturas 
FOR UPDATE 
USING (true);

CREATE POLICY "Everyone can delete ruturas" 
ON public.ruturas 
FOR DELETE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_ruturas_data ON public.ruturas(data);
CREATE INDEX idx_ruturas_secao ON public.ruturas(secao);
CREATE INDEX idx_ruturas_tipo_produto ON public.ruturas(tipo_produto);
CREATE INDEX idx_ruturas_numero_produto ON public.ruturas(numero_produto);
CREATE INDEX idx_ruturas_tipologia ON public.ruturas(tipologia_rutura);
CREATE INDEX idx_ruturas_req ON public.ruturas(req);
CREATE INDEX idx_ruturas_ot ON public.ruturas(ot);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ruturas_updated_at
BEFORE UPDATE ON public.ruturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();