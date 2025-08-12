import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, AlertCircle, CheckCircle2, Download, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { processarDadosRutura, calcularAnalytics } from '@/lib/processamento-dados';
import type { Rutura } from '@/lib/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

interface ImportDataProps {
  onDataImported: () => void;
}

interface ImportStatus {
  total: number;
  processados: number;
  erros: number;
  sucesso: boolean;
  mensagem: string;
}

export function ImportData({ onDataImported }: ImportDataProps) {
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [dadosPreview, setDadosPreview] = useState<Rutura[] | null>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const tiposPermitidos = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const extensoesPermitidas = ['.csv', '.xls', '.xlsx'];
    const extensao = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!tiposPermitidos.includes(file.type) && !extensoesPermitidas.includes(extensao)) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo CSV ou Excel (.csv, .xls, .xlsx)",
        variant: "destructive",
      });
      return;
    }

    setArquivoSelecionado(file);
    setDadosPreview(null);
    setImportStatus(null);
    
    // Preview dos dados
    processarArquivo(file, true);
  };

  const processarArquivo = async (arquivo: File, apenasPrevicao = false) => {
    try {
      setImporting(true);
      
      const dadosProcessados: Rutura[] = [];
      
      if (arquivo.name.toLowerCase().endsWith('.csv')) {
        // Processar CSV
        const texto = await arquivo.text();
        
        Papa.parse(texto, {
          header: true,
          complete: (resultado) => {
            if (resultado.errors.length > 0) {
              console.error('Erros no CSV:', resultado.errors);
            }
            
            const dados = processarDadosRutura(resultado.data as Record<string, unknown>[], 'CSV');
            dadosProcessados.push(...dados);
          },
          error: (erro) => {
            throw new Error(`Erro ao processar CSV: ${erro.message}`);
          }
        });
      } else {
        // Processar Excel
        const arrayBuffer = await arquivo.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Processar cada aba
        workbook.SheetNames.forEach(nomeAba => {
          const worksheet = workbook.Sheets[nomeAba];
          const dadosJson = XLSX.utils.sheet_to_json(worksheet);
          
          // Determinar qual aba é (14H ou 18H)
          let abaOrigem = 'EXCEL';
          if (nomeAba.toLowerCase().includes('14h')) {
            abaOrigem = '14H';
          } else if (nomeAba.toLowerCase().includes('18h')) {
            abaOrigem = '18H';
          }
          
          const dados = processarDadosRutura(dadosJson as Record<string, unknown>[], abaOrigem);
          dadosProcessados.push(...dados);
        });
      }

      if (apenasPrevicao) {
        // Mostrar apenas os primeiros 10 registros para preview
        setDadosPreview(dadosProcessados.slice(0, 10));
        
        toast({
          title: "Arquivo carregado",
          description: `${dadosProcessados.length} registros encontrados. Clique em "Importar Dados" para confirmar.`,
        });
      } else {
        // Importar dados para o Supabase
        await importarParaSupabase(dadosProcessados);
      }
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast({
        title: "Erro no processamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const importarParaSupabase = async (dados: Rutura[]) => {
    try {
      setImportStatus({
        total: dados.length,
        processados: 0,
        erros: 0,
        sucesso: false,
        mensagem: 'Iniciando importação...'
      });

      // Processar em lotes de 100
      const tamanhoLote = 100;
      let processados = 0;
      let erros = 0;

      for (let i = 0; i < dados.length; i += tamanhoLote) {
        const lote = dados.slice(i, i + tamanhoLote);
        
        try {
          const { error } = await supabase
            .from('ruturas')
            .insert(lote);

          if (error) {
            console.error('Erro no lote:', error);
            erros += lote.length;
          } else {
            processados += lote.length;
          }
        } catch (loteError) {
          console.error('Erro ao processar lote:', loteError);
          erros += lote.length;
        }

        // Atualizar progresso
        setImportStatus({
          total: dados.length,
          processados: processados + erros,
          erros,
          sucesso: false,
          mensagem: `Processando... ${processados + erros}/${dados.length}`
        });

        // Pequeno delay para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const sucesso = erros === 0;
      
      setImportStatus({
        total: dados.length,
        processados,
        erros,
        sucesso,
        mensagem: sucesso 
          ? `Importação concluída com sucesso! ${processados} registros importados.`
          : `Importação concluída com ${erros} erros. ${processados} registros importados.`
      });

      if (sucesso) {
        toast({
          title: "Importação concluída",
          description: `${processados} registros importados com sucesso!`,
        });
        onDataImported();
      } else {
        toast({
          title: "Importação com problemas",
          description: `${processados} registros importados, ${erros} com erro.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erro na importação:', error);
      setImportStatus({
        total: dados.length,
        processados: 0,
        erros: dados.length,
        sucesso: false,
        mensagem: `Erro na importação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });

      toast({
        title: "Erro na importação",
        description: "Falha ao importar dados para o banco de dados.",
        variant: "destructive",
      });
    }
  };

  const confirmarImportacao = () => {
    if (arquivoSelecionado) {
      processarArquivo(arquivoSelecionado, false);
    }
  };

  const analytics = dadosPreview ? calcularAnalytics(dadosPreview) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Dados de Ruturas
          </CardTitle>
          <CardDescription>
            Faça upload de arquivos CSV ou Excel com dados de ruturas. 
            Suporte para arquivos com abas "Mapa_de_Ruturas_14H" e "Mapa_de_Ruturas_18H".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv,.xls,.xlsx"
              className="hidden"
              id="fileInput"
              title="Selecionar arquivo CSV, XLS ou XLSX para importação"
              aria-label="Selecionar arquivo para importação de dados de ruturas"
            />
            
            <div className="space-y-2">
              <div className="flex justify-center gap-4">
                <FileText className="h-12 w-12 text-blue-400" />
                <FileSpreadsheet className="h-12 w-12 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Selecione um arquivo</p>
                <p className="text-sm text-gray-500">CSV, XLS ou XLSX (até 10MB)</p>
              </div>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                variant="outline"
              >
                {importing ? 'Processando...' : 'Escolher Arquivo'}
              </Button>
            </div>
          </div>

          {arquivoSelecionado && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Arquivo selecionado:</strong> {arquivoSelecionado.name} 
                ({(arquivoSelecionado.size / 1024 / 1024).toFixed(2)} MB)
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processando arquivo... Por favor, aguarde.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview dos dados */}
      {dadosPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preview dos Dados</span>
              <Badge variant="secondary">
                {dadosPreview.length}+ registros encontrados
              </Badge>
            </CardTitle>
            <CardDescription>
              Primeiros 10 registros do arquivo. Verifique se os dados estão corretos antes de importar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-2 text-left">Semana</th>
                    <th className="border border-gray-200 p-2 text-left">Seção</th>
                    <th className="border border-gray-200 p-2 text-left">Produto</th>
                    <th className="border border-gray-200 p-2 text-left">Descrição</th>
                    <th className="border border-gray-200 p-2 text-left">Qtd. Falta</th>
                    <th className="border border-gray-200 p-2 text-left">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosPreview.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-2">{item.semana}</td>
                      <td className="border border-gray-200 p-2">{item.secao}</td>
                      <td className="border border-gray-200 p-2">{item.numero_produto}</td>
                      <td className="border border-gray-200 p-2 max-w-xs truncate" title={item.descricao}>
                        {item.descricao}
                      </td>
                      <td className="border border-gray-200 p-2">{item.qtd_falta}</td>
                      <td className="border border-gray-200 p-2">{item.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {analytics && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-medium text-blue-700">Total de Registros</p>
                  <p className="text-lg font-bold text-blue-900">{analytics.totalRuturas}</p>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <p className="text-sm font-medium text-red-700">Quantidade Total</p>
                  <p className="text-lg font-bold text-red-900">{analytics.totalRuturas}</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm font-medium text-green-700">Seções Afetadas</p>
                  <p className="text-lg font-bold text-green-900">{analytics.topSecoes?.length || 0}</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button 
                onClick={confirmarImportacao} 
                disabled={importing}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmar Importação
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setDadosPreview(null);
                  setArquivoSelecionado(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status da importação */}
      {importStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importStatus.sucesso ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Status da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress 
              value={(importStatus.processados / importStatus.total) * 100} 
              className="w-full" 
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{importStatus.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{importStatus.processados}</p>
                <p className="text-sm text-gray-500">Processados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{importStatus.erros}</p>
                <p className="text-sm text-gray-500">Erros</p>
              </div>
            </div>

            <Alert className={importStatus.sucesso ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <AlertDescription>{importStatus.mensagem}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Template para download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Template de Importação
          </CardTitle>
          <CardDescription>
            Baixe o template CSV para garantir que seus dados estejam no formato correto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={() => {
              // Criar template CSV
              const template = `Semana,Hora Rutura,Hora da rutura,Seção,Tipo de requisição,OT,REQ,Tipo Produto,Nº Produto,Descrição,Qtd. Req.,Qtd. Env.,Qtd. Falta,Un. Med,Data, Stock CT, Stock FF,Em trânsito da FF,Tipologia Rutura
1ª Semana de Abril,Rutura 14h,Rutura 14h-Sem Stock Físico e BC,COZINHA FRIA,NORMAL,OT25019062,463418,Congelados,CVPI0024,Pimento Assado Congelado,1.50,0.00,1.50,KG,01/04/2025,0.00,0.00,0.00,Sem Stock Físico e BC`;

              const blob = new Blob([template], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'template-ruturas.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar Template CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
