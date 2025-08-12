import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileDown, 
  FileSpreadsheet, 
  Printer, 
  CalendarIcon, 
  FileText,
  BarChart3,
  PieChart,
  Eye,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Rutura } from '@/lib/types';
import { useData } from '@/contexts/DataContext';

interface ReportsComponentProps {
  ruturas: Rutura[];
}

interface QuickTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  sections: string[];
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'executive',
    name: 'Relatório Executivo',
    description: 'Resumo executivo com KPIs principais',
    icon: <BarChart3 className="h-4 w-4" />,
    sections: ['summary', 'kpis', 'trends']
  },
  {
    id: 'complete',
    name: 'Relatório Completo',
    description: 'Análise detalhada de todas as ruturas',
    icon: <FileText className="h-4 w-4" />,
    sections: ['summary', 'kpis', 'trends', 'products', 'sections', 'details']
  },
  {
    id: 'visual',
    name: 'Relatório Visual',
    description: 'Foco em gráficos e visualizações',
    icon: <PieChart className="h-4 w-4" />,
    sections: ['summary', 'charts', 'trends']
  }
];

export function ReportsComponent({ ruturas }: ReportsComponentProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { adicionarRuturas } = useData();

  // Função para gerar dados de exemplo para teste
  const generateSampleData = (): Rutura[] => {
    const today = new Date();
    const sampleData: Rutura[] = [];
    
    for (let i = 0; i < 10; i++) {
      const horaRutura = i < 5 ? '14' : '18';
      sampleData.push({
        semana: `${Math.ceil((today.getDate() + i) / 7)}ª Semana`,
        hora_rutura: horaRutura,
        hora_da_rutura: `Rutura ${horaRutura}h`,
        secao: ['Seção A', 'Seção B', 'Seção C'][i % 3],
        tipo_requisicao: 'Normal',
        ot: `OT${1000 + i}`,
        req: `REQ${2000 + i}`,
        tipo_produto: 'Produto Tipo A',
        numero_produto: `${3000 + i}`,
        descricao: `Produto Exemplo ${i + 1}`,
        qtd_req: 10 + i,
        qtd_env: 5 + i,
        qtd_falta: Math.max(0, 5 - (i % 3)),
        un_med: 'UN',
        data: format(new Date(today.getTime() + i * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        stock_ct: 100 + i * 10,
        stock_ff: 50 + i * 5,
        em_transito_ff: i * 2,
        tipologia_rutura: ['Falta de Stock', 'Produto Bloqueado', 'Em Trânsito'][i % 3],
        aba_origem: i < 5 ? '14H' : '18H'
      });
    }
    
    return sampleData;
  };

  // Funções de análise
  const analyzeBySection = (data: Rutura[]) => {
    const sectionCounts = data.reduce((acc, rutura) => {
      acc[rutura.secao] = (acc[rutura.secao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(sectionCounts)
      .map(([secao, total]) => ({
        secao,
        total,
        percentual: ((total / data.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total);
  };

  const analyzeByProducts = (data: Rutura[]) => {
    const productCounts = data.reduce((acc, rutura) => {
      const key = rutura.numero_produto;
      if (!acc[key]) {
        acc[key] = {
          codigo: rutura.numero_produto,
          descricao: rutura.descricao,
          total: 0
        };
      }
      acc[key].total += 1;
      return acc;
    }, {} as Record<string, { codigo: string; descricao: string; total: number }>);

    return Object.values(productCounts)
      .sort((a, b) => b.total - a.total);
  };

  const calculateStats = (data: Rutura[]) => {
    const secoesUnicas = new Set(data.map(r => r.secao)).size;
    const produtosUnicos = new Set(data.map(r => r.numero_produto)).size;
    const ruturasResolvidas = data.filter(r => r.qtd_falta === 0).length;
    const taxaResolucao = data.length > 0 ? Math.round((ruturasResolvidas / data.length) * 100) : 0;

    return {
      secoesUnicas,
      produtosUnicos,
      taxaResolucao
    };
  };

  const generateCSVContent = (data: Rutura[]) => {
    const headers = [
      'Semana', 'Hora Rutura', 'Seção', 'Tipo Requisição', 'OT', 'REQ',
      'Tipo Produto', 'Número Produto', 'Descrição', 'Qtd Req', 'Qtd Env',
      'Qtd Falta', 'Un Med', 'Data', 'Stock CT', 'Stock FF', 'Em Trânsito FF',
      'Tipologia Rutura'
    ];

    const csvRows = [headers.join(',')];
    
    data.forEach(rutura => {
      const row = [
        rutura.semana,
        rutura.hora_rutura,
        `"${rutura.secao}"`,
        rutura.tipo_requisicao,
        rutura.ot,
        rutura.req,
        `"${rutura.tipo_produto}"`,
        rutura.numero_produto,
        `"${rutura.descricao}"`,
        rutura.qtd_req,
        rutura.qtd_env,
        rutura.qtd_falta,
        rutura.un_med,
        rutura.data,
        rutura.stock_ct,
        rutura.stock_ff,
        rutura.em_transito_ff,
        `"${rutura.tipologia_rutura}"`
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const generateReportHTML = (template: string, data: Rutura[], date: Date) => {
    const templateData = QUICK_TEMPLATES.find(t => t.id === template);
    const stats = calculateStats(data);
    
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório de Ruturas - ${format(date, 'dd/MM/yyyy', { locale: ptBR })}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: Arial, sans-serif; margin: 0; font-size: 12px; line-height: 1.4; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .stat-card { border: 1px solid #ddd; padding: 12px; border-radius: 6px; text-align: center; }
          .stat-value { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
          .stat-label { color: #666; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          @media print { 
            body { print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${templateData?.name || 'Relatório de Ruturas'}</h1>
          <p><strong>Data:</strong> ${format(date, 'dd/MM/yyyy', { locale: ptBR })}</p>
          <p><strong>Gerado em:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${data.length}</div>
            <div class="stat-label">Total de Ruturas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.secoesUnicas}</div>
            <div class="stat-label">Seções Afetadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.produtosUnicos}</div>
            <div class="stat-label">Produtos Afetados</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.taxaResolucao}%</div>
            <div class="stat-label">Taxa de Resolução</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Seção</th>
              <th>Produto</th>
              <th>Descrição</th>
              <th>Qtd Falta</th>
              <th>Tipologia</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            ${data.slice(0, 50).map(rutura => `
              <tr>
                <td>${rutura.secao}</td>
                <td>${rutura.numero_produto}</td>
                <td>${rutura.descricao.substring(0, 30)}...</td>
                <td>${rutura.qtd_falta} ${rutura.un_med}</td>
                <td>${rutura.tipologia_rutura}</td>
                <td>${rutura.hora_rutura}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${data.length > 50 ? `<p style="margin-top: 10px;"><em>... e mais ${data.length - 50} ruturas</em></p>` : ''}
      </body>
      </html>
    `;
  };

  const handleGeneratePDF = async () => {
    if (!selectedTemplate || !selectedDate) {
      alert('Por favor, selecione uma data e um template');
      return;
    }

    setIsGenerating(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const filteredRuturas = ruturas.filter(r => r.data === dateString);
      
      if (filteredRuturas.length === 0) {
        alert('Nenhuma rutura encontrada para a data selecionada');
        return;
      }
      
      const htmlContent = generateReportHTML(selectedTemplate, filteredRuturas, selectedDate);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExcel = async () => {
    if (!selectedDate) {
      alert('Por favor, selecione uma data');
      return;
    }

    setIsGenerating(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const filteredRuturas = ruturas.filter(r => r.data === dateString);
      
      if (filteredRuturas.length === 0) {
        alert('Nenhuma rutura encontrada para a data selecionada');
        return;
      }
      
      const csvContent = '\uFEFF' + generateCSVContent(filteredRuturas);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_ruturas_${format(selectedDate, 'dd-MM-yyyy')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      alert('Erro ao gerar arquivo Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate || !selectedDate) {
      alert('Por favor, selecione uma data e um template');
      return;
    }
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const filteredData = ruturas.filter(r => r.data === dateString);
    
    if (filteredData.length === 0) {
      alert(`Nenhuma rutura encontrada para ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}. Verifique se há dados importados para esta data.`);
      return;
    }
    
    setShowPreview(!showPreview);
  };

  const selectedTemplateData = QUICK_TEMPLATES.find(t => t.id === selectedTemplate);
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const filteredRuturas = dateString ? ruturas.filter(r => r.data === dateString) : [];
  const previewStats = calculateStats(filteredRuturas);

  // Debug: Log para verificar dados
  console.log('ReportsComponent Debug:', {
    totalRuturas: ruturas.length,
    selectedDate: selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Não selecionada',
    dateString,
    filteredCount: filteredRuturas.length,
    selectedTemplate
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Relatórios de Ruturas</h2>
        <p className="text-muted-foreground">Gere relatórios personalizados das ruturas</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Data do Relatório</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium">Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher template" />
                </SelectTrigger>
                <SelectContent>
                  {QUICK_TEMPLATES.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center space-x-2">
                        {template.icon}
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplateData && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{selectedTemplateData.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTemplateData.sections.map(section => (
                    <Badge key={section} variant="secondary" className="text-xs">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showPreview && selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Preview do Relatório</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-primary">{filteredRuturas.length}</div>
                    <div className="text-xs text-muted-foreground">Total Ruturas</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-green-600">{previewStats.taxaResolucao}%</div>
                    <div className="text-xs text-muted-foreground">Taxa Resolução</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-blue-600">{previewStats.secoesUnicas}</div>
                    <div className="text-xs text-muted-foreground">Seções</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded">
                    <div className="text-2xl font-bold text-orange-600">{previewStats.produtosUnicos}</div>
                    <div className="text-xs text-muted-foreground">Produtos</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gerar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handlePreview}
              variant="outline"
              disabled={!selectedDate || !selectedTemplate}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? 'Ocultar' : 'Preview'}
            </Button>
            
            <Button 
              onClick={handleGeneratePDF}
              disabled={!selectedDate || !selectedTemplate || isGenerating}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isGenerating ? 'Gerando...' : 'Gerar PDF'}
            </Button>
            
            <Button 
              onClick={handleGenerateExcel}
              variant="outline"
              disabled={!selectedDate || isGenerating}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isGenerating ? 'Gerando...' : 'Exportar Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
