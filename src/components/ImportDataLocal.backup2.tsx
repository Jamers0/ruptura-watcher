import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, AlertCircle, CheckCircle2, Download, FileSpreadsheet, Database, Clipboard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Rutura } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';

interface ImportDataLocalProps {
  onDataImported: () => void;
}

interface ImportStatus {
  total: number;
  processados: number;
  erros: number;
  sucesso: boolean;
  mensagem: string;
}

export function ImportDataLocal({ onDataImported }: ImportDataLocalProps) {
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus | null>(null);
  const [textareaData, setTextareaData] = useState('');
  const [enviandoSupabase, setEnviandoSupabase] = useState(false);
  const [cacheCarregado, setCacheCarregado] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { dadosOriginais, adicionarRuturas, limparDados } = useData();

  // Cache local dos dados
  useEffect(() => {
    if (!cacheCarregado) {
      const dadosCache = localStorage.getItem('ruturas_cache');
      if (dadosCache) {
        try {
          const dados = JSON.parse(dadosCache);
          if (dados && dados.length > 0) {
            adicionarRuturas(dados);
            toast({
              title: "Cache carregado",
              description: `${dados.length} registros restaurados do cache local`,
            });
            setCacheCarregado(true);
          }
        } catch (error) {
          console.error('Erro ao carregar cache:', error);
          localStorage.removeItem('ruturas_cache');
        }
      }
      setCacheCarregado(true);
    }
  }, [cacheCarregado, adicionarRuturas, toast]);

  // Função para calcular semana do mês baseada na data
  const calcularSemanaDoMes = (data: string): string => {
    try {
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) return 'Sem dados';
      
      const dia = dataObj.getDate();
      const mes = dataObj.toLocaleDateString('pt-PT', { month: 'long' });
      const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
      
      const semanaNumero = Math.ceil(dia / 7);
      const numeroOrdinal = semanaNumero === 1 ? '1ª' : 
                           semanaNumero === 2 ? '2ª' : 
                           semanaNumero === 3 ? '3ª' : 
                           semanaNumero === 4 ? '4ª' : '5ª';
      
      return `${numeroOrdinal} Semana de ${mesCapitalizado}`;
    } catch (error) {
      console.warn(`Erro ao calcular semana: ${data}`, error);
      return 'Sem dados';
    }
  };

  // Função para detectar tipologia de rutura automaticamente
  const detectarTipologiaRutura = (dados: Partial<Rutura>): string => {
    const qtdFalta = dados.qtd_falta || 0;
    const stockCT = dados.stock_ct || 0;
    const stockFF = dados.stock_ff || 0;
    const emTransito = dados.em_transito_ff || 0;
    const qtdEnv = dados.qtd_env || 0;
    const qtdReq = dados.qtd_req || 0;

    // Se já tem tipologia definida no arquivo, usar ela
    if (dados.tipologia_rutura && 
        dados.tipologia_rutura !== 'Não especificado' && 
        dados.tipologia_rutura.trim() !== '') {
      return dados.tipologia_rutura;
    }

    // Lógica de detecção automática baseada nas regras do negócio
    if (qtdFalta > 0) {
      if (stockCT === 0 && stockFF === 0 && emTransito === 0) {
        return 'Sem Stock Físico e BC';
      } else if (stockCT > 0 && qtdEnv === 0 && qtdReq > 0) {
        return 'Acerto de Inventário';
      } else if (stockCT === 0 && emTransito === 0 && stockFF > 0) {
        return 'A pedir à FF';
      } else if (stockCT === 0 && emTransito > 0) {
        return 'Em Transferência da FF';
      }
    }

    return 'Outros';
  };

  // Função melhorada para formatação de datas
  const formatarData = (dataStr: string): string => {
    if (!dataStr || dataStr.trim() === '' || dataStr === '#N/A' || dataStr === 'N/A') {
      return new Date().toISOString().split('T')[0];
    }
    
    try {
      const cleanStr = String(dataStr).trim();
      
      // Verificar se contém texto que claramente não é uma data
      const textosTipologias = ['sem stock', 'acerto', 'pedir', 'transferência', 'outros'];
      const isTextoTipologia = textosTipologias.some(texto => 
        cleanStr.toLowerCase().includes(texto)
      );
      
      if (isTextoTipologia) {
        console.warn(`Valor não é uma data: ${dataStr}, usando data atual`);
        return new Date().toISOString().split('T')[0];
      }
      
      // Excel serial date - verificar se é válido
      const numValue = Number(cleanStr);
      if (!isNaN(numValue) && cleanStr.length <= 6 && numValue >= 1 && numValue <= 50000) {
        const excelDate = new Date((numValue - 25569) * 86400 * 1000);
        if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
          return excelDate.toISOString().split('T')[0];
        }
      }
      
      let data: Date;
      
      if (cleanStr.includes('/')) {
        const partes = cleanStr.split('/');
        if (partes.length === 3) {
          const dia = parseInt(partes[0]);
          const mes = parseInt(partes[1]);
          let ano = parseInt(partes[2]);
          
          if (ano < 100) ano += 2000;
          
          // Detectar formato MM/dd/yyyy vs dd/MM/yyyy
          if (dia > 12) {
            data = new Date(ano, mes - 1, dia); // dd/MM/yyyy
          } else if (mes > 12) {
            data = new Date(ano, dia - 1, mes); // MM/dd/yyyy
          } else {
            // Assumir MM/dd/yyyy por padrão
            data = new Date(ano, dia - 1, mes);
          }
        } else {
          data = new Date(cleanStr);
        }
      } else {
        data = new Date(cleanStr);
      }

      if (isNaN(data.getTime()) || data.getFullYear() < 1900 || data.getFullYear() > 2100) {
        console.warn(`Data inválida: ${dataStr}, usando data atual`);
        return new Date().toISOString().split('T')[0];
      }

      return data.toISOString().split('T')[0];
    } catch (error) {
      console.warn(`Erro ao formatar data: ${dataStr}`, error);
      return new Date().toISOString().split('T')[0];
    }
  };

  // Mapear colunas do Excel/CSV para nossa estrutura
  const mapearColunas = (row: Record<string, unknown>, abaOrigem: string = 'IMPORTACAO'): Rutura => {
    const keys = Object.keys(row);
    const isExcelFormat = keys.length <= 20;

    let dados: Partial<Rutura>;

    if (isExcelFormat) {
      const valores = Object.values(row);
      
      dados = {
        semana: String(valores[0] || '').trim(),
        hora_rutura: String(valores[1] || '').trim(),
        hora_da_rutura: String(valores[2] || '').trim(),
        secao: String(valores[3] || '').trim(),
        tipo_requisicao: String(valores[4] || '').trim(),
        ot: String(valores[5] || '').trim(),
        req: String(valores[6] || '').trim(),
        tipo_produto: String(valores[7] || '').trim(),
        numero_produto: String(valores[8] || '').trim(),
        descricao: String(valores[9] || '').trim(),
        qtd_req: parseFloat(String(valores[10] || '0').replace(',', '.')) || 0,
        qtd_env: parseFloat(String(valores[11] || '0').replace(',', '.')) || 0,
        qtd_falta: parseFloat(String(valores[12] || '0').replace(',', '.')) || 0,
        un_med: String(valores[13] || 'UN').trim() === '#N/A' ? 'UN' : String(valores[13] || 'UN').trim(),
        data: valores[14] && String(valores[14]).trim() !== '' ? formatarData(String(valores[14])) : new Date().toISOString().split('T')[0],
        stock_ct: parseFloat(String(valores[15] || '0').replace(',', '.')) || 0,
        stock_ff: parseFloat(String(valores[16] || '0').replace(',', '.')) || 0,
        em_transito_ff: parseFloat(String(valores[17] || '0').replace(',', '.')) || 0,
        tipologia_rutura: String(valores[18] || '').trim()
      };
    } else {
      dados = {
        semana: String(row.semana || row['Semana'] || '').trim(),
        hora_rutura: String(row.hora_rutura || row['Hora Rutura'] || '').trim(),
        hora_da_rutura: String(row.hora_da_rutura || row['Hora da rutura'] || '').trim(),
        secao: String(row.secao || row['Seção'] || '').trim(),
        tipo_requisicao: String(row.tipo_requisicao || row['Tipo de requisição'] || '').trim(),
        ot: String(row.ot || row['OT'] || '').trim(),
        req: String(row.req || row['REQ'] || '').trim(),
        tipo_produto: String(row.tipo_produto || row['Tipo Produto'] || '').trim(),
        numero_produto: String(row.numero_produto || row['Nº Produto'] || '').trim(),
        descricao: String(row.descricao || row['Descrição'] || '').trim(),
        qtd_req: parseFloat(String(row.qtd_req || row['Qtd. Req.'] || '0').replace(',', '.')) || 0,
        qtd_env: parseFloat(String(row.qtd_env || row['Qtd. Env.'] || '0').replace(',', '.')) || 0,
        qtd_falta: parseFloat(String(row.qtd_falta || row['Qtd. Falta'] || '0').replace(',', '.')) || 0,
        un_med: String(row.un_med || row['Un. Med'] || 'UN').trim(),
        data: formatarData(String(row.data || row['Data'] || '')),
        stock_ct: parseFloat(String(row.stock_ct || row[' Stock CT'] || '0').replace(',', '.')) || 0,
        stock_ff: parseFloat(String(row.stock_ff || row[' Stock FF'] || '0').replace(',', '.')) || 0,
        em_transito_ff: parseFloat(String(row.em_transito_ff || row['Em trânsito da FF'] || '0').replace(',', '.')) || 0,
        tipologia_rutura: String(row.tipologia_rutura || row['Tipologia Rutura'] || '').trim()
      };
    }

    // Determinar aba_origem
    let aba_origem = abaOrigem;
    if (dados.hora_rutura?.includes('14') || abaOrigem === '14H') {
      aba_origem = '14H';
    } else if (dados.hora_rutura?.includes('18') || abaOrigem === '18H') {
      aba_origem = '18H';
    }

    // Calcular semana automaticamente baseada na data
    const dataFormatada = dados.data || new Date().toISOString().split('T')[0];
    const semanaCalculada = calcularSemanaDoMes(dataFormatada);
    const tipologiaDetectada = detectarTipologiaRutura(dados);

    return {
      id: `local-${Date.now()}-${Math.random()}`,
      semana: semanaCalculada,
      hora_rutura: dados.hora_rutura || '',
      hora_da_rutura: dados.hora_da_rutura || dados.hora_rutura || '',
      secao: dados.secao || '',
      tipo_requisicao: dados.tipo_requisicao || '',
      ot: dados.ot || '',
      req: dados.req || '',
      tipo_produto: dados.tipo_produto || '',
      numero_produto: dados.numero_produto || '',
      descricao: dados.descricao || '',
      qtd_req: dados.qtd_req || 0,
      qtd_env: dados.qtd_env || 0,
      qtd_falta: dados.qtd_falta || 0,
      un_med: dados.un_med || 'UN',
      data: dataFormatada,
      stock_ct: dados.stock_ct || 0,
      stock_ff: dados.stock_ff || 0,
      em_transito_ff: dados.em_transito_ff || 0,
      tipologia_rutura: tipologiaDetectada,
      aba_origem,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const processarArquivo = async (arquivo: File) => {
    try {
      setImporting(true);
      const dadosProcessados: Rutura[] = [];
      
      if (arquivo.name.toLowerCase().endsWith('.csv')) {
        const texto = await arquivo.text();
        Papa.parse(texto, {
          header: false,
          complete: (resultado) => {
            resultado.data.forEach((linha: unknown, index) => {
              if (index === 0) return; // Pular header
              if (Array.isArray(linha) && linha.some(cell => cell)) {
                const rowObj: Record<string, unknown> = {};
                linha.forEach((col: unknown, idx: number) => {
                  rowObj[idx] = col;
                });
                
                const rutura = mapearColunas(rowObj, 'CSV');
                if (rutura.numero_produto) {
                  dadosProcessados.push(rutura);
                }
              }
            });
          },
        });
      } else {
        const arrayBuffer = await arquivo.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        console.log('Abas encontradas:', workbook.SheetNames);
        
        workbook.SheetNames.forEach(nomeAba => {
          const worksheet = workbook.Sheets[nomeAba];
          const dadosJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Detecção melhorada das abas de ruturas
          let abaOrigem = 'EXCEL';
          if (nomeAba.toLowerCase().includes('mapa_de_ruturas_14h') || 
              nomeAba.toLowerCase().includes('14h') || 
              nomeAba.toLowerCase().includes('rutura 14h')) {
            abaOrigem = '14H';
          } else if (nomeAba.toLowerCase().includes('mapa_de_ruturas_18h') || 
                     nomeAba.toLowerCase().includes('18h') || 
                     nomeAba.toLowerCase().includes('rutura 18h')) {
            abaOrigem = '18H';
          }
          
          console.log(`Processando aba: ${nomeAba} -> ${abaOrigem} com ${dadosJson.length} linhas`);
          
          dadosJson.forEach((linha: unknown, index) => {
            if (index === 0) return; // Pular header
            
            if (Array.isArray(linha) && linha.some(cell => cell)) {
              // Verificar se a linha contém dados válidos
              const temNumeroProduto = linha[8] && String(linha[8]).trim() !== '' && String(linha[8]) !== '#N/A';
              const temDescricao = linha[9] && String(linha[9]).trim() !== '' && String(linha[9]) !== '#N/A';
              
              if (temNumeroProduto || temDescricao) {
                const rowObj: Record<string, unknown> = {};
                linha.forEach((col: unknown, idx: number) => {
                  rowObj[idx] = col;
                });
                
                const rutura = mapearColunas(rowObj, abaOrigem);
                if (rutura.numero_produto || rutura.descricao) {
                  dadosProcessados.push(rutura);
                }
              }
            }
          });
        });
      }

      adicionarRuturas(dadosProcessados);
      
      // Salvar no cache local
      localStorage.setItem('ruturas_cache', JSON.stringify(dadosProcessados));
      
      toast({
        title: "Dados carregados localmente",
        description: `${dadosProcessados.length} registros carregados para análise`,
      });
      
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

  const processarTextoColado = () => {
    if (!textareaData.trim()) {
      toast({
        title: "Erro",
        description: "Cole os dados na área de texto antes de processar",
        variant: "destructive",
      });
      return;
    }

    try {
      const linhas = textareaData.split('\n').filter(linha => linha.trim());
      const dadosProcessados: Rutura[] = [];

      for (const linha of linhas) {
        if (linha.trim()) {
          const colunas = linha.includes('\t') ? linha.split('\t') : linha.split(',');
          
          if (colunas.length >= 10) {
            const rowObj: Record<string, unknown> = {};
            colunas.forEach((col, index) => {
              rowObj[index] = col.trim();
            });
            
            const rutura = mapearColunas(rowObj, 'TEXTO');
            dadosProcessados.push(rutura);
          }
        }
      }

      adicionarRuturas(dadosProcessados);
      
      // Salvar no cache local
      localStorage.setItem('ruturas_cache', JSON.stringify(dadosProcessados));
      
      toast({
        title: "Dados processados",
        description: `${dadosProcessados.length} registros adicionados`,
      });
      setTextareaData('');
    } catch (error) {
      console.error('Erro ao processar texto:', error);
      toast({
        title: "Erro no processamento",
        description: "Erro ao processar os dados colados",
        variant: "destructive",
      });
    }
  };

  const enviarParaSupabase = async () => {
    if (!dadosOriginais.length) {
      toast({
        title: "Erro",
        description: "Não há dados para enviar",
        variant: "destructive",
      });
      return;
    }

    try {
      setEnviandoSupabase(true);
      
      // Preparar dados para inserção no Supabase
      const dadosParaInserir = dadosOriginais.map(({ id, created_at, updated_at, ...rutura }) => ({
        ...rutura,
        data_requisicao: rutura.data, // Mapear data para data_requisicao
        aba_origem: rutura.aba_origem || 'IMPORTACAO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Inserir em lotes de 100
      const BATCH_SIZE = 100;
      let processados = 0;
      
      for (let i = 0; i < dadosParaInserir.length; i += BATCH_SIZE) {
        const lote = dadosParaInserir.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from('ruturas')
          .insert(lote);

        if (error) {
          console.error('Erro no lote:', error);
          throw new Error(`Erro ao inserir lote: ${error.message}`);
        }
        
        processados += lote.length;
        
        // Atualizar progresso
        setImportStatus({
          total: dadosParaInserir.length,
          processados,
          erros: 0,
          sucesso: true,
          mensagem: `Enviando para base de dados... ${processados}/${dadosParaInserir.length}`
        });
      }

      toast({
        title: "Sucesso!",
        description: `${processados} registros enviados para a base de dados`,
      });

      onDataImported();
      
    } catch (error) {
      console.error('Erro ao enviar para Supabase:', error);
      toast({
        title: "Erro no envio",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setEnviandoSupabase(false);
      setImportStatus(null);
    }
  };

  const analytics = dadosOriginais.length > 0 ? {
    totalRuturas: dadosOriginais.length,
    ruturas14H: dadosOriginais.filter(r => r.aba_origem === '14H').length,
    ruturas18H: dadosOriginais.filter(r => r.aba_origem === '18H').length,
    secoesUnicas: new Set(dadosOriginais.map(r => r.secao)).size,
    produtosUnicos: new Set(dadosOriginais.map(r => r.numero_produto)).size
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Importar Dados</h1>
        <p className="text-gray-600 mt-2">
          Carregue arquivos Excel (.xlsx) ou CSV com dados das abas "Mapa_de_Ruturas_14H" e "Mapa_de_Ruturas_18H"
        </p>
      </div>

      <Tabs defaultValue="arquivo" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="arquivo">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar Arquivo
          </TabsTrigger>
          <TabsTrigger value="texto">
            <Clipboard className="h-4 w-4 mr-2" />
            Colar Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="arquivo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selecionar Arquivo</CardTitle>
              <CardDescription>
                Suporte a arquivos Excel (.xlsx) e CSV com os dados das ruturas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setArquivoSelecionado(file);
                    }
                  }}
                  className="hidden"
                  aria-label="Selecionar arquivo"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Escolher Arquivo
                </Button>
                {arquivoSelecionado && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">{arquivoSelecionado.name}</span>
                  </div>
                )}
              </div>

              <Button 
                onClick={() => arquivoSelecionado && processarArquivo(arquivoSelecionado)}
                disabled={!arquivoSelecionado || importing}
                className="w-full"
              >
                {importing ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Carregar Dados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="texto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Colar Dados</CardTitle>
              <CardDescription>
                Cole os dados diretamente do Excel ou de outra fonte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Cole os dados aqui (separados por tab ou vírgula)..."
                value={textareaData}
                onChange={(e) => setTextareaData(e.target.value)}
                rows={8}
              />
              <Button 
                onClick={processarTextoColado}
                disabled={!textareaData.trim()}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Processar Dados Colados
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Estatísticas dos dados carregados */}
      {dadosOriginais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Dados Carregados Localmente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{dadosOriginais.length}</div>
                <div className="text-sm text-gray-600">Total de Registros</div>
              </div>
              {analytics && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.ruturas14H || 0}</div>
                    <div className="text-sm text-gray-600">Ruturas 14H</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.ruturas18H || 0}</div>
                    <div className="text-sm text-gray-600">Ruturas 18H</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.secoesUnicas}</div>
                    <div className="text-sm text-gray-600">Seções Diferentes</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={enviarParaSupabase}
                disabled={enviandoSupabase}
                className="flex-1"
              >
                {enviandoSupabase ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar para Base de Dados
                  </>
                )}
              </Button>
              <Button 
                onClick={() => {
                  limparDados();
                  localStorage.removeItem('ruturas_cache');
                  toast({
                    title: "Cache limpo",
                    description: "Dados removidos da memória local",
                  });
                }}
                variant="outline"
              >
                Limpar Dados
              </Button>
            </div>

            {importStatus && (
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>{importStatus.mensagem}</span>
                  <span>{importStatus.processados}/{importStatus.total}</span>
                </div>
                <Progress 
                  value={(importStatus.processados / importStatus.total) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Formato esperado:</strong> Os dados devem conter as colunas: Semana, Hora Rutura, Seção, Tipo de requisição, OT, REQ, Tipo Produto, Nº Produto, Descrição, Qtd. Req., Qtd. Env., Qtd. Falta, Un. Med, Data, Stock CT, Stock FF, Em trânsito da FF, Tipologia Rutura.
          <br />
          <strong>Detecção automática:</strong> A semana será calculada automaticamente baseada na data. A tipologia de rutura será detectada inteligentemente quando não especificada.
        </AlertDescription>
      </Alert>
    </div>
  );
}
