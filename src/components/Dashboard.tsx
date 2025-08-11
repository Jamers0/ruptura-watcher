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
import { calculateDashboardStats, getStatusColor } from '@/lib/utils-rutura';

interface DashboardProps {
  ruturas: Rutura[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--success))', 'hsl(var(--info))'];

export function Dashboard({ ruturas }: DashboardProps) {
  const stats = calculateDashboardStats(ruturas);

  // Dados para gráficos
  const ruturasPerSecao = ruturas.reduce((acc, rutura) => {
    acc[rutura.secao] = (acc[rutura.secao] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartSecoes = Object.entries(ruturasPerSecao)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const ruturasPerTipologia = ruturas.reduce((acc, rutura) => {
    acc[rutura.tipologia_rutura] = (acc[rutura.tipologia_rutura] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartTipologia = Object.entries(ruturasPerTipologia)
    .map(([name, value]) => ({ name, value }));

  const produtosMaisAfetados = ruturas.reduce((acc, rutura) => {
    if (!acc[rutura.numero_produto]) {
      acc[rutura.numero_produto] = {
        produto: rutura.numero_produto,
        descricao: rutura.descricao,
        qtdFalta: 0,
        ocorrencias: 0
      };
    }
    acc[rutura.numero_produto].qtdFalta += rutura.qtd_falta;
    acc[rutura.numero_produto].ocorrencias += 1;
    return acc;
  }, {} as Record<string, any>);

  const topProdutos = Object.values(produtosMaisAfetados)
    .sort((a: any, b: any) => b.qtdFalta - a.qtdFalta)
    .slice(0, 5);

  const recentRuturas = ruturas
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <CardTitle className="text-sm font-medium">Ruturas Ativas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.ruturasAtivas}</div>
            <p className="text-xs text-muted-foreground">Pendentes de resolução</p>
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
            <CardTitle className="text-sm font-medium">Seções Afetadas</CardTitle>
            <Users className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{stats.secoesAfetadas}</div>
            <p className="text-xs text-muted-foreground">Diferentes seções</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ruturas Hoje</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.ruturasHoje}</div>
            <p className="text-xs text-muted-foreground">Registradas hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card hover:shadow-elevated transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">€{stats.valorTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Impacto financeiro</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ruturas por Seção */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Ruturas por Seção</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartSecoes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tipologia de Ruturas */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Tipologia de Ruturas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartTipologia}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartTipologia.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos mais afetados */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle>Produtos Mais Afetados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProdutos.map((produto: any, index) => (
                <div key={produto.produto} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{produto.produto}</p>
                    <p className="text-xs text-muted-foreground truncate">{produto.descricao}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-destructive">{produto.qtdFalta.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{produto.ocorrencias} ocorrências</p>
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
                    <Badge variant={getStatusColor(rutura.tipologia_rutura) as any} className="text-xs">
                      {rutura.tipologia_rutura}
                    </Badge>
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