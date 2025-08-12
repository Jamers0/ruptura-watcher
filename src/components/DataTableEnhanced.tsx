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
  Package,
  Edit,
  Save,
  X
} from 'lucide-react';
import type { Rutura } from '@/lib/types';
import { getStatusColor, formatDate, exportToCSV } from '@/lib/utils-rutura';
import { useData } from '@/contexts/DataContext';

interface DataTableProps {
  ruturas?: Rutura[];
  onRefresh?: () => void;
}

interface LocalFilters {
  secao?: string;
  tipo_requisicao?: string;
  tipo_produto?: string;
  tipologia_rutura?: string;
}

const ITEMS_PER_PAGE = 25;

export function DataTableEnhanced({ ruturas: propRuturas, onRefresh }: DataTableProps) {
  const { ruturas: contextRuturas } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LocalFilters>({});
  const [selectedRutura, setSelectedRutura] = useState<Rutura | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Rutura>>({});

  // Usar dados do contexto se disponíveis, senão props
  const ruturas = useMemo(() => 
    contextRuturas.length > 0 ? contextRuturas : (propRuturas || []), 
    [contextRuturas, propRuturas]
  );

  // Dados filtrados
  const filteredRuturas = useMemo(() => {
    if (!ruturas || ruturas.length === 0) return [];

    return ruturas.filter(rutura => {
      // Busca por texto
      const searchMatch = !searchTerm || 
        Object.values(rutura).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );

      // Filtros específicos
      const sectionMatch = !filters.secao || rutura.secao === filters.secao;
      const typeMatch = !filters.tipo_requisicao || rutura.tipo_requisicao === filters.tipo_requisicao;
      const productMatch = !filters.tipo_produto || rutura.tipo_produto === filters.tipo_produto;
      const tipologiaMatch = !filters.tipologia_rutura || rutura.tipologia_rutura === filters.tipologia_rutura;

      return searchMatch && sectionMatch && typeMatch && productMatch && tipologiaMatch;
    });
  }, [ruturas, searchTerm, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredRuturas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRuturas = filteredRuturas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Obter valores únicos para filtros
  const uniqueValues = useMemo(() => ({
    secoes: Array.from(new Set(ruturas?.map(r => r.secao).filter(Boolean))),
    tipos_requisicao: Array.from(new Set(ruturas?.map(r => r.tipo_requisicao).filter(Boolean))),
    tipos_produto: Array.from(new Set(ruturas?.map(r => r.tipo_produto).filter(Boolean))),
    tipologias: Array.from(new Set(ruturas?.map(r => r.tipologia_rutura).filter(Boolean))),
  }), [ruturas]);

  const handleEdit = (rutura: Rutura) => {
    setEditingRow(rutura.id);
    setEditValues(rutura);
  };

  const handleSave = () => {
    // Aqui seria implementada a lógica para salvar as alterações
    console.log('Salvando alterações:', editValues);
    setEditingRow(null);
    setEditValues({});
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const exportData = () => {
    if (filteredRuturas.length === 0) return;
    exportToCSV(filteredRuturas, `ruturas-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Se não há dados
  if (!ruturas || ruturas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dados de Ruturas</h1>
          <p className="text-gray-600 mt-2">Visualize e gerencie todas as ruturas de estoque</p>
        </div>

        <Card>
          <CardContent className="text-center py-12">
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-gray-100 p-6">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Nenhum dado encontrado
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Para visualizar os dados de ruturas, importe um arquivo Excel ou CSV.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com estatísticas */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Dados de Ruturas</h1>
            <p className="text-gray-600 mt-2">
              {filteredRuturas.length} registros encontrados
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportData} variant="outline" disabled={filteredRuturas.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline">
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por qualquer campo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Select 
            value={filters.secao || 'all'} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              secao: value === 'all' ? undefined : value 
            }))}
          >
              <SelectTrigger>
                <SelectValue placeholder="Todas as seções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as seções</SelectItem>
                {uniqueValues.secoes.map(secao => (
                  <SelectItem key={secao} value={secao}>{secao}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipo_requisicao || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo_requisicao: value === 'all' ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {uniqueValues.tipos_requisicao.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipo_produto || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo_produto: value === 'all' ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {uniqueValues.tipos_produto.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipologia_rutura || 'all'} onValueChange={(value) => setFilters(prev => ({ ...prev, tipologia_rutura: value === 'all' ? undefined : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as tipologias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tipologias</SelectItem>
                {uniqueValues.tipologias.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Expandida */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Data</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Semana</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Hora</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Seção</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Tipo Req</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">OT</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">REQ</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Tipo Produto</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Nº Produto</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Descrição</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Qtd Req</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Qtd Env</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Qtd Falta</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Un Med</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Stock CT</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Stock FF</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Em Trânsito</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Tipologia</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Aba Origem</th>
                  <th className="text-left p-2 font-medium text-gray-900 text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuturas.map((rutura, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 text-xs">
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        {formatDate(rutura.data)}
                      </div>
                    </td>
                    <td className="p-2">{rutura.semana}</td>
                    <td className="p-2">{rutura.hora_rutura}</td>
                    <td className="p-2 font-medium">{rutura.secao}</td>
                    <td className="p-2">{rutura.tipo_requisicao}</td>
                    <td className="p-2 font-mono text-xs">{rutura.ot}</td>
                    <td className="p-2 font-mono text-xs">{rutura.req}</td>
                    <td className="p-2">{rutura.tipo_produto}</td>
                    <td className="p-2 font-mono text-xs">{rutura.numero_produto}</td>
                    <td className="p-2 max-w-32 truncate" title={rutura.descricao}>
                      {rutura.descricao}
                    </td>
                    <td className="p-2 text-right">{rutura.qtd_req}</td>
                    <td className="p-2 text-right">{rutura.qtd_env}</td>
                    <td className="p-2 text-right font-medium text-red-600">{rutura.qtd_falta}</td>
                    <td className="p-2">{rutura.un_med}</td>
                    <td className="p-2 text-right">{rutura.stock_ct}</td>
                    <td className="p-2 text-right">{rutura.stock_ff}</td>
                    <td className="p-2 text-right">{rutura.em_transito_ff}</td>
                    <td className="p-2">
                      <Badge 
                        variant={getStatusColor(rutura.tipologia_rutura) as "default" | "destructive" | "outline" | "secondary"}
                        className="text-xs"
                      >
                        {rutura.tipologia_rutura}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {rutura.aba_origem}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button
                          onClick={() => setSelectedRutura(rutura)}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        {editingRow === rutura.id ? (
                          <>
                            <Button onClick={handleSave} variant="ghost" size="sm">
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button onClick={handleCancel} variant="ghost" size="sm">
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleEdit(rutura)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, filteredRuturas.length)} de {filteredRuturas.length} resultados
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Página {currentPage} de {totalPages}</span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes Expandido */}
      {selectedRutura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalhes da Rutura</h3>
              <Button onClick={() => setSelectedRutura(null)} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Data</label>
                <p className="text-sm">{formatDate(selectedRutura.data)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Semana</label>
                <p className="text-sm">{selectedRutura.semana}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Hora Rutura</label>
                <p className="text-sm">{selectedRutura.hora_rutura}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Seção</label>
                <p className="text-sm font-medium">{selectedRutura.secao}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo Requisição</label>
                <p className="text-sm">{selectedRutura.tipo_requisicao}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">OT</label>
                <p className="text-sm font-mono">{selectedRutura.ot}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">REQ</label>
                <p className="text-sm font-mono">{selectedRutura.req}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo Produto</label>
                <p className="text-sm">{selectedRutura.tipo_produto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Nº Produto</label>
                <p className="text-sm font-mono">{selectedRutura.numero_produto}</p>
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium text-gray-600">Descrição</label>
                <p className="text-sm">{selectedRutura.descricao}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Quantidade Requerida</label>
                <p className="text-sm">{selectedRutura.qtd_req}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Quantidade Enviada</label>
                <p className="text-sm">{selectedRutura.qtd_env}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Quantidade em Falta</label>
                <p className="text-sm font-medium text-red-600">{selectedRutura.qtd_falta}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Unidade Medida</label>
                <p className="text-sm">{selectedRutura.un_med}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Stock CT</label>
                <p className="text-sm">{selectedRutura.stock_ct}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Stock FF</label>
                <p className="text-sm">{selectedRutura.stock_ff}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Em Trânsito FF</label>
                <p className="text-sm">{selectedRutura.em_transito_ff}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipologia Rutura</label>
                <Badge 
                  variant={getStatusColor(selectedRutura.tipologia_rutura) as "default" | "destructive" | "outline" | "secondary"}
                  className="text-xs mt-1"
                >
                  {selectedRutura.tipologia_rutura}
                </Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Aba Origem</label>
                <Badge variant="outline" className="text-xs mt-1">
                  {selectedRutura.aba_origem}
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => setSelectedRutura(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
