import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, TestTube, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { TesteSalvamento } from '@/lib/testeSalvamento';
import { LocalStorageManager } from '@/lib/localStorage';

export const SettingsComponent: React.FC = () => {
  const { toast } = useToast();
  const { dadosOriginais } = useData();

  const handleTestarSalvamento = () => {
    try {
      const sucesso = TesteSalvamento.testarLocalStorage();
      if (sucesso) {
        toast({
          title: "✅ Teste Concluído",
          description: "LocalStorage funcionando corretamente",
        });
      } else {
        toast({
          title: "❌ Teste Falhou",
          description: "Problema detectado no localStorage",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro no Teste",
        description: "Erro ao executar teste de salvamento",
        variant: "destructive",
      });
    }
  };

  const handleSalvarDados = () => {
    try {
      if (dadosOriginais.length === 0) {
        toast({
          title: "⚠️ Aviso",
          description: "Nenhum dado para salvar",
        });
        return;
      }

      TesteSalvamento.salvarDadosExistentes(dadosOriginais);
      toast({
        title: "💾 Salvamento Forçado",
        description: `${dadosOriginais.length} registros salvos manualmente`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro no Salvamento",
        description: "Erro ao forçar salvamento dos dados",
        variant: "destructive",
      });
    }
  };

  const handleLimparCache = () => {
    try {
      const sucesso = TesteSalvamento.testarLimpeza();
      if (sucesso) {
        toast({
          title: "🗑️ Cache Limpo",
          description: "Cache do localStorage foi limpo com sucesso",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro na Limpeza",
        description: "Erro ao limpar cache do localStorage",
        variant: "destructive",
      });
    }
  };

  // Obter informações do storage
  const storageInfo = LocalStorageManager.getDataInfo();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurações</h2>
        <p className="text-gray-600">Painel de configurações do sistema e ferramentas de diagnóstico.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Ajustes e Testes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Ajustes e Testes
            </CardTitle>
            <CardDescription>
              Ferramentas para teste e manutenção do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleSalvarDados}
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <Save className="h-4 w-4" />
                💾 Forçar Salvamento
              </Button>
              
              <Button 
                onClick={handleTestarSalvamento}
                variant="outline"
                className="flex items-center gap-2 justify-start"
              >
                <TestTube className="h-4 w-4" />
                🧪 Testar LocalStorage
              </Button>

              <Button 
                onClick={handleLimparCache}
                variant="outline"
                className="flex items-center gap-2 justify-start text-orange-600 hover:text-orange-700"
              >
                <Database className="h-4 w-4" />
                🗑️ Limpar Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações do Sistema
            </CardTitle>
            <CardDescription>
              Status atual do armazenamento e dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Dados Carregados:</span>
                <Badge variant="secondary">
                  {dadosOriginais.length} registros
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cache Local:</span>
                <Badge variant={storageInfo.count > 0 ? "default" : "secondary"}>
                  {storageInfo.count} registros ({storageInfo.size})
                </Badge>
              </div>

              {storageInfo.timestamp && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Último Save:</span>
                  <Badge variant="outline">
                    {new Date(storageInfo.timestamp).toLocaleString('pt-BR')}
                  </Badge>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">
                  {storageInfo.count > 0 
                    ? "✅ Dados persistem após fechar navegador"
                    : "📭 Nenhum dado salvo localmente"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Usuário */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Usuário</CardTitle>
            <CardDescription>
              Personalize sua experiência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              Funcionalidades em desenvolvimento...
            </p>
          </CardContent>
        </Card>

        {/* Integrações */}
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
            <CardDescription>
              Conexões externas e APIs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Supabase conectado</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
