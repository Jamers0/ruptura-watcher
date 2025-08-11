import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  Download,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Rutura, ExcelImportResult } from '@/lib/types';
import { calculateWeekOfMonth, parseExcelDate, validateRuturaData } from '@/lib/utils-rutura';

interface ImportDataProps {
  onDataImported: () => void;
}

export function ImportData({ onDataImported }: ImportDataProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const { toast } = useToast();

  const processExcelData = useCallback((data: any[], sheetName: string): Rutura[] => {
    const ruturas: Rutura[] = [];
    
    // Pula a primeira linha (cabeçalho)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Verifica se a linha tem dados
      if (!row || Object.values(row).every(v => !v)) continue;
      
      try {
        const rutura: Rutura = {
          semana: row['Semana'] || row[0] || '',
          hora_rutura: row['Hora Rutura'] || row[1] || '',
          hora_da_rutura: row['Hora da rutura'] || row[2] || '',
          secao: row['Seção'] || row[3] || '',
          tipo_requisicao: row['Tipo de requisição'] || row[4] || 'NORMAL',
          ot: row['OT'] || row[5] || '',
          req: row['REQ'] || row[6] || '',
          tipo_produto: row['Tipo Produto'] || row[7] || '',
          numero_produto: row['Nº Produto'] || row[8] || '',
          descricao: row['Descrição'] || row[9] || '',
          qtd_req: parseFloat(row['Qtd. Req.'] || row[10] || '0') || 0,
          qtd_env: parseFloat(row['Qtd. Env.'] || row[11] || '0') || 0,
          qtd_falta: parseFloat(row['Qtd. Falta'] || row[12] || '0') || 0,
          un_med: row['Un. Med'] || row[13] || '',
          data: parseExcelDate(row['Data'] || row[14] || new Date()),
          stock_ct: parseFloat(row['Stock CT'] || row[15] || '0') || 0,
          stock_ff: parseFloat(row['Stock FF'] || row[16] || '0') || 0,
          em_transito_ff: parseFloat(row['Em trânsito da FF'] || row[17] || '0') || 0,
          tipologia_rutura: row['Tipologia Rutura'] || row[18] || '',
          aba_origem: sheetName
        };
        
        // Calcula a semana automaticamente se não estiver preenchida
        if (!rutura.semana || rutura.semana === 'abr.') {
          rutura.semana = calculateWeekOfMonth(rutura.data);
        }
        
        ruturas.push(rutura);
      } catch (error) {
        console.error(`Erro ao processar linha ${i}:`, error);
      }
    }
    
    return ruturas;
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setProgress(0);
    setImportResult(null);

    try {
      const fileName = file.name.toLowerCase();
      let ruturas: Rutura[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Processamento Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        setProgress(25);
        
        const sheets = ['Mapa_de_Ruturas_14H', 'Mapa_de_Ruturas_18H'];
        
        for (const sheetName of sheets) {
          if (workbook.SheetNames.includes(sheetName)) {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const sheetRuturas = processExcelData(data, sheetName);
            ruturas.push(...sheetRuturas);
          } else {
            warnings.push(`Aba '${sheetName}' não encontrada no arquivo`);
          }
        }
        
        setProgress(50);
        
      } else if (fileName.endsWith('.csv')) {
        // Processamento CSV
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              errors.push(...results.errors.map(e => e.message));
            }
            ruturas = processExcelData(results.data as any[], 'CSV_Import');
            setProgress(50);
          },
          error: (error) => {
            errors.push(`Erro ao ler CSV: ${error.message}`);
          }
        });
      } else {
        errors.push('Formato de arquivo não suportado. Use .xlsx, .xls ou .csv');
        setIsLoading(false);
        return;
      }

      setProgress(75);

      // Validação dos dados
      const validRuturas: Rutura[] = [];
      ruturas.forEach((rutura, index) => {
        const validationErrors = validateRuturaData(rutura);
        if (validationErrors.length > 0) {
          errors.push(`Linha ${index + 2}: ${validationErrors.join(', ')}`);
        } else {
          validRuturas.push(rutura);
        }
      });

      setProgress(90);

      // Salvar no Supabase
      if (validRuturas.length > 0) {
        const { error: insertError } = await supabase
          .from('ruturas')
          .insert(validRuturas.map(rutura => ({
            ...rutura,
            data_requisicao: rutura.data,
            aba_origem: rutura.aba_origem || 'Import',
            user_id: null
          })));

        if (insertError) {
          errors.push(`Erro ao salvar no banco: ${insertError.message}`);
        } else {
          toast({
            title: "Import realizado com sucesso!",
            description: `${validRuturas.length} ruturas foram importadas.`,
          });
          onDataImported();
        }
      }

      setProgress(100);
      setImportResult({
        data: validRuturas,
        errors,
        warnings
      });

    } catch (error) {
      console.error('Erro no import:', error);
      toast({
        title: "Erro no import",
        description: "Ocorreu um erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Reset input
      event.target.value = '';
    }
  }, [processExcelData, toast, onDataImported]);

  const downloadTemplate = () => {
    const template = [
      ['Semana', 'Hora Rutura', 'Hora da rutura', 'Seção', 'Tipo de requisição', 'OT', 'REQ', 'Tipo Produto', 'Nº Produto', 'Descrição', 'Qtd. Req.', 'Qtd. Env.', 'Qtd. Falta', 'Un. Med', 'Data', 'Stock CT', 'Stock FF', 'Em trânsito da FF', 'Tipologia Rutura'],
      ['1ª Semana de Janeiro', 'Rutura 14h', 'Rutura 14h-Sem Stock Físico e BC', 'COZINHA FRIA', 'NORMAL', 'OT25019062', '463418', 'Congelados', 'CVPI0024', 'Pimento Assado Congelado', '1,495', '0', '1,495', 'KG', '01/01/2025', '0', '0', '0', 'Sem Stock Físico e BC']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Ruturas");
    XLSX.writeFile(wb, "template_ruturas.xlsx");
  };

  const clearResults = () => {
    setImportResult(null);
    setProgress(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Importar Dados de Ruturas
        </h1>
        <p className="text-muted-foreground mt-2">
          Faça upload dos arquivos Excel (.xlsx) ou CSV com os dados das ruturas
        </p>
      </div>

      {/* Upload Card */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="mb-2 text-lg font-medium text-foreground">
                  Clique para fazer upload
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  Suporta arquivos Excel (.xlsx, .xls) e CSV<br />
                  Máximo 10MB por arquivo
                </p>
              </div>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
            
            {importResult && (
              <Button variant="outline" onClick={clearResults}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Resultados
              </Button>
            )}
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Processando arquivo... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {importResult && (
        <div className="space-y-4">
          {/* Success */}
          {importResult.data.length > 0 && (
            <Alert className="border-success bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success-foreground">
                <strong>{importResult.data.length} ruturas</strong> foram importadas com sucesso!
              </AlertDescription>
            </Alert>
          )}

          {/* Warnings */}
          {importResult.warnings.length > 0 && (
            <Alert className="border-warning bg-warning/10">
              <Info className="h-4 w-4 text-warning" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong className="text-warning-foreground">Avisos:</strong>
                  {importResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-muted-foreground">
                      • {warning}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong className="text-destructive-foreground">Erros encontrados:</strong>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-muted-foreground">
                        • {error}
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Resumo da Importação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{importResult.data.length}</div>
                  <div className="text-sm text-muted-foreground">Importadas</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">{importResult.warnings.length}</div>
                  <div className="text-sm text-muted-foreground">Avisos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{importResult.errors.length}</div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {importResult.data.reduce((sum, r) => sum + r.qtd_falta, 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total em Falta</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Instruções de Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Formatos Suportados:</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Excel</Badge>
                  <span>Arquivos .xlsx e .xls com abas 'Mapa_de_Ruturas_14H' e 'Mapa_de_Ruturas_18H'</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">CSV</Badge>
                  <span>Arquivos .csv separados por vírgula com cabeçalho</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Colunas Obrigatórias:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>• Seção, REQ, OT, Nº Produto</div>
                <div>• Descrição, Data, Qtd. Req.</div>
                <div>• Qtd. Falta, Tipologia Rutura</div>
                <div>• Un. Med (KG, L, UN, RL, etc.)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}