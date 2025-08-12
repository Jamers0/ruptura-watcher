export interface Rutura {
  id?: string;
  semana: string; // Calculada automaticamente baseada na data
  hora_rutura: string; // "Rutura 14h" ou "Rutura 18h"
  hora_da_rutura: string; // Hora + tipologia
  secao: string; // Seção que fez a requisição
  tipo_requisicao: string; // NORMAL, EXTRA
  ot: string; // Ordem de Transferência
  req: string; // Número de Requisição
  tipo_produto: string; // Secos, Congelados, Refrigerados, etc.
  numero_produto: string; // Código do produto
  descricao: string; // Nome/descrição do produto
  qtd_req: number; // Quantidade solicitada
  qtd_env: number; // Quantidade enviada
  qtd_falta: number; // Quantidade em falta
  un_med: string; // Unidade de medida (KG, L, UN, RL)
  data: string; // Data da requisição (DD/MM/YYYY)
  stock_ct: number; // Estoque CateringPor
  stock_ff: number; // Estoque Frigofril
  em_transito_ff: number; // Em trânsito FF para CT
  tipologia_rutura: string; // Tipo de rutura
  aba_origem?: string; // '14H' ou '18H'
  created_at?: string;
  updated_at?: string;
}

// Tipos para análise de dados
export interface RuturaAnalytics {
  totalRuturas: number;
  valorTotalFalta: number;
  produtosUnicos: number;
  secoesUnicas: number;
  ruturasPorSemana: Record<string, number>;
  ruturasPorTipo: Record<string, number>;
  topProdutos: Array<{ produto: string; quantidade: number }>;
  topSecoes: Array<{ secao: string; quantidade: number }>;
}

// Filtros para pesquisa
export interface FiltrosRutura {
  semana?: string;
  secao?: string;
  tipoRequisicao?: string;
  tipoProduto?: string;
  numeroProduto?: string;
  tipologiaRutura?: string;
  dataInicio?: string;
  dataFim?: string;
  abaOrigem?: string;
}

export interface DashboardStats {
  totalRuturas: number;
  valorTotal: number;
  secoesAfetadas: number;
  ruturasHoje: number;
}

export interface ChartData {
  name: string;
  value: number;
  fullName?: string;
  percentual?: number;
}

// Tipos para tabela de dados
export interface DataTableProps {
  ruturas: Rutura[];
  onRefresh: () => void;
}

export interface ImportDataProps {
  onDataImported: () => void;
}

export interface DashboardProps {
  ruturas: Rutura[];
}

// Tipos utilitários
export type TipologiaRutura =
  | "Sem Stock Físico e BC"
  | "A pedir à FF"
  | "Produto Descontinuado"
  | "Falta de Espaço"
  | "Produto Sazonal"
  | "Outros";

export type TipoRequisicao = "NORMAL" | "EXTRA";

export type UnidadeMedida = "KG" | "L" | "UN" | "RL" | "CX" | "PC" | "N/D";

export type StatusRutura = "ATIVA" | "RESOLVIDA" | "PENDENTE" | "CANCELADA";
