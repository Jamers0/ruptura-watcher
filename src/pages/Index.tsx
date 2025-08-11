import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/components/Dashboard';
import { DataTable } from '@/components/DataTable';
import { ImportData } from '@/components/ImportData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Rutura } from '@/lib/types';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [ruturas, setRuturas] = useState<Rutura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRuturas = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ruturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar ruturas:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as ruturas.",
          variant: "destructive",
        });
      } else {
        setRuturas(data || []);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuturas();
  }, []);

  const renderPage = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard ruturas={ruturas} />;
      case 'dados':
        return <DataTable ruturas={ruturas} onRefresh={fetchRuturas} />;
      case 'importar':
        return <ImportData onDataImported={fetchRuturas} />;
      case 'analises':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Análises Avançadas</h2>
            <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
          </div>
        );
      case 'relatorios':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Relatórios</h2>
            <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
          </div>
        );
      default:
        return <Dashboard ruturas={ruturas} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default Index;
