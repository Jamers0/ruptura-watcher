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

const ITEMS_PER_PAGE = 50;

export function DataTable({ ruturas: propRuturas, onRefresh }: DataTableProps) {
  const { ruturas: contextRuturas } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<LocalFilters>({});
  const [selectedRutura, setSelectedRutura] = useState<Rutura | null>(null);

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
            <Button onClick={() => exportToCSV(filteredRuturas, `ruturas-${new Date().toISOString().split('T')[0]}.csv`)} variant="outline" disabled={filteredRuturas.length === 0}>
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
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">Data</th>
                  <th className="text-left p-4 font-medium text-gray-900">Seção</th>
                  <th className="text-left p-4 font-medium text-gray-900">Produto</th>
                  <th className="text-left p-4 font-medium text-gray-900">Descrição</th>
                  <th className="text-left p-4 font-medium text-gray-900">Qtd Falta</th>
                  <th className="text-left p-4 font-medium text-gray-900">Tipologia</th>
                  <th className="text-left p-4 font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuturas.map((rutura, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(rutura.data)}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">{rutura.secao}</td>
                    <td className="p-4 text-sm font-mono">{rutura.numero_produto}</td>
                    <td className="p-4 text-sm max-w-xs truncate" title={rutura.descricao}>
                      {rutura.descricao}
                    </td>
                    <td className="p-4 text-sm font-medium text-red-600">{rutura.qtd_falta}</td>
                    <td className="p-4">
                      <Badge 
                        variant={getStatusColor(rutura.tipologia_rutura) as "default" | "destructive" | "outline" | "secondary"}
                        className="text-xs"
                      >
                        {rutura.tipologia_rutura}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Button
                        onClick={() => setSelectedRutura(rutura)}
                        variant="ghost"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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

      {/* Modal de Detalhes */}
      {selectedRutura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalhes da Rutura</h3>
              <Button onClick={() => setSelectedRutura(null)} variant="ghost" size="sm">
                ×
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Data</label>
                <p className="text-sm">{formatDate(selectedRutura.data)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Seção</label>
                <p className="text-sm font-medium">{selectedRutura.secao}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Produto</label>
                <p className="text-sm font-mono">{selectedRutura.numero_produto}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipo</label>
                <p className="text-sm">{selectedRutura.tipo_produto}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Descrição</label>
                <p className="text-sm">{selectedRutura.descricao}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Quantidade Falta</label>
                <p className="text-sm font-medium text-red-600">{selectedRutura.qtd_falta}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Tipologia</label>
                <div>
                  <Badge 
                    variant={getStatusColor(selectedRutura.tipologia_rutura) as "default" | "destructive" | "outline" | "secondary"}
                  >
                    {selectedRutura.tipologia_rutura}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
