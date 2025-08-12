import { useState, useMemo, useEffect } from 'react';
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
  X,
  FileSpreadsheet,
  FileText,
  Printer
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
  tipo_produto?: string;
  numero_produto?: string;
  tipologia_rutura?: string;
  data?: string;
}

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 75, 100];

export function DataTable({ ruturas: propRuturas, onRefresh }: DataTableProps) {
  const { ruturas: contextRuturas } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
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
      // Busca por texto com filtro por coluna específica
      let searchMatch = true;
      if (searchTerm) {
        const searchValue = searchTerm.toLowerCase();
        if (searchColumn === 'all') {
          searchMatch = Object.values(rutura).some(value => 
            value?.toString().toLowerCase().includes(searchValue)
          );
        } else if (searchColumn === 'ot') {
          searchMatch = rutura.ot.toLowerCase().includes(searchValue);
        } else if (searchColumn === 'req') {
          searchMatch = rutura.req.toLowerCase().includes(searchValue);
        } else if (searchColumn === 'descricao') {
          searchMatch = rutura.descricao.toLowerCase().includes(searchValue);
        } else if (searchColumn === 'numero_produto') {
          searchMatch = rutura.numero_produto.toLowerCase().includes(searchValue);
        }
      }

      // Filtros específicos
      const sectionMatch = !filters.secao || filters.secao === "__all__" || rutura.secao === filters.secao;
      const productMatch = !filters.tipo_produto || filters.tipo_produto === "__all__" || rutura.tipo_produto === filters.tipo_produto;
      const numeroMatch = !filters.numero_produto || filters.numero_produto === "__all__" || rutura.numero_produto === filters.numero_produto;
      const tipologiaMatch = !filters.tipologia_rutura || filters.tipologia_rutura === "__all__" || rutura.tipologia_rutura === filters.tipologia_rutura;
      const dataMatch = !filters.data || filters.data === "__all__" || rutura.data === filters.data;

      return searchMatch && sectionMatch && productMatch && numeroMatch && tipologiaMatch && dataMatch;
    });
  }, [ruturas, searchTerm, searchColumn, filters]);

  // Paginação
  const totalPages = Math.ceil(filteredRuturas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRuturas = filteredRuturas.slice(startIndex, startIndex + itemsPerPage);

  // Obter valores únicos para filtros
  const uniqueValues = useMemo(() => {
    if (!ruturas || ruturas.length === 0) {
      return {
        secoes: [],
        tipos_produto: [],
        numeros_produto: [],
        tipologias: [],
        datas: [],
      };
    }
    
    return {
      secoes: Array.from(new Set(ruturas.map(r => r.secao).filter(Boolean))),
      tipos_produto: Array.from(new Set(ruturas.map(r => r.tipo_produto).filter(Boolean))),
      numeros_produto: Array.from(new Set(ruturas.map(r => r.numero_produto).filter(Boolean))).slice(0, 20),
      tipologias: Array.from(new Set(ruturas.map(r => r.tipologia_rutura).filter(Boolean))),
      datas: Array.from(new Set(ruturas.map(r => r.data).filter(Boolean))).sort().slice(0, 10),
    };
  }, [ruturas]);

  const exportData = (type: 'csv' | 'excel' | 'pdf') => {
    if (filteredRuturas.length === 0) return;
    
    const filename = `ruturas_${new Date().toISOString().split('T')[0]}`;
    
    switch (type) {
      case 'csv':
        exportToCSV(filteredRuturas, filename);
        break;
      case 'excel':
        // Implementar exportToExcel
        console.log('Exportando para Excel...');
        break;
      case 'pdf':
        // Implementar exportToPDF
        console.log('Exportando para PDF...');
        break;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Reset página quando filtros mudam  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, searchColumn, filters]);

  // Se não há dados
  if (!ruturas || ruturas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">Dados de Ruturas</h1>
          <p className="text-gray-600 mt-2">Nenhum dado encontrado. Importe dados para começar.</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sem dados disponíveis</h3>
              <p className="text-gray-600">Importe arquivos Excel ou CSV para começar a analisar ruturas.</p>
            </div>
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
            <Button 
              onClick={() => exportData('excel')} 
              variant="outline" 
              size="sm"
              disabled={filteredRuturas.length === 0}
              className="rounded-lg"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button 
              onClick={() => exportData('pdf')} 
              variant="outline" 
              size="sm"
              disabled={filteredRuturas.length === 0}
              className="rounded-lg"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button 
              onClick={handlePrint} 
              variant="outline" 
              size="sm"
              disabled={filteredRuturas.length === 0}
              className="rounded-lg"
            >
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline" size="sm" className="rounded-lg">
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
          {/* Busca inteligente */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={
                  searchColumn === 'all' ? 'Buscar por qualquer campo...' :
                  searchColumn === 'ot' ? 'Pesquisar OT...' :
                  searchColumn === 'req' ? 'Pesquisar REQ...' :
                  searchColumn === 'descricao' ? 'Pesquisar Descrição...' :
                  searchColumn === 'numero_produto' ? 'Pesquisar Nº Produto...' :
                  'Buscar...'
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={searchColumn} onValueChange={setSearchColumn}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campos</SelectItem>
                <SelectItem value="ot">Pesquisar OT</SelectItem>
                <SelectItem value="req">Pesquisar REQ</SelectItem>
                <SelectItem value="descricao">Pesquisar Descrição</SelectItem>
                <SelectItem value="numero_produto">Pesquisar Nº Produto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtros compactos */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select value={filters.data || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, data: value === "__all__" ? undefined : value }))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as datas</SelectItem>
                {uniqueValues.datas.map(data => (
                  <SelectItem key={`data-${data}`} value={data}>
                    {formatDate(data)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.secao || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, secao: value === "__all__" ? undefined : value }))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Seções" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as seções</SelectItem>
                {uniqueValues.secoes.filter(secao => secao && secao.trim() !== '').map(secao => (
                  <SelectItem key={`secao-${secao}`} value={secao}>{secao}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipo_produto || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, tipo_produto: value === "__all__" ? undefined : value }))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Dep" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os dep.</SelectItem>
                {uniqueValues.tipos_produto.filter(tipo => tipo && tipo.trim() !== '').map(tipo => (
                  <SelectItem key={`dep-${tipo}`} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.numero_produto || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, numero_produto: value === "__all__" ? undefined : value }))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Nº Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os produtos</SelectItem>
                {uniqueValues.numeros_produto.filter(num => num && num.trim() !== '').map(num => (
                  <SelectItem key={`num-${num}`} value={num}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.tipologia_rutura || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, tipologia_rutura: value === "__all__" ? undefined : value }))}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tipologias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as tipologias</SelectItem>
                {uniqueValues.tipologias.filter(tipo => tipo && tipo.trim() !== '').map(tipo => (
                  <SelectItem key={`tip-${tipo}`} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-900">Data</th>
                  <th className="text-left p-3 font-medium text-gray-900">Semana</th>
                  <th className="text-left p-3 font-medium text-gray-900">Hora</th>
                  <th className="text-left p-3 font-medium text-gray-900">Seção</th>
                  <th className="text-left p-3 font-medium text-gray-900">Tipo Req</th>
                  <th className="text-left p-3 font-medium text-gray-900">OT</th>
                  <th className="text-left p-3 font-medium text-gray-900">REQ</th>
                  <th className="text-left p-3 font-medium text-gray-900">Tipo Produto</th>
                  <th className="text-left p-3 font-medium text-gray-900">Nº Produto</th>
                  <th className="text-left p-3 font-medium text-gray-900">Descrição</th>
                  <th className="text-left p-3 font-medium text-gray-900">Qtd Req</th>
                  <th className="text-left p-3 font-medium text-gray-900">Qtd Env</th>
                  <th className="text-left p-3 font-medium text-gray-900">Qtd Falta</th>
                  <th className="text-left p-3 font-medium text-gray-900">Un Med</th>
                  <th className="text-left p-3 font-medium text-gray-900">Stock CT</th>
                  <th className="text-left p-3 font-medium text-gray-900">Stock FF</th>
                  <th className="text-left p-3 font-medium text-gray-900">Em Trânsito</th>
                  <th className="text-left p-3 font-medium text-gray-900">Tipologia</th>
                  <th className="text-left p-3 font-medium text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuturas.map((rutura, index) => (
                  <tr key={rutura.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 text-gray-900">{formatDate(rutura.data)}</td>
                    <td className="p-3 text-gray-700 text-xs">{rutura.semana}</td>
                    <td className="p-3 text-gray-700">{rutura.hora_rutura}</td>
                    <td className="p-3 text-gray-900 font-medium">{rutura.secao}</td>
                    <td className="p-3 text-gray-700">{rutura.tipo_requisicao}</td>
                    <td className="p-3 text-blue-600 font-mono">{rutura.ot}</td>
                    <td className="p-3 text-blue-600 font-mono">{rutura.req}</td>
                    <td className="p-3 text-gray-700">{rutura.tipo_produto}</td>
                    <td className="p-3 text-gray-900 font-mono">{rutura.numero_produto}</td>
                    <td className="p-3 text-gray-900 max-w-48 truncate" title={rutura.descricao}>
                      {rutura.descricao}
                    </td>
                    <td className="p-3 text-gray-900 text-center">{rutura.qtd_req}</td>
                    <td className="p-3 text-gray-900 text-center">{rutura.qtd_env}</td>
                    <td className="p-3 text-red-600 text-center font-medium">{rutura.qtd_falta}</td>
                    <td className="p-3 text-gray-700">{rutura.un_med}</td>
                    <td className="p-3 text-gray-900 text-center">{rutura.stock_ct}</td>
                    <td className="p-3 text-gray-900 text-center">{rutura.stock_ff}</td>
                    <td className="p-3 text-gray-900 text-center">{rutura.em_transito_ff}</td>
                    <td className="p-3">
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-2 py-1 bg-red-100 text-red-800 border-red-200"
                      >
                        {rutura.tipologia_rutura}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        onClick={() => setSelectedRutura(rutura)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação e controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map(option => (
                <SelectItem key={option} value={option.toString()}>
                  {option} linhas
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">
            Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRuturas.length)} de {filteredRuturas.length} registros
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Modal de visualização detalhada */}
      {selectedRutura && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Detalhes da Rutura</h2>
                <Button onClick={() => setSelectedRutura(null)} variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Data:</strong> {formatDate(selectedRutura.data)}</div>
                <div><strong>Semana:</strong> {selectedRutura.semana}</div>
                <div><strong>Hora:</strong> {selectedRutura.hora_rutura}</div>
                <div><strong>Seção:</strong> {selectedRutura.secao}</div>
                <div><strong>OT:</strong> {selectedRutura.ot}</div>
                <div><strong>REQ:</strong> {selectedRutura.req}</div>
                <div><strong>Tipo Produto:</strong> {selectedRutura.tipo_produto}</div>
                <div><strong>Nº Produto:</strong> {selectedRutura.numero_produto}</div>
                <div className="col-span-2"><strong>Descrição:</strong> {selectedRutura.descricao}</div>
                <div><strong>Qtd Req:</strong> {selectedRutura.qtd_req}</div>
                <div><strong>Qtd Env:</strong> {selectedRutura.qtd_env}</div>
                <div><strong>Qtd Falta:</strong> {selectedRutura.qtd_falta}</div>
                <div><strong>Un Med:</strong> {selectedRutura.un_med}</div>
                <div><strong>Stock CT:</strong> {selectedRutura.stock_ct}</div>
                <div><strong>Stock FF:</strong> {selectedRutura.stock_ff}</div>
                <div><strong>Em Trânsito:</strong> {selectedRutura.em_transito_ff}</div>
                <div><strong>Tipologia:</strong> {selectedRutura.tipologia_rutura}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
