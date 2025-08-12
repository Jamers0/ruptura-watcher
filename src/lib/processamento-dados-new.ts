import { Rutura, RuturaAnalytics } from './types';

/**
 * Calcula a semana do mês baseada na data
 * @param data Data em diferentes formatos
 * @returns String no formato "1ª Semana de Abril"
 */
export function calcularSemanaDoMes(data: string | number | Date | null | undefined): string {
  try {
    // Converter para string e tratar valores nulos
    const dataStr = String(data || '').trim();
    
    // Se vazio ou null, retorna string vazia
    if (!dataStr || dataStr === 'null' || dataStr === 'undefined' || dataStr === '') {
      return '';
    }
    
    // Se a data já contém "Semana", retorna como está
    if (dataStr.includes('Semana')) {
      return dataStr;
    }

    // Tentar diferentes formatos de data
    let dataObj: Date;
    
    // Primeiro tentar DD/MM/YYYY
    if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const num1 = parseInt(partes[0]);
        const num2 = parseInt(partes[1]);
        const ano = parseInt(partes[2]);
        
        // Se o primeiro número for maior que 12, assumir DD/MM/YYYY
        if (num1 > 12 || num2 <= 12) {
          dataObj = new Date(ano, num2 - 1, num1);
        } else {
          // Caso contrário, assumir MM/DD/YYYY
          dataObj = new Date(ano, num1 - 1, num2);
        }
      } else {
        throw new Error('Formato de data inválido');
      }
    } else if (dataStr.includes('-')) {
      // Formato YYYY-MM-DD ou DD-MM-YYYY
      const partes = dataStr.split('-');
      if (partes.length === 3) {
        if (partes[0].length === 4) {
          // YYYY-MM-DD
          dataObj = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        } else {
          // DD-MM-YYYY
          dataObj = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        }
      } else {
        throw new Error('Formato de data inválido');
      }
    } else {
      // Tentar parsing direto
      dataObj = new Date(dataStr);
    }

    if (isNaN(dataObj.getTime())) {
      throw new Error('Data inválida');
    }

    const mes = dataObj.getMonth();
    const dia = dataObj.getDate();
    
    // Calcular a semana do mês
    const primeiroDiaDoMes = new Date(dataObj.getFullYear(), mes, 1);
    const diasPassados = Math.floor((dataObj.getTime() - primeiroDiaDoMes.getTime()) / (1000 * 60 * 60 * 24));
    const semanaDoMes = Math.floor(diasPassados / 7) + 1;
    
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    const ordinais = ['1ª', '2ª', '3ª', '4ª', '5ª'];
    const ordinal = ordinais[semanaDoMes - 1] || `${semanaDoMes}ª`;
    
    return `${ordinal} Semana de ${meses[mes]}`;
  } catch (error) {
    console.error('Erro ao calcular semana:', error);
    return '';
  }
}

/**
 * Converte data para formato padrão DD/MM/YYYY
 */
