import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Calendar,
  Package,
  AlertTriangle,
  Target
} from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import type { Rutura } from '@/lib/types';
import { normalizarSecao } from '@/lib/utils-rutura';

interface ProdutoAnalise {
  produto: string;
  descricao: string;
  ocorrencias14H: number;
  ocorrencias18H: number;
  naoRepostos: number;
  secoesAfetadas: Set<string>;
}

interface TendenciaSemanalItem {
  semana: string;
  ruturas14H: number;
  ruturas18H: number;
  naoRepostos: number;
}

interface ProdutoCritico {
  produto: string;
  descricao: string;
  qtdFalta: number;
}

interface AnalysisMetrics {
  totalRuturas: number;
  ruturas14H: number;
  ruturas18H: number;
  secoesAfetadas: number;
  produtosMaisAfetados: Array<{ 
    produto: string; 
    descricao: string; 
    ocorrencias14H: number; 
    ocorrencias18H: number; 
    naoRepostos: number; 
    secoesAfetadas: number 
  }>;
  secoesMaisAfetadas: Array<{ secao: string; count: number }>;
  tipologiasDistribuicao: Array<{ tipo: string; count: number; percentage: number }>;
  tendenciaSemanal: Array<{ semana: string; ruturas14H: number; ruturas18H: number; naoRepostos: number }>;
  valorTotalFalta: number;
  produtosCriticos: Array<{ produto: string; qtdFalta: number; descricao: string }>;
  indicadoresStock: {
    semStockCT: number;
    semStockFF: number;
    emTransito: number;
  };
}

