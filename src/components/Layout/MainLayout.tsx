import React, { useState, useEffect } from 'react';
import { TopNavigation } from './TopNavigation';
import { Dashboard } from '@/components/DashboardNovo';
import { ImportDataLocal } from '@/components/ImportDataLocal';
import { DataTable } from '@/components/DataTable';
import { AnalysesComponent } from '@/components/AnalysesComponent';
import { ReportsComponent } from '@/components/ReportsComponent';
import { SettingsComponent } from '@/components/SettingsComponent';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';

// Placeholder components para as abas ainda não implementadas - Removido pois agora temos SettingsComponent

export const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { ruturas, recarregarDoLocalStorage } = useData();
  const { toast } = useToast();

  // Carregar dados na inicialização da aplicação
  useEffect(() => {
    console.log('🚀 MainLayout inicializado, carregando dados...');
    recarregarDoLocalStorage();
  }, [recarregarDoLocalStorage]);

  // Handler para quando novos dados são importados  
  const handleDataImported = () => {
    // Recarregar dados do localStorage usando a função do contexto
    recarregarDoLocalStorage();
    
    toast({
      title: "Dados Salvos Localmente",
      description: "Dados importados e salvos permanentemente no navegador!",
    });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard ruturas={ruturas} />;
      case 'dados':
        return <DataTable />;
      case 'importar':
        return <ImportDataLocal onDataImported={handleDataImported} />;
      case 'analises':
        return <AnalysesComponent />;
      case 'relatorios':
        return <ReportsComponent ruturas={ruturas} />;
      case 'configuracoes':
        return <SettingsComponent />;
      default:
        return <Dashboard ruturas={ruturas} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />
      <main className="w-full max-w-none mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </main>
    </div>
  );
};
