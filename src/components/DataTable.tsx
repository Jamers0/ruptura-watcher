import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package
} from 'lucide-react';
import type { Rutura, FilterOptions } from '@/lib/types';
import { getStatusColor, formatDate, exportToCSV } from '@/lib/utils-rutura';
import { cn } from '@/lib/utils';

interface DataTableProps {
  ruturas: Rutura[];
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 50;

export function DataTable({ ruturas, onRefresh }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [selectedRutura, setSelectedRutura] = useState<Rutura | null>(null);

  // Opções para filtros
  const secoes = useMemo(() => 
    Array.from(new Set(ruturas.map(r => r.secao))).sort(), 
    [ruturas]
  );
  
  const tiposRequisicao = useMemo(() => 
    Array.from(new Set(ruturas.map(r => r.tipo_requisicao))).sort(), 
    [ruturas]
  );
  
  const tiposProduto = useMemo(() => 
    Array.from(new Set(ruturas.map(r => r.tipo_produto))).sort(), 
    [ruturas]
  );
  
  const tipologiasRutura = useMemo(() => 
    Array.from(new Set(ruturas.map(r => r.tipologia_rutura))).sort(), 
    [ruturas]
  );

  // Dados filtrados
  const filteredRuturas = useMemo(() => {
    return ruturas.filter(rutura => {
      // Pesquisa por texto
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          rutura.secao.toLowerCase().includes(searchLower) ||
          rutura.numero_produto.toLowerCase().includes(searchLower) ||
          rutura.descricao.toLowerCase().includes(searchLower) ||
          rutura.req.toLowerCase().includes(searchLower) ||
          rutura.ot.toLowerCase().includes(searchLower) ||
          rutura.tipologia_rutura.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      // Filtros
      if (filters.secao?.length && !filters.secao.includes(rutura.secao)) return false;
      if (filters.tipoRequisicao?.length && !filters.tipoRequisicao.includes(rutura.tipo_requisicao)) return false;
      if (filters.tipoProduto?.length && !filters.tipoProduto.includes(rutura.tipo_produto)) return false;
      if (filters.tipologiaRutura?.length && !filters.tipologiaRutura.includes(rutura.tipologia_rutura)) return false;
      
      // Filtro de data
      if (filters.dataInicio) {
        if (new Date(rutura.data) < new Date(filters.dataInicio)) return false;
      }
      if (filters.dataFim) {
        if (new Date(rutura.data) > new Date(filters.dataFim)) return false;
      }

      return true;
    });
  }, [ruturas, searchTerm, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredRuturas.length / ITEMS_PER_PAGE);
  const paginatedRuturas = filteredRuturas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExport = () => {
    exportToCSV(filteredRuturas, 'ruturas-filtradas.csv');
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  const updateFilter = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value ? [value] : undefined
    }));
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dados de Ruturas
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualize e gerencie todos os dados de ruturas registrados
        </p>
      </div>

      {/* Filtros e Pesquisa */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Pesquisa
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por seção, produto, REQ, OT ou tipologia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select value={filters.secao?.[0] || ''} onValueChange={(value) => updateFilter('secao', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as seções</SelectItem>
                {secoes.map(secao => (
                  <SelectItem key={secao} value={secao}>{secao}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipoRequisicao?.[0] || ''} onValueChange={(value) => updateFilter('tipoRequisicao', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Requisição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                {tiposRequisicao.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipoProduto?.[0] || ''} onValueChange={(value) => updateFilter('tipoProduto', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os produtos</SelectItem>
                {tiposProduto.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipologiaRutura?.[0] || ''} onValueChange={(value) => updateFilter('tipologiaRutura', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as tipologias</SelectItem>
                {tipologiasRutura.map(tipologia => (
                  <SelectItem key={tipologia} value={tipologia}>{tipologia}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Data início"
                value={filters.dataInicio || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
          </div>

          {/* Stats dos filtros */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {paginatedRuturas.length} de {filteredRuturas.length} ruturas
              {filteredRuturas.length !== ruturas.length && ` (filtrado de ${ruturas.length} total)`}
            </span>
            <span>
              Página {currentPage} de {totalPages}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium">Seção</th>
                  <th className="text-left p-4 font-medium">Produto</th>
                  <th className="text-left p-4 font-medium">REQ/OT</th>
                  <th className="text-left p-4 font-medium">Quantidade</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuturas.map((rutura, index) => (
                  <tr 
                    key={rutura.id || index} 
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{rutura.secao}</div>
                        <div className="text-sm text-muted-foreground">{rutura.tipo_requisicao}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-medium">{rutura.numero_produto}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-48">
                          {rutura.descricao}
                        </div>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {rutura.tipo_produto}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div>REQ: {rutura.req}</div>
                        <div>OT: {rutura.ot}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Req:</span>
                          <span className="font-medium">{rutura.qtd_req} {rutura.un_med}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Env:</span>
                          <span className="font-medium">{rutura.qtd_env} {rutura.un_med}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-destructive">Falta:</span>
                          <span className="font-bold text-destructive">{rutura.qtd_falta} {rutura.un_med}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(rutura.data)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {rutura.semana}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge 
                        variant={getStatusColor(rutura.tipologia_rutura) as any}
                        className="text-xs"
                      >
                        {rutura.tipologia_rutura}
                      </Badge>
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div>CT: {rutura.stock_ct}</div>
                        <div>FF: {rutura.stock_ff}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedRutura(rutura)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginatedRuturas.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma rutura encontrada com os filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <span className="text-sm text-muted-foreground px-4">
            Página {currentPage} de {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de detalhes */}
      {selectedRutura && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Detalhes da Rutura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Seção</label>
                  <p className="font-medium">{selectedRutura.secao}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo Requisição</label>
                  <p className="font-medium">{selectedRutura.tipo_requisicao}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">REQ</label>
                  <p className="font-medium">{selectedRutura.req}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">OT</label>
                  <p className="font-medium">{selectedRutura.ot}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Produto</label>
                  <p className="font-medium">{selectedRutura.numero_produto}</p>
                  <p className="text-sm text-muted-foreground">{selectedRutura.descricao}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo Produto</label>
                  <p className="font-medium">{selectedRutura.tipo_produto}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unidade</label>
                  <p className="font-medium">{selectedRutura.un_med}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Qtd. Requisitada</label>
                  <p className="font-medium">{selectedRutura.qtd_req}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Qtd. Enviada</label>
                  <p className="font-medium">{selectedRutura.qtd_env}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Qtd. em Falta</label>
                  <p className="font-bold text-destructive">{selectedRutura.qtd_falta}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data</label>
                  <p className="font-medium">{formatDate(selectedRutura.data)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock CT</label>
                  <p className="font-medium">{selectedRutura.stock_ct}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Stock FF</label>
                  <p className="font-medium">{selectedRutura.stock_ff}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Em Trânsito FF</label>
                  <p className="font-medium">{selectedRutura.em_transito_ff}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Tipologia da Rutura</label>
                  <Badge 
                    variant={getStatusColor(selectedRutura.tipologia_rutura) as any}
                    className="mt-1"
                  >
                    {selectedRutura.tipologia_rutura}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button onClick={() => setSelectedRutura(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}