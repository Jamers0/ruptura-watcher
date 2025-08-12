import { useState, useRef } from 'react';
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
import { calcularAnalytics } from '@/lib/processamento-dados';
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
  const [abaEscolhida, setAbaEscolhida] = useState<'14H' | '18H' | 'AUTO'>('AUTO');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { dadosOriginais, adicionarRuturas, limparDados, estatisticas } = useData();

  // Mapear colunas do Excel/CSV para nossa estrutura
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

  const detectarTipologiaRutura = (dados: Partial<Rutura>): string => {
    const qtdFalta = dados.qtd_falta || 0;
    const stockCT = dados.stock_ct || 0;
    const stockFF = dados.stock_ff || 0;
    const emTransito = dados.em_transito_ff || 0;
    const qtdEnv = dados.qtd_env || 0;
    const qtdReq = dados.qtd_req || 0;

    // Se já tem tipologia definida no arquivo, usar ela
    if (dados.tipologia_rutura && dados.tipologia_rutura !== 'Não especificado') {
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

    return dados.tipologia_rutura || 'Não especificado';
  };

  const mapearColunas = (row: Record<string, any>, abaOrigem: string = 'IMPORTACAO'): Rutura => {
    // Detectar se é formato do Excel ou CSV baseado nas chaves
    const keys = Object.keys(row);
    const isExcelFormat = keys.length <= 19; // Excel tem menos colunas

    let dados: Partial<Rutura>;

    if (isExcelFormat) {
      // Formato Excel: ago., Rutura 14h, Rutura 14h-, RPL, NORMAL, OT25056766, 490120, Secos, CMMO0019, Molho tabasco 60ml, 11, 0, 0, UN, 8/3/2025, 0,00, 0, 0
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
        data: formatarData(String(valores[14] || '')),
        stock_ct: parseFloat(String(valores[15] || '0').replace(',', '.')) || 0,
        stock_ff: parseFloat(String(valores[16] || '0').replace(',', '.')) || 0,
        em_transito_ff: parseFloat(String(valores[17] || '0').replace(',', '.')) || 0,
        tipologia_rutura: String(valores[18] || '').trim() || 'Não especificado'
      };
    } else {
      // Formato CSV com headers
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
        tipologia_rutura: String(row.tipologia_rutura || row['Tipologia Rutura'] || '').trim() || 'Não especificado'
      };
    }

    // Determinar aba_origem baseado na hora_rutura ou nome da aba
    let aba_origem = abaOrigem;
    if (dados.hora_rutura?.includes('14') || abaOrigem === '14H') {
      aba_origem = '14H';
    } else if (dados.hora_rutura?.includes('18') || abaOrigem === '18H') {
      aba_origem = '18H';
    }

    // Calcular semana automaticamente baseada na data
    const dataFormatada = dados.data || new Date().toISOString().split('T')[0];
    const semanaCalculada = calcularSemanaDoMes(dataFormatada);

    // Detectar tipologia de rutura automaticamente se necessário
    const tipologiaDetectada = detectarTipologiaRutura(dados);

    return {
      id: `local-${Date.now()}-${Math.random()}`, // ID temporário para dados locais
      semana: semanaCalculada, // Usar semana calculada automaticamente
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
    // Detectar se é formato do Excel ou CSV baseado nas chaves
    const keys = Object.keys(row);
    const isExcelFormat = keys.length <= 19; // Excel tem menos colunas

    let dados: Partial<Rutura>;

    if (isExcelFormat) {
      // Formato Excel: ago., Rutura 14h, Rutura 14h-, RPL, NORMAL, OT25056766, 490120, Secos, CMMO0019, Molho tabasco 60ml, 11, 0, 0, UN, 8/3/2025, 0,00, 0, 0
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
        data: formatarData(String(valores[14] || '')),
        stock_ct: parseFloat(String(valores[15] || '0').replace(',', '.')) || 0,
        stock_ff: parseFloat(String(valores[16] || '0').replace(',', '.')) || 0,
        em_transito_ff: parseFloat(String(valores[17] || '0').replace(',', '.')) || 0,
        tipologia_rutura: String(valores[18] || '').trim() || 'Não especificado'
      };
    } else {
      // Formato CSV com headers
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
        tipologia_rutura: String(row.tipologia_rutura || row['Tipologia Rutura'] || '').trim() || 'Não especificado'
      };
    }

    // Determinar aba_origem baseado na hora_rutura
    let aba_origem = abaOrigem;
    if (dados.hora_rutura?.includes('14')) {
      aba_origem = '14H';
    } else if (dados.hora_rutura?.includes('18')) {
      aba_origem = '18H';
    }

    return {
      id: `local-${Date.now()}-${Math.random()}`, // ID temporário para dados locais
      semana: dados.semana || 'Sem dados',
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
      data: dados.data || new Date().toISOString().split('T')[0],
      stock_ct: dados.stock_ct || 0,
      stock_ff: dados.stock_ff || 0,
      em_transito_ff: dados.em_transito_ff || 0,
      tipologia_rutura: dados.tipologia_rutura || 'Não especificado',
      aba_origem,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const formatarData = (dataStr: string): string => {
    if (!dataStr || dataStr.trim() === '' || dataStr === '#N/A' || dataStr === 'N/A') {
      return new Date().toISOString().split('T')[0];
    }
    
    try {
      // Limpar a string
      const cleanStr = String(dataStr).trim();
      
      // Se é um número (Excel date serial) - verificar se é realmente uma data válida
      const numValue = Number(cleanStr);
      if (!isNaN(numValue) && cleanStr.length <= 6) {
        // Excel serial dates começam em 1 (1/1/1900) e vão até ~50000 (ano 2036)
        // Números como 0.34, 4.93 são muito pequenos para serem datas válidas
        if (numValue >= 1 && numValue <= 50000) {
          const excelDate = new Date((numValue - 25569) * 86400 * 1000);
          if (!isNaN(excelDate.getTime()) && excelDate.getFullYear() > 1900 && excelDate.getFullYear() < 2100) {
            return excelDate.toISOString().split('T')[0];
          }
        }
      }
      
      let data: Date;
      
      if (cleanStr.includes('/')) {
        // Formato MM/dd/yyyy ou dd/MM/yyyy
        const partes = cleanStr.split('/');
        if (partes.length === 3) {
          let dia = parseInt(partes[0]);
          let mes = parseInt(partes[1]);
          let ano = parseInt(partes[2]);
          
          // Se ano tem 2 dígitos, assumir 20xx
          if (ano < 100) {
            ano += 2000;
          }
          
          // Validar se é MM/dd/yyyy ou dd/MM/yyyy
          if (dia > 12) {
            // Deve ser dd/MM/yyyy
            data = new Date(ano, mes - 1, dia);
          } else if (mes > 12) {
            // Deve ser MM/dd/yyyy (inverter)
            data = new Date(ano, dia - 1, mes);
          } else {
            // Ambiguidade - assumir MM/dd/yyyy se dia <= 12
            if (dia <= 12 && mes <= 12) {
              data = new Date(ano, dia - 1, mes); // MM/dd/yyyy
            } else {
              data = new Date(ano, mes - 1, dia); // dd/MM/yyyy
            }
          }
        } else {
          data = new Date(cleanStr);
        }
      } else if (cleanStr.includes('-')) {
        // Formato yyyy-MM-dd ou dd-MM-yyyy
        const partes = cleanStr.split('-');
        if (partes.length === 3) {
          if (partes[0].length === 4) {
            // yyyy-MM-dd
            data = new Date(cleanStr);
          } else {
            // dd-MM-yyyy
            data = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`);
          }
        } else {
          data = new Date(cleanStr);
        }
      } else {
        // Tentar parseamento direto
        data = new Date(cleanStr);
      }

      // Validar data resultante
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

  const processarTexto = (texto: string) => {
    const linhas = texto.split('\n').filter(linha => linha.trim());
    const dadosProcessados: Rutura[] = [];

    for (const linha of linhas) {
      if (linha.trim()) {
        // Separar por tab ou vírgula
        const colunas = linha.includes('\t') ? linha.split('\t') : linha.split(',');
        
        if (colunas.length >= 10) { // Mínimo de colunas necessárias
          const rowObj: Record<string, any> = {};
          colunas.forEach((col, index) => {
            rowObj[index] = col.trim();
          });
          
          const rutura = mapearColunas(rowObj, 'TEXTO');
          dadosProcessados.push(rutura);
        }
      }
    }

    return dadosProcessados;
  };

  const processarArquivo = async (arquivo: File) => {
    try {
      setImporting(true);
      const dadosProcessados: Rutura[] = [];
      
      if (arquivo.name.toLowerCase().endsWith('.csv')) {
        const texto = await arquivo.text();
        
        Papa.parse(texto, {
          header: false, // Não usar headers automáticos
          complete: (resultado) => {
            resultado.data.forEach((linha: any, index) => {
              if (index === 0) return; // Pular header se existir
              if (Array.isArray(linha) && linha.some(cell => cell)) {
                const rowObj: Record<string, any> = {};
                linha.forEach((col: any, idx: number) => {
                  rowObj[idx] = col;
                });
                
                const rutura = mapearColunas(rowObj, 'CSV');
                if (rutura.numero_produto) { // Só adicionar se tem produto
                  dadosProcessados.push(rutura);
                }
              }
            });
          },
        });
      } else {
        const arrayBuffer = await arquivo.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Verificar se há múltiplas abas para evitar duplicação
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
          
          dadosJson.forEach((linha: any, index) => {
            if (index === 0) return; // Pular header
            if (Array.isArray(linha) && linha.some(cell => cell)) {
              const rowObj: Record<string, any> = {};
              linha.forEach((col: any, idx: number) => {
                rowObj[idx] = col;
              });
              
              const rutura = mapearColunas(rowObj, abaOrigem);
              if (rutura.numero_produto) {
                dadosProcessados.push(rutura);
              }
            }
          });
        });
      }

      adicionarRuturas(dadosProcessados);
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
        description: "Cole os dados na área de texto primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      const dadosProcessados = processarTexto(textareaData);
      adicionarRuturas(dadosProcessados);
      toast({
        title: "Dados processados",
        description: `${dadosProcessados.length} registros carregados localmente`,
      });
    } catch (error) {
      console.error('Erro ao processar texto:', error);
      toast({
        title: "Erro no processamento",
        description: "Verifique o formato dos dados colados",
        variant: "destructive",
      });
    }
  };

  const enviarParaSupabase = async () => {
    if (dadosOriginais.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados locais para enviar",
        variant: "destructive",
      });
      return;
    }

    try {
      setEnviandoSupabase(true);
      setImportStatus({
        total: dadosOriginais.length,
        processados: 0,
        erros: 0,
        sucesso: false,
        mensagem: 'Preparando dados para Supabase...'
      });

      // Preparar dados para Supabase (remover campos locais)
      const dadosParaSupabase = dadosOriginais.map(item => ({
        semana: item.semana,
        hora_rutura: item.hora_rutura,
        hora_da_rutura: item.hora_da_rutura,
        secao: item.secao,
        tipo_requisicao: item.tipo_requisicao,
        ot: item.ot,
        req: item.req,
        tipo_produto: item.tipo_produto,
        numero_produto: item.numero_produto,
        descricao: item.descricao,
        qtd_req: item.qtd_req,
        qtd_env: item.qtd_env,
        qtd_falta: item.qtd_falta,
        un_med: item.un_med,
        data_requisicao: item.data, // Mapear para data_requisicao
        stock_ct: item.stock_ct,
        stock_ff: item.stock_ff,
        em_transito_ff: item.em_transito_ff,
        tipologia_rutura: item.tipologia_rutura,
        aba_origem: item.aba_origem,
        data: item.data
      }));

      // Processar em lotes
      const tamanhoLote = 50;
      let processados = 0;
      let erros = 0;

      for (let i = 0; i < dadosParaSupabase.length; i += tamanhoLote) {
        const lote = dadosParaSupabase.slice(i, i + tamanhoLote);
        
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

        setImportStatus({
          total: dadosOriginais.length,
          processados: processados + erros,
          erros,
          sucesso: false,
          mensagem: `Enviando para Supabase... ${processados + erros}/${dadosOriginais.length}`
        });

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const sucesso = erros === 0;
      
      setImportStatus({
        total: dadosOriginais.length,
        processados,
        erros,
        sucesso,
        mensagem: sucesso 
          ? `Dados enviados com sucesso! ${processados} registros no Supabase.`
          : `Envio com problemas: ${processados} enviados, ${erros} erros.`
      });

      if (sucesso) {
        toast({
          title: "Sucesso",
          description: `${processados} registros enviados para o Supabase!`,
        });
        onDataImported();
        // Limpar dados locais após sucesso
        limparDados();
        setTextareaData('');
        setArquivoSelecionado(null);
      }

    } catch (error) {
      console.error('Erro no envio:', error);
      toast({
        title: "Erro no envio",
        description: "Falha ao enviar dados para o Supabase.",
        variant: "destructive",
      });
    } finally {
      setEnviandoSupabase(false);
    }
  };

  const limparDadosLocais = () => {
    limparDados();
    setTextareaData('');
    setArquivoSelecionado(null);
    setImportStatus(null);
    toast({
      title: "Dados limpos",
      description: "Dados locais removidos",
    });
  };

  const analytics = dadosOriginais.length > 0 ? calcularAnalytics(dadosOriginais) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Dados de Ruturas
          </CardTitle>
          <CardDescription>
            Importe dados localmente para análise antes de enviar para o banco de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="arquivo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="arquivo">Arquivo</TabsTrigger>
              <TabsTrigger value="texto">Colar Dados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="arquivo" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setArquivoSelecionado(file);
                      processarArquivo(file);
                    }
                  }}
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                />
                
                <div className="space-y-2">
                  <div className="flex justify-center gap-4">
                    <FileText className="h-12 w-12 text-blue-400" />
                    <FileSpreadsheet className="h-12 w-12 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Selecione um arquivo</p>
                    <p className="text-sm text-gray-500">CSV, XLS ou XLSX</p>
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
            </TabsContent>

            <TabsContent value="texto" className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Cole os dados do Excel/CSV aqui:
                </label>
                <Textarea
                  placeholder="Cole as linhas de dados aqui... (separadas por tab ou vírgula)"
                  value={textareaData}
                  onChange={(e) => setTextareaData(e.target.value)}
                  rows={6}
                />
                <Button
                  onClick={processarTextoColado}
                  disabled={!textareaData.trim()}
                  className="w-full"
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Processar Dados Colados
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dados Locais */}
      {dadosOriginais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dados Carregados Localmente</span>
              <Badge variant="secondary">{estatisticas.total} registros</Badge>
            </CardTitle>
            <CardDescription>
              Dados carregados e prontos para análise. Envie para o Supabase quando estiver satisfeito.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Controle de Aba */}
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium">Última importação:</span>
              <Select value={abaEscolhida} onValueChange={(value: '14H' | '18H' | 'AUTO') => setAbaEscolhida(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto</SelectItem>
                  <SelectItem value="14H">14H</SelectItem>
                  <SelectItem value="18H">18H</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estatísticas Detalhadas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-blue-700">Total</p>
                <p className="text-lg font-bold text-blue-900">{estatisticas.total}</p>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-green-700">14H</p>
                <p className="text-lg font-bold text-green-900">{estatisticas.dados14H}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-orange-700">18H</p>
                <p className="text-lg font-bold text-orange-900">{estatisticas.dados18H}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-purple-700">Produtos</p>
                <p className="text-lg font-bold text-purple-900">{estatisticas.produtosUnicos}</p>
              </div>
              <div className="bg-pink-50 p-3 rounded text-center">
                <p className="text-sm font-medium text-pink-700">Seções</p>
                <p className="text-lg font-bold text-pink-900">{estatisticas.secoesUnicas}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={enviarParaSupabase} 
                disabled={enviandoSupabase}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {enviandoSupabase ? 'Enviando...' : 'Enviar para Supabase'}
              </Button>
              
              <Button 
                onClick={limparDadosLocais} 
                variant="outline"
                disabled={enviandoSupabase}
              >
                Limpar Dados
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status da Importação */}
      {importStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importStatus.sucesso ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-500" />
              )}
              Status da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{importStatus.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{importStatus.processados}</div>
                <div className="text-sm text-gray-500">Processados</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{importStatus.erros}</div>
                <div className="text-sm text-gray-500">Erros</div>
              </div>
            </div>
            
            <Progress 
              value={(importStatus.processados + importStatus.erros) / importStatus.total * 100} 
              className="w-full" 
            />
            
            <Alert>
              <AlertDescription>{importStatus.mensagem}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
