import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  CheckCircle,
  Users,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Rutura, DashboardStats } from '@/lib/types';
import { calculateDashboardStats, getStatusColor, normalizarSecao } from '@/lib/utils-rutura';

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

  // Calcular ruturas do dia atual
  const hoje = new Date().toISOString().split('T')[0];
  const ruturasHoje = ruturas.filter(r => r.data === hoje);
  const isEmPicking = ruturasHoje.length === 0;

  // Função para abreviar nomes de seções
  const formatSecaoName = (secao: string): string => {
    const abbreviations: Record<string, string> = {
      'Carnes Frias': 'CF',
      'Charcutaria': 'CQ',
      'Peixaria': 'PX',
      'Pastelaria': 'PAS',
      'Refeitório': 'REF',
      'Talho': 'TH',
      'Mercearia': 'MC',
      'Frutas': 'FR',
      'Congelados': 'CG',
      'Lacticínios': 'LC'
    };
    return abbreviations[secao] || secao.slice(0, 3).toUpperCase();
  };

  // Seções mais afetadas
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

  const ruturasPerTipologia = ruturas.reduce((acc, rutura) => {
    acc[rutura.tipologia_rutura] = (acc[rutura.tipologia_rutura] || 0) + 1;
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

  // Análise correta dos produtos mais afetados
  const ruturas18H = ruturas.filter(r => r.hora_rutura.includes('18h') || r.hora_rutura.includes('18H'));
  
  const produtosAfetados = ruturas.reduce((acc, rutura) => {
    if (!acc[rutura.numero_produto]) {
      acc[rutura.numero_produto] = {
        produto: rutura.numero_produto,
        descricao: rutura.descricao,
        occorencias14H: 0,
        ocorrencias18H: 0,
        naoRepostos: 0,
        secoesAfetadas: new Set<string>()
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
    
    return acc;
  }, {} as Record<string, ProdutoAfetado>);

  const topProdutos: ProdutoAfetadoProcessed[] = Object.values(produtosAfetados)
    .map((item) => ({
      ...item,
      secoesAfetadas: item.secoesAfetadas.size
    }))
    .sort((a, b) => (b.naoRepostos + b.occorencias14H) - (a.naoRepostos + a.occorencias14H))
    .slice(0, 10);

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
            <div className="text-2xl font-bold text-primary">{stats.totalRuturas}</div>
            <p className="text-xs text-muted-foreground">Total registrado</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruturas Hoje</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {isEmPicking ? (
              <>
                <div className="text-2xl font-bold text-info">Em Picking</div>
                <p className="text-xs text-muted-foreground">Aguardando ruturas do dia</p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-warning">{ruturasHoje.length}</div>
                <p className="text-xs text-muted-foreground">Registradas hoje</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.taxaResolucao}%</div>
            <p className="text-xs text-muted-foreground">Ruturas resolvidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
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
            <CardTitle className="text-sm font-medium">Ruturas Resolvidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.ruturasResolvidas}</div>
            <p className="text-xs text-muted-foreground">Status resolvido</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seções Ativas</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.secoesAfetadas}</div>
            <p className="text-xs text-muted-foreground">Seções com ruturas</p>
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

        {/* Seções mais afetadas */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Seções Mais Afetadas</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição por seção</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartSecoes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
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
                  formatter={(value, name, props) => [
                    `${value} ruturas`,
                    props.payload.fullName
                  ]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipologia de Ruturas */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Tipologias de Rutura</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Distribuição dos tipos de ruturas</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartTipologia}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartTipologia.map((entry, index) => (
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
                      `${value} ruturas (${props.payload.percentage})`,
                      props.payload.fullName
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda customizada */}
              <div className="space-y-2 min-w-0 lg:max-w-xs">
                {chartTipologia.map((entry, index) => {
                  const colorClass = [
                    'bg-blue-500', 'bg-red-500', 'bg-amber-500', 'bg-green-500', 
                    'bg-purple-500', 'bg-orange-500', 'bg-cyan-500', 'bg-lime-500'
                  ][index % 8];
                  
                  return (
                    <div key={entry.name} className="flex items-center space-x-2 text-sm">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colorClass}`} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs">{entry.fullName}</div>
                        <div className="text-xs text-muted-foreground">{entry.value} ({entry.percentage})</div>
                      </div>
                    </div>
                  );
                })}
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
            <p className="text-sm text-muted-foreground">Top 10 produtos com maior impacto</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProdutos.map((produto, index) => (
                <div key={produto.produto} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 bg-primary/10 text-primary rounded-full text-xs flex items-center justify-center font-bold">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{produto.produto}</p>
                        <p className="text-xs text-muted-foreground truncate">{produto.descricao}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="text-sm space-y-1">
                      <div className="font-bold text-destructive">{produto.occorencias14H} (14H)</div>
                      <div className="text-xs text-muted-foreground">{produto.naoRepostos} não repostos</div>
                      <div className="text-xs text-info">{produto.secoesAfetadas} seções</div>
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  );
}