export function formatarData(data: string | number | Date | null | undefined): string {
  try {
    const dataStr = String(data || '').trim();
    
    if (!dataStr || dataStr === 'null' || dataStr === 'undefined' || dataStr === '') {
      return '';
    }
    
    // Se já está no formato correto DD/MM/YYYY
    if (dataStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dataStr;
    }
    
    // Se está no formato MM/DD/YYYY ou DD/MM/YYYY
    if (dataStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const partes = dataStr.split('/');
      const mes = partes[0].padStart(2, '0');
      const dia = partes[1].padStart(2, '0');
      const ano = partes[2];
      
      // Verificar se é MM/DD ou DD/MM baseado no valor
      if (parseInt(partes[0]) > 12) {
        return `${partes[0].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${ano}`;
      } else {
        return `${dia}/${mes}/${ano}`;
      }
    }
    
    // Tentar converter de outros formatos
    const dataObj = new Date(dataStr);
    if (!isNaN(dataObj.getTime())) {
      const dia = dataObj.getDate().toString().padStart(2, '0');
      const mes = (dataObj.getMonth() + 1).toString().padStart(2, '0');
      const ano = dataObj.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    
    return dataStr;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return String(data || '');
  }
}

/**
 * Processa dados brutos do CSV/Excel
 */
export function processarDadosRutura(dadosBrutos: Record<string, unknown>[], abaOrigem: string): Rutura[] {
  return dadosBrutos.map((linha, index) => {
    try {
      // Mapear campos do CSV para nossa interface
      const dataFormatada = formatarData(linha['Data'] as string || linha['data'] as string || '');
      const semanaCalculada = calcularSemanaDoMes(dataFormatada);
      
      const rutura: Rutura = {
        id: `${abaOrigem}-${index}-${Date.now()}`,
        semana: semanaCalculada,
        hora_rutura: String(linha['Hora'] || linha['hora'] || abaOrigem),
        hora_da_rutura: String(linha['Hora da Rutura'] || linha['hora_da_rutura'] || ''),
        secao: String(linha['Seção'] || linha['Secao'] || linha['secao'] || linha['Departamento'] || ''),
        tipo_requisicao: String(linha['Tipo Requisição'] || linha['tipo_requisicao'] || 'NORMAL'),
        ot: String(linha['OT'] || linha['ot'] || ''),
        req: String(linha['REQ'] || linha['req'] || linha['Requisição'] || ''),
        tipo_produto: String(linha['Tipo Produto'] || linha['tipo_produto'] || linha['Departamento'] || ''),
        numero_produto: String(linha['Nº Produto'] || linha['numero_produto'] || linha['Código'] || ''),
        descricao: String(linha['Descrição'] || linha['descricao'] || linha['Produto'] || ''),
        qtd_req: Number(linha['Qtd Req'] || linha['qtd_req'] || linha['Quantidade'] || 0),
        qtd_env: Number(linha['Qtd Env'] || linha['qtd_env'] || linha['Enviado'] || 0),
        qtd_falta: Number(linha['Qtd Falta'] || linha['qtd_falta'] || linha['Falta'] || 0),
        un_med: String(linha['Un Med'] || linha['un_med'] || linha['Unidade'] || 'UN'),
        data: dataFormatada,
        stock_ct: Number(linha['Stock CT'] || linha['stock_ct'] || 0),
        stock_ff: Number(linha['Stock FF'] || linha['stock_ff'] || 0),
        em_transito_ff: Number(linha['Em Transito FF'] || linha['em_transito_ff'] || 0),
        tipologia_rutura: String(linha['Tipologia Rutura'] || linha['tipologia_rutura'] || linha['Tipo'] || ''),
        aba_origem: abaOrigem,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return rutura;
    } catch (error) {
      console.error(`Erro ao processar linha ${index}:`, error);
      // Retorna um objeto básico em caso de erro
      return {
        id: `${abaOrigem}-${index}-${Date.now()}-error`,
        semana: '',
        hora_rutura: abaOrigem,
        hora_da_rutura: '',
        secao: '',
        tipo_requisicao: 'NORMAL',
        ot: '',
        req: '',
        tipo_produto: '',
        numero_produto: '',
        descricao: 'Erro no processamento',
        qtd_req: 0,
        qtd_env: 0,
        qtd_falta: 0,
        un_med: 'UN',
        data: '',
        stock_ct: 0,
        stock_ff: 0,
        em_transito_ff: 0,
        tipologia_rutura: '',
        aba_origem: abaOrigem,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Rutura;
    }
  });
}

/**
 * Calcula analytics dos dados de rutura
 */
export function calcularAnalytics(ruturas: Rutura[]): RuturaAnalytics {
  const totalRuturas = ruturas.length;
  const valorTotalFalta = ruturas.reduce((sum, r) => sum + (r.qtd_falta * 1), 0); // Assumindo valor unitário de €1
  
  const produtosUnicos = new Set(ruturas.map(r => r.numero_produto).filter(Boolean)).size;
  const secoesUnicas = new Set(ruturas.map(r => r.secao).filter(Boolean)).size;
  
  // Dados para gráficos
  const ruturasPorSemana = ruturas.reduce((acc, r) => {
    const semana = r.semana || 'Sem dados';
    acc[semana] = (acc[semana] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ruturasPorTipo = ruturas.reduce((acc, r) => {
    const tipo = r.tipo_produto || 'Outros';
    acc[tipo] = (acc[tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topProdutos = Object.entries(
    ruturas.reduce((acc, r) => {
      const produto = r.descricao || r.numero_produto || 'Produto sem nome';
      acc[produto] = (acc[produto] || 0) + r.qtd_falta;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([produto, quantidade]) => ({ produto, quantidade }));

  const topSecoes = Object.entries(
    ruturas.reduce((acc, r) => {
      const secao = r.secao || 'Seção não informada';
      acc[secao] = (acc[secao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([secao, quantidade]) => ({ secao, quantidade }));

  return {
    totalRuturas,
    valorTotalFalta,
    produtosUnicos,
    secoesUnicas,
    ruturasPorSemana,
    ruturasPorTipo,
    topProdutos,
    topSecoes
  };
}

/**
 * Valida uma rutura
 */
export function validarRutura(rutura: Partial<Rutura>): boolean {
  try {
    // Validações básicas
    if (!rutura.numero_produto && !rutura.descricao) {
      return false;
    }
    
    if (!rutura.secao) {
      return false;
    }
    
    // Validar quantidades
    if (rutura.qtd_req !== undefined && rutura.qtd_req < 0) {
      return false;
    }
    
    if (rutura.qtd_falta !== undefined && rutura.qtd_falta < 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erro na validação:', error);
    return false;
  }
}
