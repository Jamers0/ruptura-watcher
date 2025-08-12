import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Rutura } from '@/lib/types';
import { LocalStorageManager } from '@/lib/localStorage';

interface DataContextType {
  ruturas: Rutura[];
  dadosOriginais: Rutura[];
  filtros: {
    aba?: '14H' | '18H' | 'TODOS';
    secao?: string;
    dataInicio?: string;
    dataFim?: string;
  };
  setRuturas: (dados: Rutura[]) => void;
  adicionarRuturas: (novosDados: Rutura[]) => void;
  limparDados: () => void;
  recarregarDoLocalStorage: () => void;
  aplicarFiltros: (filtros: Partial<{
    aba?: '14H' | '18H' | 'TODOS';
    secao?: string;
    dataInicio?: string;
    dataFim?: string;
  }>) => void;
  estatisticas: {
    total: number;
    dados14H: number;
    dados18H: number;
    secoesUnicas: number;
    produtosUnicos: number;
  };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de um DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider = ({ children }: DataProviderProps) => {
  const [dadosOriginais, setDadosOriginais] = useState<Rutura[]>([]);
  const [ruturas, setRuturasState] = useState<Rutura[]>([]);
  const [filtros, setFiltros] = useState({
    aba: 'TODOS' as '14H' | '18H' | 'TODOS',
    secao: undefined as string | undefined,
    dataInicio: undefined as string | undefined,
    dataFim: undefined as string | undefined,
  });

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const carregarDados = () => {
      console.log('🔄 Tentando carregar dados do localStorage...');
      const dadosSalvos = LocalStorageManager.loadData();
      console.log('🔍 Dados encontrados no localStorage:', dadosSalvos.length, 'registros');
      
      if (dadosSalvos.length > 0) {
        console.log('📥 Carregando dados no contexto...');
        setDadosOriginais(dadosSalvos);
        const dadosFiltrados = aplicarFiltrosInternos(dadosSalvos, filtros);
        setRuturasState(dadosFiltrados);
        console.log('✅ Dados carregados automaticamente:', dadosSalvos.length, 'registros');
        console.log('🎯 Dados filtrados:', dadosFiltrados.length, 'registros');
      } else {
        console.log('📭 Nenhum dado encontrado no localStorage');
      }
    };
    
    carregarDados();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aplicarFiltrosInternos = (dados: Rutura[], filtrosAtivos: typeof filtros) => {
    let dadosFiltrados = [...dados];

    // Filtro por aba
    if (filtrosAtivos.aba && filtrosAtivos.aba !== 'TODOS') {
      dadosFiltrados = dadosFiltrados.filter(r => r.aba_origem === filtrosAtivos.aba);
    }

    // Filtro por seção
    if (filtrosAtivos.secao) {
      dadosFiltrados = dadosFiltrados.filter(r => 
        r.secao.toLowerCase().includes(filtrosAtivos.secao!.toLowerCase())
      );
    }

    // Filtro por data
    if (filtrosAtivos.dataInicio) {
      dadosFiltrados = dadosFiltrados.filter(r => r.data >= filtrosAtivos.dataInicio!);
    }

    if (filtrosAtivos.dataFim) {
      dadosFiltrados = dadosFiltrados.filter(r => r.data <= filtrosAtivos.dataFim!);
    }

    return dadosFiltrados;
  };

  const setRuturas = (dados: Rutura[]) => {
    console.log('💾 setRuturas chamado com', dados.length, 'registros');
    setDadosOriginais(dados);
    const dadosFiltrados = aplicarFiltrosInternos(dados, filtros);
    setRuturasState(dadosFiltrados);
    
    // Salvar no localStorage usando o manager
    const salvou = LocalStorageManager.saveData(dados);
    console.log('💾 Resultado do salvamento:', salvou ? 'SUCESSO' : 'FALHA');
  };

  const adicionarRuturas = (novosDados: Rutura[]) => {
    console.log('➕ adicionarRuturas chamado com', novosDados.length, 'novos registros');
    const todosOsDados = [...dadosOriginais, ...novosDados];
    console.log('📊 Total de dados após adição:', todosOsDados.length, 'registros');
    setDadosOriginais(todosOsDados);
    const dadosFiltrados = aplicarFiltrosInternos(todosOsDados, filtros);
    setRuturasState(dadosFiltrados);
    
    // Salvar no localStorage usando o manager
    const salvou = LocalStorageManager.saveData(todosOsDados);
    console.log('💾 Resultado do salvamento:', salvou ? 'SUCESSO' : 'FALHA');
  };

  const limparDados = () => {
    setDadosOriginais([]);
    setRuturasState([]);
    // Limpar usando o manager
    LocalStorageManager.clearData();
  };

  const recarregarDoLocalStorage = () => {
    const dadosSalvos = LocalStorageManager.loadData();
    if (dadosSalvos.length > 0) {
      setDadosOriginais(dadosSalvos);
      const dadosFiltrados = aplicarFiltrosInternos(dadosSalvos, filtros);
      setRuturasState(dadosFiltrados);
    }
  };

  const aplicarFiltros = (novosFiltros: Partial<typeof filtros>) => {
    const filtrosAtualizados = { ...filtros, ...novosFiltros };
    setFiltros(filtrosAtualizados);
    const dadosFiltrados = aplicarFiltrosInternos(dadosOriginais, filtrosAtualizados);
    setRuturasState(dadosFiltrados);
  };

  // Calcular estatísticas
  const estatisticas = {
    total: dadosOriginais.length,
    dados14H: dadosOriginais.filter(r => r.aba_origem === '14H').length,
    dados18H: dadosOriginais.filter(r => r.aba_origem === '18H').length,
    secoesUnicas: new Set(dadosOriginais.map(r => r.secao)).size,
    produtosUnicos: new Set(dadosOriginais.map(r => r.numero_produto)).size,
  };

  return (
    <DataContext.Provider value={{
      ruturas,
      dadosOriginais,
      filtros,
      setRuturas,
      adicionarRuturas,
      limparDados,
      recarregarDoLocalStorage,
      aplicarFiltros,
      estatisticas
    }}>
      {children}
    </DataContext.Provider>
  );
};
