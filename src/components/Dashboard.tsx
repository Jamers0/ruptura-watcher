import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  CheckCircle,
  Users,
  Clock,
  CalendarIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Rutura, DashboardStats } from '@/lib/types';
import { calculateDashboardStats, getStatusColor, normalizarSecao, formatDate } from '@/lib/utils-rutura';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardProps {
  ruturas: Rutura[];
}

// Cores para os gráficos
const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'];

interface ProdutoAfetado {
  produto: string;
  descricao: string;
  occorencias14H: number;
  ocorrencias18H: number;
  naoRepostos: number;
  secoesAfetadas: Set<string>;
}

interface ProdutoAfetadoProcessed extends Omit<ProdutoAfetado, 'secoesAfetadas'> {
  secoesAfetadas: number;
}

export function Dashboard({ ruturas }: DashboardProps) {
  const stats = calculateDashboardStats(ruturas);

  // Estados para filtros dos produtos mais afetados
  const [selectedSecao, setSelectedSecao] = useState<string>('all');
  const [selectedTipoProduto, setSelectedTipoProduto] = useState<string>('all');
  const [selectedMetrica, setSelectedMetrica] = useState<string>('quantity');
  const [selectedMonthYear, setSelectedMonthYear] = useState<Date | undefined>(undefined);

  // Calcular ruturas do dia atual para "Ruturas Ativas"
  const hoje = new Date().toISOString().split('T')[0];
  const ruturasHoje = ruturas.filter(r => r.data === hoje);

  // Formatação dos nomes das seções
  const formatSecaoName = (secao: string) => {
    const abbreviations: { [key: string]: string } = {
      'COZINHA FRIA': 'CF',
      'COZINHA QUENTE': 'CQ', 
      'COZINHA FRIA - EK': 'CF - EK',
      'COZINHA FRIA - KE': 'CF - KE',
      'COZINHA FRIA KOREIA': 'CF - KE',
      'COZINHA QUENTE - EK': 'CQ - EK', 
      'COZINHA QUENTE - KE': 'CQ - KE',
      'PASTELARIA': 'PAS',
      'REFEITORIO': 'REF',
      'REFEITÓRIO': 'REF',
      'REF. COZINHA QUENTE': 'REF',
      'REFEITÓRIO COZINHA QUENTE': 'REF',
      'REFEITÓRIO PASTELARIA': 'RPA',
      'RPA': 'RPA',
      'R.P.L. - REFEITÓRIO': 'RPL',
      'RPL': 'RPL',
      'TSU - DELTA': 'TSU - DL',
      'TSU - DL': 'TSU - DL',
      'TSU - KOREIA': 'TSU - KE',
      'TSU - KE': 'TSU - KE'
    };
    
    return abbreviations[secao] || secao.substring(0, 3).toUpperCase();
  };

  // Dados filtrados para produtos mais afetados
  const filteredData = useMemo(() => {
    let data = ruturas;
    
    // Filtro por mês/ano (mesmo que "Resolução por Semana")
    if (selectedMonthYear) {
      const mesAnoSelecionado = format(selectedMonthYear, 'MM/yyyy');
      data = data.filter(rutura => {
        if (!rutura.data) return false;
        
        let mesAnoRutura = '';
        if (rutura.data.includes('/')) {
          const partesData = rutura.data.split('/');
          if (partesData.length === 3) {
            mesAnoRutura = `${partesData[1].padStart(2, '0')}/${partesData[2]}`;
          }
        } else if (rutura.data.includes('-')) {
          const partesData = rutura.data.split('-');
          if (partesData.length === 3) {
            mesAnoRutura = `${partesData[1]}/${partesData[0]}`;
          }
        }
        
        return mesAnoRutura === mesAnoSelecionado;
      });
    }
    
    if (selectedSecao !== 'all') {
      data = data.filter(r => r.secao === selectedSecao);
    }
    
    if (selectedTipoProduto !== 'all') {
      data = data.filter(r => r.tipo_produto === selectedTipoProduto);
    }
    
    return data;
  }, [ruturas, selectedMonthYear, selectedSecao, selectedTipoProduto]);

  // Valores únicos para os filtros
  const uniqueSections = useMemo(() => 
    Array.from(new Set(ruturas.map(r => r.secao))).sort()
  , [ruturas]);

  const uniqueProductTypes = useMemo(() => 
    Array.from(new Set(
      ruturas
        .filter(r => selectedSecao === 'all' || r.secao === selectedSecao)
        .map(r => r.tipo_produto)
    )).sort()
  , [ruturas, selectedSecao]);

  // Produtos mais afetados com cálculo de métricas
  const produtosMaisAfetados = useMemo(() => {
    interface ProductMetrics {
      codigo: string;
      descricao: string;
      secao: string;
      tipo: string;
      quantity: number;
      value: number;
      occurrences: number;
      resolved: number;
      valorFalta: number;
      taxaResolucao?: number;
    }

    const productCounts = filteredData.reduce((acc, rutura) => {
      const key = rutura.numero_produto;
      if (!acc[key]) {
        acc[key] = {
          codigo: rutura.numero_produto,
          descricao: rutura.descricao,
          secao: rutura.secao,
          tipo: rutura.tipo_produto,
          quantity: 0,
          value: 0,
          occurrences: 0,
          resolved: 0,
          valorFalta: 0
        };
      }
      
      acc[key].quantity += rutura.qtd_falta;
      acc[key].occurrences += 1;
      acc[key].valorFalta += rutura.qtd_falta * (rutura.stock_ct || 0);
      
      if (rutura.qtd_falta === 0) {
        acc[key].resolved += 1;
      }
      
      return acc;
    }, {} as Record<string, ProductMetrics>);

    const sortField = selectedMetrica === 'value' ? 'valorFalta' : 
                      selectedMetrica === 'occurrences' ? 'occurrences' : 
                      selectedMetrica === 'resolved' ? 'resolved' : 'quantity';

    return Object.values(productCounts)
      .map((produto: ProductMetrics) => ({
        ...produto,
        taxaResolucao: produto.occurrences > 0 ? Math.round((produto.resolved / produto.occurrences) * 100) : 0
      }))
      .sort((a: ProductMetrics & { taxaResolucao: number }, b: ProductMetrics & { taxaResolucao: number }) => {
        const aValue = a[sortField as keyof ProductMetrics] as number;
        const bValue = b[sortField as keyof ProductMetrics] as number;
        return bValue - aValue;
      })
      .slice(0, 10);
  }, [filteredData, selectedMetrica]);
  const ruturasAtivasInfo = ruturasHoje.length === 0 ? 'Em Picking' : ruturasHoje.length.toString();

  // Contagem real de seções afetadas (baseada nas seções únicas nos dados)
  const secoesUnicas = new Set(ruturas.map(r => r.secao).filter(Boolean));
  const totalSecoesAfetadas = secoesUnicas.size;

  // Função para mapear tipos de produto
  const formatTipoProduto = (tipo: string): string => {
    const mappings: Record<string, string> = {
      'F&V, Pão & Iogurtes': 'Praça',
      'F&V,Pão&Iogurtes': 'Praça',
      'F&V, Pao & Iogurtes': 'Praça'
    };
    return mappings[tipo] || tipo;
  };

  // Função para abreviar nomes de meses
  const formatWeekMonth = (semanaOriginal: string): string => {
    const monthAbbreviations: Record<string, string> = {
      'Janeiro': 'Jan',
      'Fevereiro': 'Fev',
      'Março': 'Mar',
      'Abril': 'Abr',
      'Maio': 'Mai',
      'Junho': 'Jun',
      'Julho': 'Jul',
      'Agosto': 'Ago',
      'Setembro': 'Set',
      'Outubro': 'Out',
      'Novembro': 'Nov',
      'Dezembro': 'Dez'
    };

    // Extrair semana e mês do formato original
    const match = semanaOriginal.match(/(\d+ª)\s+Semana\s+de\s+(\w+)/i);
    if (match) {
      const [, weekNum, monthName] = match;
      const monthAbbr = monthAbbreviations[monthName] || monthName.slice(0, 3);
      return `${weekNum} Sem. ${monthAbbr}`;
    }
    return semanaOriginal;
  };

  // Evolução semanal das ruturas
  const evolucaoSemanal = ruturas.reduce((acc, rutura) => {
    const semana = `S${rutura.semana}`;
    if (!acc[semana]) {
      acc[semana] = {
        semana,
        ruturas14H: 0,
        ruturas18H: 0
      };
    }
    
    if (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H')) {
      acc[semana].ruturas14H += 1;
    }
    
    if (rutura.hora_rutura.includes('18h') || rutura.hora_rutura.includes('18H')) {
      acc[semana].ruturas18H += 1;
    }
    
    return acc;
  }, {} as Record<string, { semana: string; ruturas14H: number; ruturas18H: number }>);

  // Função para obter nome abreviado do mês
  const getMonthAbbr = (semanaStr: string) => {
    const monthMap: Record<string, string> = {
      'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar', 'Abril': 'Abr',
      'Maio': 'Mai', 'Junho': 'Jun', 'Julho': 'Jul', 'Agosto': 'Ago',
      'Setembro': 'Set', 'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
    };
    
    // Por enquanto, vamos usar apenas o número da semana
    // Implementação completa necessitaria mapear semanas para meses/datas
    return semanaStr.replace('S', '') + 'ª Sem. Abr'; // Exemplo: "15ª Sem. Abr"
  };

  const chartEvolucaoSemanal = Object.values(evolucaoSemanal)
    .sort((a, b) => parseInt(a.semana.replace('S', '')) - parseInt(b.semana.replace('S', '')))
    .slice(-8) // Últimas 8 semanas
    .map(item => ({
      ...item,
      nomeAbreviado: getMonthAbbr(item.semana)
    }));

  // Tipologias com mapeamento correto para tipos de produto
  const ruturasPerTipologia = ruturas.reduce((acc, rutura) => {
    const tipoFormatado = formatTipoProduto(rutura.tipo_produto);
    acc[tipoFormatado] = (acc[tipoFormatado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartTipologia = Object.entries(ruturasPerTipologia)
    .map(([name, value]) => {
      const total = ruturas.length;
      const percentage = ((value / total) * 100).toFixed(1);
      return { 
        name: name.length > 15 ? name.substring(0, 15) + '...' : name, 
        value, 
        fullName: name,
        percentage: `${percentage}%`
      };
    });

  // Seções com siglas para o gráfico de pizza
  const ruturasPerSecao = ruturas.reduce((acc, rutura) => {
    const secaoNormalizada = normalizarSecao(rutura.secao);
    acc[secaoNormalizada] = (acc[secaoNormalizada] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartSecoes = Object.entries(ruturasPerSecao)
    .map(([name, value]) => ({ 
      name: formatSecaoName(name), 
      value, 
      fullName: name 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Cálculo da Resolução por Semana com filtro de mês
  const ruturasFiltradasPorMes = useMemo(() => {
    if (!selectedMonthYear) return ruturas;
    
    const mesAnoSelecionado = format(selectedMonthYear, 'MM/yyyy');
    return ruturas.filter(rutura => {
      if (!rutura.data) return false;
      
      // Data pode estar em formato DD/MM/YYYY ou YYYY-MM-DD
      let mesAnoRutura = '';
      if (rutura.data.includes('/')) {
        const partesData = rutura.data.split('/');
        if (partesData.length === 3) {
          mesAnoRutura = `${partesData[1].padStart(2, '0')}/${partesData[2]}`;
        }
      } else if (rutura.data.includes('-')) {
        const partesData = rutura.data.split('-');
        if (partesData.length === 3) {
          mesAnoRutura = `${partesData[1]}/${partesData[0]}`;
        }
      }
      
      return mesAnoRutura === mesAnoSelecionado;
    });
  }, [ruturas, selectedMonthYear]);

  const resolucaoPorSemana = ruturasFiltradasPorMes.reduce((acc, rutura) => {
    const semana = `S${rutura.semana}`;
    if (!acc[semana]) {
      acc[semana] = {
        total14h: 0,
        resolvidas: 0,
        naoResolvidas: 0
      };
    }

    if (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H')) {
      acc[semana].total14h += 1;
      
      // Verificar se foi resolvida (não aparece em 18H)
      const existeEm18H = ruturasFiltradasPorMes.some(r18 => 
        r18.numero_produto === rutura.numero_produto &&
        r18.secao === rutura.secao &&
        r18.ot === rutura.ot &&
        r18.req === rutura.req &&
        r18.semana === rutura.semana &&
        (r18.hora_rutura.includes('18h') || r18.hora_rutura.includes('18H'))
      );
      
      if (existeEm18H) {
        acc[semana].naoResolvidas += 1;
      } else {
        acc[semana].resolvidas += 1;
      }
    }
    
    return acc;
  }, {} as Record<string, { total14h: number; resolvidas: number; naoResolvidas: number }>);

  // Função para formatar semana com nome do mês
  const formatarSemanaComMes = (numeroSemana: string) => {
    if (!selectedMonthYear) {
      return `${numeroSemana}ª Sem.`;
    }
    
    const nomesMesesAbrev = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    const mes = selectedMonthYear.getMonth();
    const nomesMes = nomesMesesAbrev[mes];
    
    return `${numeroSemana}ª Sem. ${nomesMes}`;
  };

  const chartResolucao = Object.entries(resolucaoPorSemana)
    .map(([semana, data]) => {
      const percentResolvido = data.total14h > 0 ? ((data.resolvidas / data.total14h) * 100) : 0;
      const percentNaoResolvido = data.total14h > 0 ? ((data.naoResolvidas / data.total14h) * 100) : 0;
      const numeroSemana = semana.replace('S', '');
      
      return {
        semana: formatarSemanaComMes(numeroSemana),
        semanaNumero: numeroSemana,
        resolvidas: data.resolvidas,
        naoResolvidas: data.naoResolvidas,
        total: data.total14h,
        percentResolvido: Math.round(percentResolvido),
        percentNaoResolvido: Math.round(percentNaoResolvido)
      };
    })
    .sort((a, b) => parseInt(a.semanaNumero) - parseInt(b.semanaNumero))
    // Se não houver filtro de mês, mostrar apenas as últimas 8 semanas para não sobrecarregar
    .slice(selectedMonthYear ? 0 : -8);

  // Análise correta dos produtos mais afetados com filtros
  const ruturas18H = ruturas.filter(r => r.hora_rutura.includes('18h') || r.hora_rutura.includes('18H'));
  
  // Função para normalizar seções para comparação
  const normalizarSecao = (secao: string): string => {
    return secao?.trim() || '';
  };
  
  // Função para formatar data
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Filtrar ruturas baseado nas seleções
  const ruturasFiltradas = ruturas.filter(rutura => {
    let match = true;
    
    if (selectedDate !== 'all') {
      match = match && rutura.data.includes(selectedDate);
    }
    
    if (selectedSecao !== 'all') {
      match = match && normalizarSecao(rutura.secao) === selectedSecao;
    }
    
    if (selectedTipoProduto !== 'all') {
      match = match && rutura.tipo_produto === selectedTipoProduto;
    }
    
    return match;
  });

  // Interface para produtos afetados
  interface ProdutoAfetado {
    produto: string;
    descricao: string;
    occorencias14H: number;
    ocorrencias18H: number;
    naoRepostos: number;
    secoesAfetadas: Set<string>;
    totalOcorrencias: number;
  }

  interface ProdutoAfetadoProcessed {
    produto: string;
    descricao: string;
    occorencias14H: number;
    ocorrencias18H: number;
    naoRepostos: number;
    secoesAfetadas: number;
    totalOcorrencias: number;
  }
  
  const produtosAfetados = ruturasFiltradas.reduce((acc, rutura) => {
    if (!acc[rutura.numero_produto]) {
      acc[rutura.numero_produto] = {
        produto: rutura.numero_produto,
        descricao: rutura.descricao,
        occorencias14H: 0,
        ocorrencias18H: 0,
        naoRepostos: 0,
        secoesAfetadas: new Set<string>(),
        totalOcorrencias: 0
      };
    }
    
    const item = acc[rutura.numero_produto];
    
    if (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H')) {
      item.occorencias14H += 1;
    }
    
    if (rutura.hora_rutura.includes('18h') || rutura.hora_rutura.includes('18H')) {
      item.ocorrencias18H += 1;
    }
    
    // Se aparece em 14H e 18H com mesmos dados, não foi reposto
    const matching18H = ruturas18H.find(r18 => 
      r18.numero_produto === rutura.numero_produto &&
      r18.secao === rutura.secao &&
      r18.ot === rutura.ot &&
      r18.req === rutura.req
    );
    
    if (matching18H && (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H'))) {
      item.naoRepostos += 1;
    }
    
    item.secoesAfetadas.add(normalizarSecao(rutura.secao));
    item.totalOcorrencias += 1;
    
    return acc;
  }, {} as Record<string, ProdutoAfetado & { totalOcorrencias: number }>);

  // Obter valores únicos para os filtros
  const datasDisponiveis = Array.from(new Set(ruturas.map(r => r.data))).sort().slice(-30);
  const secoesDisponiveis = Array.from(new Set(ruturas.map(r => normalizarSecao(r.secao))));
  const tiposProdutoDisponiveis = Array.from(new Set(ruturas.map(r => r.tipo_produto)));

  // Calcular métricas baseadas na seleção
  let topProdutos: (ProdutoAfetadoProcessed & { rank: number; metricaValor: number })[] = [];
  
  if (selectedMetrica === 'taxa_resolucao') {
    topProdutos = Object.values(produtosAfetados)
      .map((item) => ({
        ...item,
        secoesAfetadas: item.secoesAfetadas.size,
        metricaValor: item.occorencias14H > 0 ? ((item.occorencias14H - item.naoRepostos) / item.occorencias14H) * 100 : 0
      }))
      .sort((a, b) => b.metricaValor - a.metricaValor)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  } else {
    topProdutos = Object.values(produtosAfetados)
      .map((item) => ({
        ...item,
        secoesAfetadas: item.secoesAfetadas.size,
        metricaValor: item.totalOcorrencias
      }))
      .sort((a, b) => b.metricaValor - a.metricaValor)
      .slice(0, 10)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }

  const recentRuturas = ruturas
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 10);
  
  // Dados de evolução dos últimos 7 dias
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const evolutionData = last7Days.map((date) => {
    const dayRuturas = ruturas.filter(r => r.data === date);
    const dayName = new Date(date).toLocaleDateString('pt-BR', { 
      weekday: 'short' 
    }).replace('.', '');
    
    return {
      day: dayName,
      ruturas: dayRuturas.length,
      fullDate: new Date(date).toLocaleDateString('pt-BR')
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard de Ruturas
        </h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema de gestão de ruturas em tempo real
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ruturas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{stats.totalRuturas}</div>
            <p className="text-xs text-muted-foreground">Total registrado</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruturas Ativas</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-warning">{ruturasAtivasInfo}</div>
            <p className="text-xs text-muted-foreground">
              {ruturasHoje.length === 0 ? 'Aguardando ruturas do dia' : 'Registradas hoje'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-success">{stats.taxaResolucao}%</div>
            <p className="text-xs text-muted-foreground">Ruturas resolvidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">
              {ruturas.filter(r => (r.qtd_falta || 0) > 0).reduce((acc, r) => {
                if (!acc.includes(r.numero_produto)) {
                  acc.push(r.numero_produto);
                }
                return acc;
              }, [] as string[]).length}
            </div>
            <p className="text-xs text-muted-foreground">Com falta em estoque</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-info">2.4h</div>
            <p className="text-xs text-muted-foreground">Tempo de resolução</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Falta</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-warning">
              {Math.round(ruturas.reduce((total, r) => total + (r.qtd_falta * 2.5), 0))}€
            </div>
            <p className="text-xs text-muted-foreground">Estimativa de perdas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução dos Últimos 7 Dias */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Evolução - 7 Dias</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Tendência das ruturas por dia</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  fontSize={12} 
                  tick={{ fill: '#666' }}
                />
                <YAxis fontSize={12} tick={{ fill: '#666' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value, name, props) => [
                    `${value} ruturas`,
                    props.payload.fullDate
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="ruturas" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Seções Mais Afetadas */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Seções Mais Afetadas</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ranking de Seções com maior quantidade de Ruturas</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartSecoes}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartSecoes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    formatter={(value, name, props) => [
                      `${value} ruturas`,
                      props.payload.fullName
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda customizada com siglas */}
              <div className="space-y-2 min-w-0 lg:max-w-xs">
                {chartSecoes.map((entry, index) => {
                  const colorClass = [
                    'bg-blue-500', 'bg-red-500', 'bg-amber-500', 'bg-green-500', 
                    'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500'
                  ][index % 8];
                  
                  return (
                    <div key={entry.name} className="flex items-center space-x-2 text-sm">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.value} ruturas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evolução Semanal das Ruturas */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Evolução Semanal das Ruturas</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Ruturas 14H e 18H por semana</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartEvolucaoSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="nomeAbreviado" 
                  fontSize={12} 
                  tick={{ fill: '#666' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis fontSize={12} tick={{ fill: '#666' }} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value, name) => [
                    `${value} ruturas`,
                    name === 'ruturas14H' ? 'Ruturas 14H' : 'Ruturas 18H'
                  ]}
                />
                <Bar 
                  dataKey="ruturas14H" 
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                  name="Ruturas 14H"
                />
                <Bar 
                  dataKey="ruturas18H" 
                  fill="#ef4444"
                  radius={[2, 2, 0, 0]}
                  name="Ruturas 18H"
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Legenda */}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Ruturas 14H</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Ruturas 18H</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolução por Semana */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Resolução por Semana</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">Taxa de Resolução Semanal</p>
              </div>
              
              {/* Filtro de Mês */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="text-xs">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMonthYear ? format(selectedMonthYear, 'MMMM yyyy', { locale: ptBR }) : 'Todos os meses'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedMonthYear(undefined)}
                      className="w-full text-xs"
                    >
                      Todos os meses
                    </Button>
                    <Calendar
                      mode="single"
                      selected={selectedMonthYear}
                      onSelect={setSelectedMonthYear}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      locale={ptBR}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartResolucao} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="semana" 
                  fontSize={12} 
                  tick={{ fill: '#666' }}
                />
                <YAxis 
                  fontSize={12} 
                  tick={{ fill: '#666' }}
                  domain={[0, 'dataMax + 5']}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value, name, props) => {
                    const data = props.payload;
                    const percentualResolucao = data.total > 0 ? ((data.resolvidas / data.total) * 100).toFixed(1) : 0;
                    return [
                      <div key="tooltip" className="space-y-1">
                        <div className="font-medium text-sm">{data.semana}</div>
                        <div className="text-green-700 font-bold">{data.resolvidas} (Taxa de Resolução é de {percentualResolucao}%)</div>
                      </div>
                    ];
                  }}
                  labelFormatter={() => ''}
                />
                <Bar 
                  dataKey="resolvidas" 
                  stackId="resolucao"
                  fill="#10b981"
                  radius={[0, 0, 0, 0]}
                  name="Resolvidas"
                />
                <Bar 
                  dataKey="naoResolvidas" 
                  stackId="resolucao"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Não Resolvidas"
                />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Legenda personalizada */}
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Resolvidas (14h → sem 18h)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Não Resolvidas (14h → 18h)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos mais afetados */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Produtos Mais Afetados</CardTitle>
            <p className="text-sm text-muted-foreground">Top 10 produtos com filtros personalizados</p>
            
            {/* Filtros de Seleção */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  {datasDisponiveis.map(data => (
                    <SelectItem key={data} value={data}>
                      {formatDate(data)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedSecao} onValueChange={setSelectedSecao}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Seção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as seções</SelectItem>
                  {secoesDisponiveis.map(secao => (
                    <SelectItem key={secao} value={secao}>
                      {formatSecaoName(secao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTipoProduto} onValueChange={setSelectedTipoProduto}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Tipo Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {tiposProdutoDisponiveis.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMetrica} onValueChange={setSelectedMetrica}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Métrica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxa_resolucao">Taxa de Resolução</SelectItem>
                  <SelectItem value="total_ocorrencias">Total de Ocorrências</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProdutos.length > 0 ? topProdutos.map((produto) => (
                <div key={produto.produto} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-xs flex items-center justify-center font-bold">
                        #{produto.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{produto.produto}</p>
                        <p className="text-xs text-muted-foreground truncate">{produto.descricao}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-sm space-y-1">
                      {selectedMetrica === 'taxa_resolucao' ? (
                        <>
                          <div className="font-bold text-success">{produto.metricaValor.toFixed(1)}% Resolução</div>
                          <div className="text-xs text-muted-foreground">
                            {produto.occorencias14H} (14H) → {produto.naoRepostos} não resolvidas
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-bold text-destructive">{produto.metricaValor} Total</div>
                          <div className="text-xs text-muted-foreground">
                            {produto.occorencias14H} (14H), {produto.naoRepostos} não repostos
                          </div>
                        </>
                      )}
                      <div className="text-xs text-info">{produto.secoesAfetadas} seções</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum produto encontrado com os filtros selecionados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ruturas Recentes */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Ruturas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRuturas.map((rutura) => (
                <div key={rutura.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rutura.secao}</p>
                    <p className="text-xs text-muted-foreground">{rutura.numero_produto} • {rutura.data}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md border">
                      {rutura.tipologia_rutura}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Falta: {rutura.qtd_falta} {rutura.un_med}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Produtos Mais Afetados com Filtros Avançados */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Produtos Mais Afetados</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedMonthYear ? format(selectedMonthYear, 'MMMM yyyy', { locale: ptBR }) : "Todos os meses"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-3 space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedMonthYear(undefined)}
                      className="w-full text-xs"
                    >
                      Todos os meses
                    </Button>
                    <Calendar
                      mode="single"
                      selected={selectedMonthYear}
                      onSelect={setSelectedMonthYear}
                      captionLayout="dropdown"
                      fromYear={2020}
                      toYear={2030}
                      locale={ptBR}
                      initialFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={selectedSecao} onValueChange={setSelectedSecao}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Seção" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueSections.map(section => (
                    <SelectItem key={section} value={section}>
                      {formatSecaoName(section)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTipoProduto} onValueChange={setSelectedTipoProduto}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueProductTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.substring(0, 10)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMetrica} onValueChange={setSelectedMetrica}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantity">Quantidade</SelectItem>
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="occurrences">Ocorrências</SelectItem>
                  <SelectItem value="resolved">Resolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produtosMaisAfetados.map((produto, index) => (
                <div key={produto.codigo} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <div>
                      <p className="text-sm font-medium">{produto.codigo}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.descricao.substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {selectedMetrica === 'value' ? `€${produto.valorFalta.toFixed(2)}` :
                       selectedMetrica === 'occurrences' ? `${produto.occurrences}x` :
                       selectedMetrica === 'resolved' ? `${produto.resolved} resolvidas` :
                       `${produto.quantity} un`}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatSecaoName(produto.secao)}</p>
                    {selectedMetrica === 'quantity' && (
                      <p className="text-xs text-green-600">
                        {produto.taxaResolucao}% resolução
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
