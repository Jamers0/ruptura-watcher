import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Database, 
  Upload, 
  TrendingUp, 
  FileText, 
  Settings,
  Home,
  Wifi,
  WifiOff
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'dados', label: 'Dados de Ruturas', icon: Database },
  { id: 'analises', label: 'Análises', icon: TrendingUp },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'importar', label: 'Importar Dados', icon: Upload },
  { id: 'configuracoes', label: 'Configurações', icon: Settings },
];

export const TopNavigation: React.FC<TopNavigationProps> = ({ activeTab, onTabChange }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [currentDate, setCurrentDate] = useState('');

  // Verificar conexão com Supabase
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('ruturas').select('count').limit(1);
        setIsOnline(!error);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000); // Verificar a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  // Atualizar data atual
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const formattedDate = format(now, "EEEE dd/MM/yyyy", { locale: ptBR });
      const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
      setCurrentDate(capitalizedDate);
    };

    updateDate();
    const interval = setInterval(updateDate, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-gray-900">
              Analise de Ruturas
            </span>
          </div>

          {/* Navigation and Status */}
          <div className="flex items-center space-x-4">
            {/* Navigation */}
            <nav className="flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 ${
                      isActive 
                        ? 'bg-primary text-white' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden md:inline-block">{item.label}</span>
                  </Button>
                );
              })}
            </nav>

            {/* Status and Date */}
            <div className="flex items-center space-x-3 text-sm">
              {/* Connection Status */}
              <div className="flex items-center space-x-1">
                {isOnline ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="hidden sm:inline">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="hidden sm:inline">Offline</span>
                  </div>
                )}
              </div>

              {/* Current Date */}
              <div className="text-gray-600 hidden lg:block">
                {currentDate}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
