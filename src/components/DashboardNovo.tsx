import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Clock,
  Users,
  Activity,
  Target
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Rutura } from '@/lib/types';
import { calcularAnalytics } from '@/lib/processamento-dados';
import { useData } from '@/contexts/DataContext';
import { YearMonthSelector } from '@/components/ui/year-month-selector';

interface DashboardProps {
  ruturas?: Rutura[]; // Tornar opcional já que usaremos o context
}

interface ProdutoStats {
  numero_produto: string;
  descricao: string;
  total_ruturas: number;
  ruturas_14h: number;
  ruturas_18h: number;
  taxa_resolucao: number;
}

const CORES_GRAFICOS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
];

// Mapeamento de seções para siglas
const SIGLAS_SECOES: Record<string, string> = {
  'Cozinha Fria': 'CF',
  'Cozinha Quente': 'CQ',
  'COZINHA FRIA': 'CF',
  'COZINHA QUENTE': 'CQ',
  'Cozinha Fria - EK': 'CF-EK',
  'Cozinha Fria - KE': 'CF-KE',
  'Cozinha Quente - EK': 'CQ-EK',
  'Cozinha Quente - KE': 'CQ-KE',
  'COZINHA FRIA - EK': 'CF-EK',
  'COZINHA FRIA - KE': 'CF-KE', 
  'COZINHA QUENTE - EK': 'CQ-EK',
  'COZINHA QUENTE - KE': 'CQ-KE',
  'Pastelaria': 'PAS',
  'PASTELARIA': 'PAS',
  'Refeitorio': 'REF',
  'REFEITORIO': 'REF',
  'TSU': 'TSU',
  'TSU - AC': 'TSU-AC'
};

// Função para obter sigla da seção
const obterSiglaSecao = (secao: string): string => {
  // Primeiro, tentar encontrar no mapeamento direto
  if (SIGLAS_SECOES[secao]) {
    return SIGLAS_SECOES[secao];
  }
  
  // Tentativas com normalização de case
  const secaoUpper = secao.toUpperCase();
  if (SIGLAS_SECOES[secaoUpper]) {
    return SIGLAS_SECOES[secaoUpper];
  }
  
  // Lógica específica para cozinhas
  if (secao.toLowerCase().includes('cozinha')) {
    if (secao.toLowerCase().includes('fria')) {
      if (secao.includes('EK') || secao.includes('ek')) return 'CF-EK';
      if (secao.includes('KE') || secao.includes('ke')) return 'CF-KE';
      return 'CF';
    }
    if (secao.toLowerCase().includes('quente')) {
      if (secao.includes('EK') || secao.includes('ek')) return 'CQ-EK';
      if (secao.includes('KE') || secao.includes('ke')) return 'CQ-KE';
      return 'CQ';
    }
    // Se tem "cozinha" mas não especifica qual, assume genérico
    return 'CQ';
  }
  
  // Fallback para outras seções
  return secao.substring(0, 3).toUpperCase();
};

// Função para mapear departamentos/tipos de produto
const formatarTipoProduto = (tipoProduto: string): string => {
  if (tipoProduto === 'F&V, Pão & Iogurtes') {
    return 'Praça';
  }
  return tipoProduto;
};

