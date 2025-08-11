-- Update RLS policies for public access to ruturas data
DROP POLICY IF EXISTS "Users can view their own ruturas" ON public.ruturas;
DROP POLICY IF EXISTS "Users can create their own ruturas" ON public.ruturas;
DROP POLICY IF EXISTS "Users can update their own ruturas" ON public.ruturas;
DROP POLICY IF EXISTS "Users can delete their own ruturas" ON public.ruturas;

-- Create new policies for public access
CREATE POLICY "Allow public read access to ruturas" 
ON public.ruturas 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to ruturas" 
ON public.ruturas 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to ruturas" 
ON public.ruturas 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to ruturas" 
ON public.ruturas 
FOR DELETE 
USING (true);

-- Add missing column if not exists (data_requisicao vs data)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ruturas' AND column_name = 'data') THEN
        ALTER TABLE public.ruturas ADD COLUMN data DATE;
        UPDATE public.ruturas SET data = data_requisicao WHERE data_requisicao IS NOT NULL;
    END IF;
END $$;