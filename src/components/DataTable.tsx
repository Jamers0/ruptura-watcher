import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

interface DataTableProps {
  ruturas?: Rutura[];
  onRefresh?: () => void;
}

interface LocalFilters {
  secao?: string;
  tipo_produto?: string;
  tipologia_rutura?: string;
  horaRutura?: string;
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>();

  // Usar dados do contexto se disponíveis, senão props
  const ruturas = useMemo(() => 
    contextRuturas.length > 0 ? contextRuturas : (propRuturas || []), 
    [contextRuturas, propRuturas]
  );

  // Dados filtrados e ordenados por data (mais antiga para mais nova)
  const filteredRuturas = useMemo(() => {
    if (!ruturas || ruturas.length === 0) return [];

    const filtered = ruturas.filter(rutura => {
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
      const tipologiaMatch = !filters.tipologia_rutura || filters.tipologia_rutura === "__all__" || rutura.tipologia_rutura === filters.tipologia_rutura;
      
      // Filtro por hora da rutura (14h ou 18h)
      const horaMatch = !filters.horaRutura || filters.horaRutura === "__all__" || 
        (filters.horaRutura === "14h" && rutura.hora_rutura?.includes("14h")) ||
        (filters.horaRutura === "18h" && rutura.hora_rutura?.includes("18h"));
      
      // Filtro por data selecionada no calendário (range ou data única)
      let dateMatch = true;
      if (selectedDateRange?.from) {
        const ruturaDate = new Date(rutura.data);
        const fromDate = new Date(selectedDateRange.from);
        const toDate = selectedDateRange.to ? new Date(selectedDateRange.to) : fromDate;
        
        // Comparar apenas as datas, ignorando o horário
        const ruturaDateOnly = new Date(ruturaDate.getFullYear(), ruturaDate.getMonth(), ruturaDate.getDate());
        const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
        
        dateMatch = ruturaDateOnly >= fromDateOnly && ruturaDateOnly <= toDateOnly;
      }

      return searchMatch && sectionMatch && productMatch && tipologiaMatch && horaMatch && dateMatch;
    });

    // Ordenar por data (mais antiga para mais nova)
    return filtered.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [ruturas, searchTerm, searchColumn, filters, selectedDateRange]);

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
        tipologias: [],
      };
    }
    
    return {
      secoes: Array.from(new Set(ruturas.map(r => r.secao).filter(Boolean))),
      tipos_produto: Array.from(new Set(ruturas.map(r => r.tipo_produto).filter(Boolean))),
      tipologias: Array.from(new Set(ruturas.map(r => r.tipologia_rutura).filter(Boolean))),
    };
  }, [ruturas]);

  const exportData = (type: 'csv' | 'excel' | 'pdf') => {
    if (filteredRuturas.length === 0) {
      alert('Nenhum dado disponível para exportar');
      return;
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ruturas_${timestamp}`;
    
    switch (type) {
      case 'csv':
      case 'excel': {
        // Criar arquivo CSV/Excel com dados completos
        const headers = [
          'Data', 'Seção', 'Tipo Requisição', 'OT', 'REQ', 
          'Tipo Produto', 'Número Produto', 'Descrição', 'Qtd Req', 'Qtd Env', 
          'Qtd Falta', 'Un Med', 'Stock CT', 'Stock FF', 'Em Trânsito FF'
        ];

        const csvRows = [headers.join(',')];
        
        filteredRuturas.forEach(rutura => {
          const row = [
            formatDate(rutura.data),
            `"${rutura.secao || ''}"`,
            `"${rutura.tipo_requisicao || ''}"`,
            rutura.ot || '',
            rutura.req || '',
            `"${rutura.tipo_produto || ''}"`,
            rutura.numero_produto || '',
            `"${(rutura.descricao || '').replace(/"/g, '""')}"`, // Escapar aspas duplas
            rutura.qtd_req || 0,
            rutura.qtd_env || 0,
            rutura.qtd_falta || 0,
            rutura.un_med || '',
            rutura.stock_ct || 0,
            rutura.stock_ff || 0,
            rutura.em_transito_ff || 0
          ];
          csvRows.push(row.join(','));
        });

        const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM UTF-8 para Excel
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        break;
      }
      case 'pdf':
        handlePrint();
        break;
    }
  };

  const handlePrint = () => {
    // Criar conteúdo formatado apenas da tabela de dados para impressão
    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Ruturas - ${new Date().toLocaleDateString('pt-BR')}</title>
          <style>
            @page { 
              size: A4 landscape; 
              margin: 1cm; 
            }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 10px; 
              margin: 0; 
              padding: 0;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 18px;
              color: #000;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 12px;
              color: #666;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 0 auto;
            }
            th, td { 
              border: 1px solid #000; 
              padding: 6px 4px; 
              text-align: left; 
              vertical-align: top;
              word-wrap: break-word;
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
              font-size: 9px;
              text-align: center;
            }
            td {
              font-size: 8px;
              max-width: 150px;
            }
            .date-col { width: 70px; }
            .time-col { width: 50px; }
            .section-col { width: 100px; }
            .ot-col, .req-col { width: 60px; }
            .product-col { width: 80px; }
            .desc-col { width: 200px; }
            .qty-col { width: 60px; }
            .tipologia-col { width: 100px; }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 8px;
              color: #666;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            @media print {
              body { print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Dados de Ruturas</h1>
            <p>Data de Geração: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Total de Registros: ${filteredRuturas.length}</p>
            ${selectedDateRange?.from ? `<p>Filtro Aplicado: ${
              selectedDateRange.to && selectedDateRange.from !== selectedDateRange.to
                ? `Período de ${format(selectedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até ${format(selectedDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                : `Data específica - ${format(selectedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })}`
            }</p>` : ''}
          </div>
          
          <table>
            <thead>
              <tr>
                <th class="date-col">Data</th>
                <th class="section-col">Seção</th>
                <th class="ot-col">OT</th>
                <th class="req-col">REQ</th>
                <th class="product-col">Nº Produto</th>
                <th class="desc-col">Descrição</th>
                <th class="qty-col">Qtd Req</th>
                <th class="qty-col">Qtd Env</th>
                <th class="qty-col">Qtd Falta</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRuturas.map(rutura => `
                <tr>
                  <td class="date-col">${formatDate(rutura.data)}</td>
                  <td class="section-col">${rutura.secao}</td>
                  <td class="ot-col">${rutura.ot}</td>
                  <td class="req-col">${rutura.req}</td>
                  <td class="product-col">${rutura.numero_produto}</td>
                  <td class="desc-col">${rutura.descricao.length > 50 ? rutura.descricao.substring(0, 50) + '...' : rutura.descricao}</td>
                  <td class="qty-col">${rutura.qtd_req}</td>
                  <td class="qty-col">${rutura.qtd_env}</td>
                  <td class="qty-col">${rutura.qtd_falta} ${rutura.un_med}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Sistema de Gestão de Ruturas - Relatório gerado automaticamente</p>
          </div>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
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
        <Card className="w-full max-w-none">
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
    <div className="w-full max-w-none space-y-6">
      {/* Cabeçalho com estatísticas */}
      <div className="w-full">
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
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Busca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
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
          <div className="space-y-3">
            {/* Indicador de Filtro Ativo */}
            {selectedDateRange?.from && (
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Filtro de Data Ativo:</strong> {
                    selectedDateRange.to && selectedDateRange.from !== selectedDateRange.to
                      ? `${format(selectedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })} até ${format(selectedDateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                      : format(selectedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                  }
                </p>
              </div>
            )}

            {/* Todos os filtros em uma linha */}
            <div className="grid grid-cols-6 gap-2">
              {/* Seletor de Data via Calendário */}
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button 
                    variant={selectedDateRange?.from ? "default" : "outline"} 
                    className="h-8 justify-start text-left font-normal text-xs"
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {selectedDateRange?.from ? (
                      selectedDateRange.to && selectedDateRange.from !== selectedDateRange.to
                        ? `${format(selectedDateRange.from, 'dd/MM', { locale: ptBR })} - ${format(selectedDateRange.to, 'dd/MM', { locale: ptBR })}`
                        : format(selectedDateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                    ) : "Data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={selectedDateRange}
                    onSelect={(range) => {
                      setSelectedDateRange(range);
                      // Fechar o popover apenas se uma data ou range completo foi selecionado
                      if (range?.from && (!range.to || range.from === range.to)) {
                        // Para data única, fechar após seleção
                        setTimeout(() => setShowCalendar(false), 100);
                      } else if (range?.from && range.to) {
                        // Para range completo, fechar após seleção
                        setTimeout(() => setShowCalendar(false), 100);
                      }
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Select value={filters.secao || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, secao: value === "__all__" ? undefined : value }))}>
                <SelectTrigger className="h-8 text-xs">
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Dep" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os dep.</SelectItem>
                  {uniqueValues.tipos_produto.filter(tipo => tipo && tipo.trim() !== '').map(tipo => (
                    <SelectItem key={`dep-${tipo}`} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.horaRutura || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, horaRutura: value === "__all__" ? undefined : value }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as horas</SelectItem>
                  <SelectItem value="14h">Rutura 14h</SelectItem>
                  <SelectItem value="18h">Rutura 18h</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.tipologia_rutura || "__all__"} onValueChange={(value) => setFilters(prev => ({ ...prev, tipologia_rutura: value === "__all__" ? undefined : value }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tipologias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as tipologias</SelectItem>
                  {uniqueValues.tipologias.filter(tipo => tipo && tipo.trim() !== '').map(tipo => (
                    <SelectItem key={`tip-${tipo}`} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botão Limpar Filtros na mesma linha */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFilters({});
                  setSelectedDateRange(undefined);
                  setSearchTerm('');
                }}
                className="h-8 px-3 text-xs"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="w-full max-w-none">
        <CardContent className="p-0">
          <div className="w-full">
            <table className="w-full table-fixed text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-center p-1 font-medium text-gray-900 w-16">Data</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-16">Seção</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Tipo<br/>Req</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-20">OT</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-16">REQ</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-16">Tipo<br/>Produto</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-16">Nº<br/>Produto</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-24">Descrição</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Qtd<br/>Req</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Qtd<br/>Env</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Qtd<br/>Falta</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-10">Un<br/>Med</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Stock<br/>CT</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Stock<br/>FF</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-12">Em<br/>Trânsito</th>
                  <th className="text-center p-1 font-medium text-gray-900 w-10">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRuturas.map((rutura, index) => (
                  <tr key={rutura.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{formatDate(rutura.data)}</td>
                    <td className="p-1 text-gray-900 font-medium text-center text-xs leading-tight">
                      <div className="flex flex-col items-center">
                        {rutura.secao.split(' ').map((palavra, idx) => (
                          <span key={idx} className="text-xs leading-3">{palavra}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-1 text-gray-700 text-center text-xs leading-tight" title={rutura.tipo_requisicao}>
                      {rutura.tipo_requisicao.length > 6 ? `${rutura.tipo_requisicao.substring(0,6)}...` : rutura.tipo_requisicao}
                    </td>
                    <td className="p-1 text-blue-600 font-mono text-center text-xs leading-tight" title={rutura.ot}>{rutura.ot}</td>
                    <td className="p-1 text-blue-600 font-mono text-center text-xs leading-tight" title={rutura.req}>{rutura.req}</td>
                    <td className="p-1 text-gray-700 text-center text-xs leading-tight" title={rutura.tipo_produto}>
                      <div className="flex flex-col items-center">
                        {rutura.tipo_produto.split(' ').slice(0, 2).map((palavra, idx) => (
                          <span key={idx} className="text-xs leading-3">{palavra}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-1 text-gray-900 font-mono text-center text-xs leading-tight" title={rutura.numero_produto}>{rutura.numero_produto}</td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight" title={rutura.descricao}>
                      {rutura.descricao.length > 20 ? `${rutura.descricao.substring(0, 20)}...` : rutura.descricao}
                    </td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{rutura.qtd_req}</td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{rutura.qtd_env}</td>
                    <td className="p-1 text-red-600 text-center font-medium text-xs leading-tight">{rutura.qtd_falta}</td>
                    <td className="p-1 text-gray-700 text-center text-xs leading-tight">{rutura.un_med}</td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{rutura.stock_ct}</td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{rutura.stock_ff}</td>
                    <td className="p-1 text-gray-900 text-center text-xs leading-tight">{rutura.em_transito_ff}</td>
                    <td className="p-1 text-center">
                      <Button
                        onClick={() => setSelectedRutura(rutura)}
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                      >
                        <Eye className="h-3 w-3" />
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
