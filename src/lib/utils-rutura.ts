import { format, getWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Rutura, DashboardStats } from './types';

export function calculateWeekOfMonth(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const monthName = format(dateObj, 'MMMM', { locale: ptBR });
    const monthStart = startOfMonth(dateObj);
    const week = Math.ceil((dateObj.getDate() + monthStart.getDay()) / 7);
    
    const weekNames = ['1ª', '2ª', '3ª', '4ª', '5ª'];
    const weekName = weekNames[week - 1] || `${week}ª`;
    
    return `${weekName} Semana de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
  } catch (error) {
    console.error('Erro ao calcular semana do mês:', error);
    return 'Semana inválida';
  }
}

export function formatDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

export function parseExcelDate(excelDate: string | number): string {
  try {
    if (typeof excelDate === 'number') {
      // Excel serial date
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return format(date, 'yyyy-MM-dd');
    }
    
    if (typeof excelDate === 'string') {
      // Tenta diferentes formatos
      const formats = [
        /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY ou MM/DD/YYYY
        /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      ];
      
      if (formats[0].test(excelDate)) {
        const [part1, part2, year] = excelDate.split('/');
        // Assume DD/MM/YYYY se day > 12
        if (parseInt(part1) > 12) {
          return `${year}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        } else {
          // Assume MM/DD/YYYY
          return `${year}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
        }
      }
      
      if (formats[1].test(excelDate)) {
        return excelDate;
      }
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Erro ao converter data do Excel:', error);
    return new Date().toISOString().split('T')[0];
  }
}

export function calculateDashboardStats(ruturas: Rutura[]): DashboardStats {
  const ruturasAtivas = ruturas.filter(r => r.qtd_falta > 0);
  const valorTotal = ruturas.reduce((sum, r) => sum + (r.qtd_falta * 10), 0); // Valor estimado
  const ruturasResolVidas = ruturas.filter(r => r.qtd_falta === 0);
  const taxaResolucao = ruturas.length > 0 ? (ruturasResolVidas.length / ruturas.length) * 100 : 0;
  const secoes = new Set(ruturas.map(r => r.secao));
  const hoje = new Date().toISOString().split('T')[0];
  const ruturasHoje = ruturas.filter(r => r.data === hoje);

  return {
    totalRuturas: ruturas.length,
    ruturasAtivas: ruturasAtivas.length,
    valorTotal,
    taxaResolucao: Math.round(taxaResolucao),
    secoesAfetadas: secoes.size,
    ruturasHoje: ruturasHoje.length,
  };
}

export function getStatusColor(tipologia: string): string {
  const statusColors: Record<string, string> = {
    "Sem Stock Físico e BC": "destructive",
    "Acerto de Inventário": "warning",
    "A pedir à FF": "info",
    "Em Transferência da FF": "primary",
    "Stock Insuficiente": "warning",
    "Produto Descontinuado": "destructive",
  };
  
  return statusColors[tipologia] || "muted";
}

export function validateRuturaData(rutura: Partial<Rutura>): string[] {
  const errors: string[] = [];
  
  if (!rutura.secao) errors.push('Seção é obrigatória');
  if (!rutura.req) errors.push('Número de requisição é obrigatório');
  if (!rutura.ot) errors.push('Número OT é obrigatório');
  if (!rutura.numero_produto) errors.push('Número do produto é obrigatório');
  if (!rutura.descricao) errors.push('Descrição é obrigatória');
  if (!rutura.data) errors.push('Data é obrigatória');
  if (rutura.qtd_req === undefined || rutura.qtd_req <= 0) errors.push('Quantidade requisitada deve ser maior que 0');
  if (rutura.qtd_falta === undefined || rutura.qtd_falta < 0) errors.push('Quantidade em falta não pode ser negativa');
  
  return errors;
}

export function exportToCSV(ruturas: Rutura[], filename: string = 'ruturas-export.csv'): void {
  const headers = [
    'Semana', 'Hora Rutura', 'Hora da Rutura', 'Seção', 'Tipo Requisição',
    'OT', 'REQ', 'Tipo Produto', 'Nº Produto', 'Descrição',
    'Qtd. Req.', 'Qtd. Env.', 'Qtd. Falta', 'Un. Med', 'Data',
    'Stock CT', 'Stock FF', 'Em Trânsito FF', 'Tipologia Rutura'
  ];
  
  const csvContent = [
    headers.join(','),
    ...ruturas.map(r => [
      r.semana, r.hora_rutura, r.hora_da_rutura, r.secao, r.tipo_requisicao,
      r.ot, r.req, r.tipo_produto, r.numero_produto, r.descricao,
      r.qtd_req, r.qtd_env, r.qtd_falta, r.un_med, formatDate(r.data),
      r.stock_ct, r.stock_ff, r.em_transito_ff, r.tipologia_rutura
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}