export function Dashboard({ ruturas: ruturasProp }: DashboardProps = {}) {
  const { ruturas: ruturasContext, estatisticas } = useData();
  const ruturas = ruturasProp || ruturasContext;
  
  // Estados para filtros dos produtos mais afetados - agora usando string YYYY-MM
  const [selectedDateProduct, setSelectedDateProduct] = useState<string>('');
  const [selectedSecao, setSelectedSecao] = useState<string>('all');
  const [selectedTipoProduto, setSelectedTipoProduto] = useState<string>('all');
  const [tipoAnalise, setTipoAnalise] = useState<string>('frequencia'); // frequencia ou taxa_resolucao
  
  // Estado para filtro de mês da seção Resolução por Semana - agora usando string YYYY-MM
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');
  
  const analytics = useMemo(() => calcularAnalytics(ruturas), [ruturas]);

  // Calcular ruturas ativas do dia atual
  const dataHoje = format(new Date(), 'yyyy-MM-dd');
  const ruturasHoje = ruturas.filter(r => r.data === dataHoje);
  const ruturasAtivasHoje = ruturasHoje.length;
  
  // Função para abreviar nomes de semanas
  const abreviarSemana = (semana: string): string => {
    return semana
      .replace('Semana de ', 'Sem. ')
      .replace('janeiro', 'Jan.')
      .replace('fevereiro', 'Fev.')
      .replace('março', 'Mar.')
      .replace('abril', 'Abr.')
      .replace('maio', 'Mai.')
      .replace('junho', 'Jun.')
      .replace('julho', 'Jul.')
      .replace('agosto', 'Ago.')
      .replace('setembro', 'Set.')
      .replace('outubro', 'Out.')
      .replace('novembro', 'Nov.')
      .replace('dezembro', 'Dez.');
  };

  // Se não há ruturas, mostrar tela de orientação
  if (!ruturas || ruturas.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-blue-100 p-6">
              <BarChart className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard de Análise de Ruturas
          </h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Importe seus dados para começar a visualizar análises detalhadas 
            sobre ruturas de estoque.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg max-w-lg mx-auto">
            <p className="text-sm text-blue-800 font-medium">
              💡 Para começar:
            </p>
            <ul className="text-sm text-blue-700 mt-2 text-left space-y-1">
              <li>• Acesse "Importar Dados" no menu</li>
              <li>• Faça upload de um arquivo Excel ou CSV</li>
              <li>• Visualize o preview dos dados</li>
              <li>• Confirme a importação</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Preparar dados para gráficos com siglas
  const dadosSecoesChart = analytics.topSecoes.slice(0, 8).map(item => ({
    name: obterSiglaSecao(item.secao),
    fullName: item.secao,
    valor: item.quantidade,
    percentual: (item.quantidade / analytics.totalRuturas) * 100
  }));

  const dadosTipologiaChart = Object.entries(analytics.ruturasPorTipo).slice(0, 6).map(([tipo, count]) => ({
    name: formatarTipoProduto(tipo), // Nome formatado para exibição
    fullName: formatarTipoProduto(tipo), // Nome completo para o tooltip
    value: count,
    percentual: (count / analytics.totalRuturas) * 100
  }));

  // Calcular evolução semanal com resolução correta
  const dadosEvolucaoSemanal = Object.entries(analytics.ruturasPorSemana).map(([semana, total]) => {
    const ruturas14h = ruturas.filter(r => r.semana === semana && r.aba_origem === '14H').length;
    const ruturas18h = ruturas.filter(r => r.semana === semana && r.aba_origem === '18H').length;
    const resolvidas = Math.max(0, ruturas14h - ruturas18h);
    const taxaResolucaoSemana = ruturas14h > 0 ? (resolvidas / ruturas14h) * 100 : 0;
    
    return {
      semana: abreviarSemana(semana),
      fullName: semana,
      ruturas14h,
      ruturas18h,
      resolvidas,
      total: ruturas14h,
      taxaResolucao: taxaResolucaoSemana
    };
  });

  // Calcular taxa de resolução real baseada em 14h vs 18h
  const totalRuturas14h = ruturas.filter(r => r.aba_origem === '14H').length;
  const totalRuturas18h = ruturas.filter(r => r.aba_origem === '18H').length;
  const taxaResolucao = totalRuturas14h > 0 ? ((totalRuturas14h - totalRuturas18h) / totalRuturas14h) * 100 : 0;

// Função para mapear cores para classes Tailwind

  return (
    <div className="space-y-6">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ruturas</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalRuturas}</div>
            <p className="text-xs text-muted-foreground">
              Todas as ruturas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruturas Ativas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {ruturasAtivasHoje > 0 ? ruturasAtivasHoje : 'Em Picking'}
            </div>
            <p className="text-xs text-muted-foreground">
              {ruturasAtivasHoje > 0 ? `Ruturas de ${format(new Date(), 'dd/MM/yyyy')}` : 'Aguardando dados do dia'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {taxaResolucao.toFixed(1)}%
            </div>
            <Progress value={Math.max(0, taxaResolucao)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Críticos</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {ruturas.filter(r => r.qtd_falta > 0 && r.stock_ct === 0 && r.stock_ff === 0).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Sem stock CT e FF
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seções Mais Afetadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Seções Mais Afetadas
            </CardTitle>
            <CardDescription>
              Ranking de Seções com maior quantidade de Ruturas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosSecoesChart} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={0}
                    textAnchor="middle"
                    height={60}
                    fontSize={12}
                    fontWeight="bold"
                  />
                  <YAxis 
                    fontSize={11}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                            <p className="font-semibold text-gray-800 mb-2">{data.fullName}</p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Sigla:</span> {data.name}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Ruturas:</span> {data.valor}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Percentual:</span> {data.percentual.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="valor" 
                    fill="#0088FE" 
                    radius={[6, 6, 0, 0]}
                    stroke="#0066CC"
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tipologias de Rutura */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tipologias de Rutura
            </CardTitle>
            <CardDescription>
              Distribuição dos tipos de ruturas por seção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosTipologiaChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={80}
                    innerRadius={35}
                    paddingAngle={5}
                    startAngle={0}
                    endAngle={360}
                  >
                    {dadosTipologiaChart.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CORES_GRAFICOS[index % CORES_GRAFICOS.length]}
                        stroke="#ffffff"
                        strokeWidth={3}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                            <p className="font-semibold text-gray-800 mb-2">{data.fullName}</p>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Ruturas:</span> {data.value}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Percentual:</span> {data.percentual.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={100}
                    iconType="circle"
                    wrapperStyle={{ 
                      paddingTop: '25px', 
                      fontSize: '12px',
                      fontWeight: '500',
                      lineHeight: '1.2'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Semanal */}
      {dadosEvolucaoSemanal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Semanal das Ruturas
            </CardTitle>
            <CardDescription>
              Comparação entre Ruturas 14H e Ruturas 18H com indicadores de resolução
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosEvolucaoSemanal} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <defs>
                    <linearGradient id="colorRuturas14h" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0088FE" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#0088FE" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorRuturas18h" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="semana" 
                    angle={-30}
                    textAnchor="end"
                    height={80}
                    fontSize={11}
                    fontWeight="500"
                  />
                  <YAxis 
                    fontSize={11}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const resolvidas = Math.max(0, data.ruturas14h - data.ruturas18h);
                        const taxaResolucao = data.ruturas14h > 0 ? (resolvidas / data.ruturas14h) * 100 : 0;
                        
                        return (
                          <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                            <p className="font-semibold text-gray-800 mb-3">{data.fullName}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-blue-600 flex items-center">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                  Ruturas 14H:
                                </span>
                                <span className="font-bold text-blue-600">{data.ruturas14h}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-red-600 flex items-center">
                                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                  Ruturas 18H:
                                </span>
                                <span className="font-bold text-red-600">{data.ruturas18h}</span>
                              </div>
                              <div className="border-t pt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-600 font-medium">Resolvidas:</span>
                                  <span className="font-bold text-green-600">{resolvidas}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-green-600 font-medium">Taxa Resolução:</span>
                                  <span className="font-bold text-green-600">{taxaResolucao.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={40}
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px', fontSize: '13px', fontWeight: '500' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ruturas14h"
                    stackId="1"
                    stroke="#0088FE"
                    strokeWidth={3}
                    fill="url(#colorRuturas14h)"
                    name="Ruturas 14H"
                    dot={{ fill: '#0088FE', strokeWidth: 2, r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ruturas18h"
                    stackId="2"
                    stroke="#FF6B6B"
                    strokeWidth={3}
                    fill="url(#colorRuturas18h)"
                    name="Ruturas 18H"
                    dot={{ fill: '#FF6B6B', strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Produtos Mais Afetados com Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Mais Afetados
          </CardTitle>
          <CardDescription>
            Análise personalizada de produtos com ruturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleção 1 - Mês</label>
              <YearMonthSelector
                value={selectedDateProduct}
                onChange={setSelectedDateProduct}
                placeholder="Todos os meses"
                allowEmpty={true}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seleção 2 - Seção</label>
              <Select value={selectedSecao} onValueChange={setSelectedSecao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as seções" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as seções</SelectItem>
                  {[...new Set(ruturas.map(r => r.secao))].filter(secao => secao && secao.trim()).map(secao => (
                    <SelectItem key={secao} value={secao}>{secao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seleção 3 - Tipo Produto</label>
              <Select value={selectedTipoProduto} onValueChange={setSelectedTipoProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {[...new Set(ruturas.map(r => r.tipo_produto))].filter(tipo => tipo && tipo.trim()).map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seleção 4 - Análise</label>
              <Select value={tipoAnalise} onValueChange={setTipoAnalise}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frequencia">Frequência de Ruturas</SelectItem>
                  <SelectItem value="taxa_resolucao">Taxa de Resolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resultados */}
          <div className="space-y-4">
            {(() => {
              // Filtrar dados baseado nas seleções
              let dadosFiltrados = ruturas;
              
              if (selectedDateProduct) {
                // selectedDateProduct agora está no formato 'YYYY-MM'
                const [anoSelecionado, mesSelecionado] = selectedDateProduct.split('-');
                dadosFiltrados = dadosFiltrados.filter(rutura => {
                  if (!rutura.data) return false;
                  
                  let mesAnoRutura = '';
                  if (rutura.data.includes('/')) {
                    const partesData = rutura.data.split('/');
                    if (partesData.length === 3) {
                      // Formato DD/MM/YYYY
                      mesAnoRutura = `${partesData[2]}-${partesData[1].padStart(2, '0')}`;
                    }
                  } else if (rutura.data.includes('-')) {
                    const partesData = rutura.data.split('-');
                    if (partesData.length === 3) {
                      // Formato YYYY-MM-DD
                      mesAnoRutura = `${partesData[0]}-${partesData[1]}`;
                    }
                  }
                  
                  return mesAnoRutura === selectedDateProduct;
                });
              }
              
              if (selectedSecao && selectedSecao !== 'all') {
                dadosFiltrados = dadosFiltrados.filter(r => r.secao === selectedSecao);
              }
              
              if (selectedTipoProduto && selectedTipoProduto !== 'all') {
                dadosFiltrados = dadosFiltrados.filter(r => r.tipo_produto === selectedTipoProduto);
              }

              // Calcular estatísticas por produto
              const produtosStats = dadosFiltrados.reduce((acc, rutura) => {
                const key = rutura.numero_produto;
                if (!acc[key]) {
                  acc[key] = {
                    numero_produto: rutura.numero_produto,
                    descricao: rutura.descricao,
                    total_ruturas: 0,
                    ruturas_14h: 0,
                    ruturas_18h: 0,
                    taxa_resolucao: 0
                  };
                }
                
                acc[key].total_ruturas += 1;
                if (rutura.aba_origem === '14H') {
                  acc[key].ruturas_14h += 1;
                } else if (rutura.aba_origem === '18H') {
                  acc[key].ruturas_18h += 1;
                }
                
                return acc;
              }, {} as Record<string, ProdutoStats>);

              // Calcular taxa de resolução
              Object.values(produtosStats).forEach((produto: ProdutoStats) => {
                if (produto.ruturas_14h > 0) {
                  const resolvidas = Math.max(0, produto.ruturas_14h - produto.ruturas_18h);
                  produto.taxa_resolucao = (resolvidas / produto.ruturas_14h) * 100;
                }
              });

              // Ordenar por critério selecionado
              const produtosOrdenados = Object.values(produtosStats)
                .sort((a: ProdutoStats, b: ProdutoStats) => {
                  if (tipoAnalise === 'taxa_resolucao') {
                    return b.taxa_resolucao - a.taxa_resolucao;
                  }
                  return b.total_ruturas - a.total_ruturas;
                })
                .slice(0, 10);

              if (produtosOrdenados.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum produto encontrado com os filtros selecionados
                  </div>
                );
              }

              return produtosOrdenados.map((produto: ProdutoStats, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div className="font-medium text-sm">#{produto.numero_produto}</div>
                    <div className="md:col-span-2 text-sm">{produto.descricao}</div>
                    <div className="text-center">
                      <div className="font-bold text-lg text-blue-600">
                        {tipoAnalise === 'frequencia' ? produto.total_ruturas : `${produto.taxa_resolucao.toFixed(1)}%`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tipoAnalise === 'frequencia' ? 'Ruturas' : 'Resolução'}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      14H: {produto.ruturas_14h} | 18H: {produto.ruturas_18h}
                    </div>
                    <div className="text-center">
                      <Badge className={
                        index === 0 ? "bg-red-500" : 
                        index === 1 ? "bg-orange-500" : 
                        index === 2 ? "bg-yellow-500" :
                        "bg-gray-400"
                      }>
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Resumo por Horário */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Resolução por Semana
                </CardTitle>
                <CardDescription>
                  Taxa de Resolução Semanal
                </CardDescription>
              </div>
              <YearMonthSelector
                value={selectedMonthYear}
                onChange={setSelectedMonthYear}
                placeholder="Todos os meses"
                allowEmpty={true}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Filtrar dados por mês se selecionado
                let dadosFiltrados = dadosEvolucaoSemanal;
                if (selectedMonthYear) {
                  // selectedMonthYear agora está no formato 'YYYY-MM'
                  const [ano, mes] = selectedMonthYear.split('-');
                  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                              'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                  const nomeDoMes = meses[parseInt(mes) - 1];
                  
                  dadosFiltrados = dadosEvolucaoSemanal.filter(semana => {
                    // Filtrar por semanas que contêm o mês selecionado
                    return semana.fullName.toLowerCase().includes(nomeDoMes.toLowerCase()) &&
                           semana.fullName.includes(ano);
                  });
                }
                
                // Se não há dados após filtro, mostrar mensagem
                if (dadosFiltrados.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Nenhuma semana encontrada para o mês selecionado.</p>
                      <p className="text-sm">Selecione outro mês ou limpe o filtro.</p>
                    </div>
                  );
                }
                
                return dadosFiltrados.map((semana, index) => {
                  const resolvidas = Math.max(0, semana.ruturas14h - semana.ruturas18h);
                  const taxaResolucao = semana.ruturas14h > 0 ? (resolvidas / semana.ruturas14h) * 100 : 0;
                  
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{semana.semana}</span>
                        <span className="text-sm text-green-600 font-bold">
                          {resolvidas} (Taxa de Resolução é de {taxaResolucao.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-blue-600">Ruturas 14H</span>
                            <span className="text-xs text-blue-600">{semana.ruturas14h}</span>
                          </div>
                          <Progress 
                            value={semana.ruturas14h + semana.ruturas18h > 0 ? (semana.ruturas14h / (semana.ruturas14h + semana.ruturas18h)) * 100 : 0}
                            className="h-2 bg-blue-200"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-red-600">Ruturas 18H</span>
                            <span className="text-xs text-red-600">{semana.ruturas18h}</span>
                          </div>
                          <Progress 
                            value={semana.ruturas14h + semana.ruturas18h > 0 ? (semana.ruturas18h / (semana.ruturas14h + semana.ruturas18h)) * 100 : 0}
                            className="h-2 bg-red-200"
                          />
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-4 w-4" />
              Indicadores de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Taxa de Resolução Geral</span>
                  <span className="text-sm font-bold">{taxaResolucao.toFixed(1)}%</span>
                </div>
                <Progress value={Math.max(0, taxaResolucao)} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ruturas com Stock CT</span>
                  <span className="text-sm font-bold">
                    {ruturas.filter(r => r.stock_ct > 0).length}
                  </span>
                </div>
                <Progress 
                  value={ruturas.length > 0 ? (ruturas.filter(r => r.stock_ct > 0).length / ruturas.length) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ruturas com Stock FF</span>
                  <span className="text-sm font-bold">
                    {ruturas.filter(r => r.stock_ff > 0).length}
                  </span>
                </div>
                <Progress 
                  value={ruturas.length > 0 ? (ruturas.filter(r => r.stock_ff > 0).length / ruturas.length) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