export function AnalysesComponent() {
  const { ruturas } = useData();

  const metrics: AnalysisMetrics = useMemo(() => {
    if (!ruturas || ruturas.length === 0) {
      return {
        totalRuturas: 0,
        ruturas14H: 0,
        ruturas18H: 0,
        secoesAfetadas: 0,
        produtosMaisAfetados: [],
        secoesMaisAfetadas: [],
        tipologiasDistribuicao: [],
        tendenciaSemanal: [],
        valorTotalFalta: 0,
        produtosCriticos: [],
        indicadoresStock: {
          semStockCT: 0,
          semStockFF: 0,
          emTransito: 0
        }
      };
    }

    // Separar ruturas por horário
    const ruturas14H = ruturas.filter(r => r.hora_rutura.includes('14h') || r.hora_rutura.includes('14H'));
    const ruturas18H = ruturas.filter(r => r.hora_rutura.includes('18h') || r.hora_rutura.includes('18H'));

    // Análise de produtos mais afetados
    const produtosAnalise = ruturas.reduce((acc, rutura) => {
      if (!acc[rutura.numero_produto]) {
        acc[rutura.numero_produto] = {
          produto: rutura.numero_produto,
          descricao: rutura.descricao,
          ocorrencias14H: 0,
          ocorrencias18H: 0,
          naoRepostos: 0,
          secoesAfetadas: new Set<string>()
        };
      }
      
      const item = acc[rutura.numero_produto];
      
      if (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H')) {
        item.ocorrencias14H += 1;
      }
      
      if (rutura.hora_rutura.includes('18h') || rutura.hora_rutura.includes('18H')) {
        item.ocorrencias18H += 1;
        
        // Verificar se existe correspondente em 14H (não foi reposto)
        const tem14H = ruturas14H.find(r14 => 
          r14.numero_produto === rutura.numero_produto &&
          r14.secao === rutura.secao &&
          r14.ot === rutura.ot &&
          r14.req === rutura.req
        );
        
        if (tem14H) {
          item.naoRepostos += 1;
        }
      }
      
      item.secoesAfetadas.add(normalizarSecao(rutura.secao));
      
      return acc;
    }, {} as Record<string, ProdutoAnalise>);

    const produtosMaisAfetados = Object.values(produtosAnalise)
      .map((item) => ({
        ...item,
        secoesAfetadas: item.secoesAfetadas.size
      }))
      .sort((a, b) => (b.naoRepostos + b.ocorrencias14H) - (a.naoRepostos + a.ocorrencias14H))
      .slice(0, 10);

    // Análise de seções mais afetadas (normalizadas)
    const secoesCount = ruturas.reduce((acc, rutura) => {
      const secaoNormalizada = normalizarSecao(rutura.secao);
      acc[secaoNormalizada] = (acc[secaoNormalizada] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const secoesMaisAfetadas = Object.entries(secoesCount)
      .map(([secao, count]) => ({ secao, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribuição de tipologias
    const tipologiasCount = ruturas.reduce((acc, rutura) => {
      acc[rutura.tipologia_rutura] = (acc[rutura.tipologia_rutura] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const tipologiasDistribuicao = Object.entries(tipologiasCount)
      .map(([tipo, count]) => ({
        tipo,
        count,
        percentage: (count / ruturas.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Tendência semanal
    const semanalCount = ruturas.reduce((acc, rutura) => {
      if (!acc[rutura.semana]) {
        acc[rutura.semana] = {
          semana: rutura.semana,
          ruturas14H: 0,
          ruturas18H: 0,
          naoRepostos: 0
        };
      }
      
      if (rutura.hora_rutura.includes('14h') || rutura.hora_rutura.includes('14H')) {
        acc[rutura.semana].ruturas14H += 1;
      }
      
      if (rutura.hora_rutura.includes('18h') || rutura.hora_rutura.includes('18H')) {
        acc[rutura.semana].ruturas18H += 1;
        
        // Verificar se não foi reposto
        const tem14H = ruturas14H.find(r14 => 
          r14.numero_produto === rutura.numero_produto &&
          r14.secao === rutura.secao &&
          r14.ot === rutura.ot &&
          r14.req === rutura.req &&
          r14.semana === rutura.semana
        );
        
        if (tem14H) {
          acc[rutura.semana].naoRepostos += 1;
        }
      }
      
      return acc;
    }, {} as Record<string, TendenciaSemanalItem>);

    const tendenciaSemanal = Object.values(semanalCount)
      .sort((a, b) => a.semana.localeCompare(b.semana));

    // Indicadores de Stock
    const indicadoresStock = {
      semStockCT: ruturas.filter(r => r.stock_ct === 0).length,
      semStockFF: ruturas.filter(r => r.stock_ff === 0).length,
      emTransito: ruturas.filter(r => r.em_transito_ff > 0).length
    };

    // Produtos críticos (maior quantidade de falta)
    const produtosCriticos = Object.values(
      ruturas.reduce((acc, rutura) => {
        if (!acc[rutura.numero_produto]) {
          acc[rutura.numero_produto] = {
            produto: rutura.numero_produto,
            descricao: rutura.descricao,
            qtdFalta: 0
          };
        }
        acc[rutura.numero_produto].qtdFalta += rutura.qtd_falta;
        return acc;
      }, {} as Record<string, ProdutoCritico>)
    )
    .sort((a, b) => b.qtdFalta - a.qtdFalta)
    .slice(0, 5);

    // Seções únicas normalizadas
    const secoesUnicas = new Set(ruturas.map(r => normalizarSecao(r.secao)));

    return {
      totalRuturas: ruturas.length,
      ruturas14H: ruturas14H.length,
      ruturas18H: ruturas18H.length,
      secoesAfetadas: secoesUnicas.size,
      produtosMaisAfetados,
      secoesMaisAfetadas,
      tipologiasDistribuicao,
      tendenciaSemanal,
      valorTotalFalta: ruturas.reduce((sum, r) => sum + r.qtd_falta, 0),
      produtosCriticos,
      indicadoresStock
    };
  }, [ruturas]);

  if (!ruturas || ruturas.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Análises Avançadas</h2>
          <p className="text-gray-600">Importe dados de ruturas para ver análises detalhadas.</p>
          <p className="text-sm text-gray-500 mt-2">
            Análises baseadas na lógica correta: ruturas 14H vs 18H, produtos não repostos e seções normalizadas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Análises Avançadas
        </h1>
        <p className="text-muted-foreground mt-2">
          Insights inteligentes baseados nos dados de ruturas 14H e 18H
        </p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Total de Ruturas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metrics.totalRuturas}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.ruturas14H} às 14H • {metrics.ruturas18H} às 18H
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Não Repostos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {metrics.produtosMaisAfetados.reduce((sum, p) => sum + p.naoRepostos, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ruturas 14H que persistiram às 18H</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Seções Afetadas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{metrics.secoesAfetadas}</div>
            <p className="text-xs text-muted-foreground">Seções normalizadas únicas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <TrendingDown className="h-4 w-4" />
              <span>Produtos Críticos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {metrics.produtosMaisAfetados.filter(p => p.naoRepostos > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Com ruturas não repostas</p>
          </CardContent>
        </Card>
      </div>

      {/* Produtos mais afetados */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Mais Afetados</CardTitle>
          <p className="text-sm text-muted-foreground">
            Análise baseada em ocorrências 14H, 18H e produtos não repostos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.produtosMaisAfetados.map((item, index) => (
              <div key={item.produto} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 bg-primary/10 text-primary rounded-full text-sm flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{item.produto}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-4 text-center">
                  <div>
                    <div className="text-sm font-bold text-primary">{item.ocorrencias14H}</div>
                    <div className="text-xs text-muted-foreground">14H</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-warning">{item.ocorrencias18H}</div>
                    <div className="text-xs text-muted-foreground">18H</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-destructive">{item.naoRepostos}</div>
                    <div className="text-xs text-muted-foreground">Não Repostos</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-info">{item.secoesAfetadas}</div>
                    <div className="text-xs text-muted-foreground">Seções</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seções mais afetadas e Indicadores de Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Seções Mais Afetadas</CardTitle>
            <p className="text-sm text-muted-foreground">Seções normalizadas com mais ruturas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.secoesMaisAfetadas.map((item, index) => (
                <div key={item.secao} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-info/10 text-info rounded-full text-xs flex items-center justify-center font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{item.secao}</span>
                  </div>
                  <Badge variant="secondary">{item.count} ruturas</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores de Stock</CardTitle>
            <p className="text-sm text-muted-foreground">Análise dos estoques CT, FF e trânsito</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Sem Stock CT</p>
                  <p className="text-xs text-muted-foreground">Estoque CateringPor = 0</p>
                </div>
                <Badge variant="destructive">{metrics.indicadoresStock.semStockCT}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Sem Stock FF</p>
                  <p className="text-xs text-muted-foreground">Estoque Frigofril = 0</p>
                </div>
                <Badge variant="secondary">{metrics.indicadoresStock.semStockFF}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Em Trânsito</p>
                  <p className="text-xs text-muted-foreground">FF → CT em movimento</p>
                </div>
                <Badge variant="secondary">{metrics.indicadoresStock.emTransito}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendência Semanal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Semanal das Ruturas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparação entre ruturas 14H vs 18H ao longo das semanas
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.tendenciaSemanal.map((item) => (
              <div key={item.semana} className="p-4 rounded-lg border">
                <h3 className="font-medium text-sm mb-2">{item.semana}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">14H:</span>
                    <span className="text-sm font-bold text-primary">{item.ruturas14H}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">18H:</span>
                    <span className="text-sm font-bold text-warning">{item.ruturas18H}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Não Repostos:</span>
                    <span className="text-sm font-bold text-destructive">{item.naoRepostos}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700">
              <strong>Análise dos Dados de Ruturas:</strong>
            </p>
            <ul className="text-gray-700">
              <li>
                <strong>Volume Total:</strong> {metrics.totalRuturas} ruturas registradas, 
                distribuídas entre {metrics.ruturas14H} ruturas de 14H e {metrics.ruturas18H} ruturas de 18H.
              </li>
              <li>
                <strong>Produtos Críticos:</strong> O produto mais afetado é{' '}
                <span className="font-mono bg-gray-100 px-1 rounded">{metrics.produtosMaisAfetados[0]?.produto}</span>
                {' '}com {metrics.produtosMaisAfetados[0]?.ocorrencias14H} ocorrências às 14H e{' '}
                {metrics.produtosMaisAfetados[0]?.naoRepostos} casos não repostos.
              </li>
              <li>
                <strong>Seções Afetadas:</strong> {metrics.secoesAfetadas} seções únicas (normalizadas) foram afetadas por ruturas, 
                com destaque para <span className="font-mono bg-gray-100 px-1 rounded">{metrics.secoesMaisAfetadas[0]?.secao}</span>.
              </li>
              <li>
                <strong>Eficiência de Reposição:</strong> Do total de ruturas identificadas às 14H, uma parcela significativa 
                persistiu até às 18H, indicando oportunidades de melhoria no processo de reposição.
              </li>
              <li>
                <strong>Indicadores de Stock:</strong> {metrics.indicadoresStock.semStockCT} ruturas ocorreram sem stock em CT, 
                {metrics.indicadoresStock.semStockFF} sem stock em FF, e {metrics.indicadoresStock.emTransito} tinham produtos em trânsito.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
