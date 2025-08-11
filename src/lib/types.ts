export interface Rutura {
  id?: string;
  semana: string;
  hora_rutura: string;
  hora_da_rutura: string;
  secao: string;
  tipo_requisicao: string;
  ot: string;
  req: string;
  tipo_produto: string;
  numero_produto: string;
  descricao: string;
  qtd_req: number;
  qtd_env: number;
  qtd_falta: number;
  un_med: string;
  data: string; // Formato ISO ou DD/MM/YYYY
  data_requisicao?: string;
  stock_ct: number;
  stock_ff: number;
  em_transito_ff: number;
  tipologia_rutura: string;
  aba_origem?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardStats {
  totalRuturas: number;
  ruturasAtivas: number;
  valorTotal: number;
  taxaResolucao: number;
  secoesAfetadas: number;
  ruturasHoje: number;
}

export interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

export interface FilterOptions {
  semana?: string[];
  secao?: string[];
  tipoRequisicao?: string[];
  tipoProduto?: string[];
  tipologiaRutura?: string[];
  dataInicio?: string;
  dataFim?: string;
}

export interface ExcelImportResult {
  data: Rutura[];
  errors: string[];
  warnings: string[];
}

export type TipologiaRutura = 
  | "Sem Stock Físico e BC"
  | "Acerto de Inventário"
  | "A pedir à FF"
  | "Em Transferência da FF"
  | "Stock Insuficiente"
  | "Produto Descontinuado";

export type TipoRequisicao = "NORMAL" | "EXTRA";

export type UnidadeMedida = "KG" | "L" | "UN" | "RL" | "CX" | "PC";