import type { Rutura } from './types';

const STORAGE_KEY = 'ruptura_watcher_data';
const BACKUP_KEY = 'ruptura_watcher_backup';

interface DadosComprimidos {
  s: string;
  hr: string;
  hdr: string;
  sec: string;
  tr: string;
  ot: string;
  req: string;
  tp: string;
  np: string;
  desc: string;
  qr: number;
  qe: number;
  qf: number;
  um: string;
  d: string;
  dr: string;
  sct: number;
  sff: number;
  etf: number;
  tip: string;
  ab: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export class LocalStorageManager {
  /**
   * Comprime dados removendo campos desnecessários para economizar espaço
   */
  static comprimirDados(ruturas: Rutura[]): DadosComprimidos[] {
    return ruturas.map(rutura => ({
      s: rutura.semana,
      hr: rutura.hora_rutura,
      hdr: rutura.hora_da_rutura,
      sec: rutura.secao,
      tr: rutura.tipo_requisicao,
      ot: rutura.ot,
      req: rutura.req,
      tp: rutura.tipo_produto,
      np: rutura.numero_produto,
      desc: rutura.descricao,
      qr: rutura.qtd_req,
      qe: rutura.qtd_env,
      qf: rutura.qtd_falta,
      um: rutura.un_med,
      d: rutura.data,
      dr: rutura.data_requisicao,
      sct: rutura.stock_ct,
      sff: rutura.stock_ff,
      etf: rutura.em_transito_ff,
      tip: rutura.tipologia_rutura,
      ab: rutura.aba_origem
    }));
  }

  /**
   * Descomprime dados restaurando campos originais
   */
  static descomprimirDados(dadosComprimidos: (DadosComprimidos | Rutura)[]): Rutura[] {
    return dadosComprimidos.map((item, index) => {
      // Se já é um objeto Rutura completo, retorna como está
      if ('semana' in item) {
        return item as Rutura;
      }
      
      // Caso contrário, é um dado comprimido
      const itemComp = item as DadosComprimidos;
      return {
        id: itemComp.id || `local-${Date.now()}-${index}`,
        semana: itemComp.s,
        hora_rutura: itemComp.hr,
        hora_da_rutura: itemComp.hdr,
        secao: itemComp.sec,
        tipo_requisicao: itemComp.tr,
        ot: itemComp.ot,
        req: itemComp.req,
        tipo_produto: itemComp.tp,
        numero_produto: itemComp.np,
        descricao: itemComp.desc,
        qtd_req: itemComp.qr,
        qtd_env: itemComp.qe,
        qtd_falta: itemComp.qf,
        un_med: itemComp.um,
        data: itemComp.d,
        data_requisicao: itemComp.dr,
        stock_ct: itemComp.sct,
        stock_ff: itemComp.sff,
        em_transito_ff: itemComp.etf,
        tipologia_rutura: itemComp.tip,
        aba_origem: itemComp.ab,
        created_at: itemComp.created_at,
        updated_at: itemComp.updated_at
      };
    });
  }

  /**
   * Força o salvamento imediato dos dados com validação e compressão
   */
  static forcarSalvamento(ruturas: Rutura[]): boolean {
    try {
      console.log('🚀 FORÇANDO SALVAMENTO:', ruturas.length, 'registros');
      
      // Validar dados antes de salvar
      if (!Array.isArray(ruturas)) {
        console.error('❌ Dados não são um array válido');
        return false;
      }

      // Verificar se há muitos dados
      if (ruturas.length > 3000) {
        console.warn('⚠️ Muitos dados detectados, aplicando compressão...');
        return this.salvarComCompressao(ruturas);
      }
      
      // Limpar localStorage antes de salvar novos dados
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      
      // Criar estrutura de dados para salvar
      const dataToSave = {
        data: ruturas,
        timestamp: new Date().toISOString(),
        count: ruturas.length,
        version: '1.0'
      };
      
      const dataString = JSON.stringify(dataToSave);
      
      // Salvar dados
      localStorage.setItem(STORAGE_KEY, dataString);
      
      // Verificar se foi salvo corretamente
      const verificacao = localStorage.getItem(STORAGE_KEY);
      if (verificacao) {
        console.log('✅ SALVAMENTO FORÇADO CONCLUÍDO:', ruturas.length, 'registros');
        console.log('📊 Tamanho dos dados:', dataString.length, 'caracteres');
        return true;
      } else {
        console.error('❌ FALHA NA VERIFICAÇÃO DO SALVAMENTO');
        return false;
      }
    } catch (error) {
      console.error('❌ ERRO NO SALVAMENTO FORÇADO:', error);
      
      // Se falhou por quota, tentar com compressão
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.log('💾 Tentando salvamento com compressão...');
        return this.salvarComCompressao(ruturas);
      }
      
      return false;
    }
  }

  /**
   * Salva dados com compressão para economizar espaço
   */
  static salvarComCompressao(ruturas: Rutura[]): boolean {
    try {
      console.log('🗜️ COMPRIMINDO', ruturas.length, 'registros...');
      
      const dadosComprimidos = this.comprimirDados(ruturas);
      
      const dataToSave = {
        data: dadosComprimidos,
        timestamp: new Date().toISOString(),
        count: ruturas.length,
        version: '1.1',
        compressed: true
      };
      
      const dataString = JSON.stringify(dataToSave);
      console.log('📉 Tamanho após compressão:', dataString.length, 'caracteres');
      
      // Limpar localStorage antes
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      
      localStorage.setItem(STORAGE_KEY, dataString);
      
      const verificacao = localStorage.getItem(STORAGE_KEY);
      if (verificacao) {
        console.log('✅ SALVAMENTO COM COMPRESSÃO CONCLUÍDO');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ ERRO NO SALVAMENTO COM COMPRESSÃO:', error);
      return false;
    }
  }

  /**
   * Salva dados no localStorage com backup de segurança
   */
  static saveData(ruturas: Rutura[]): boolean {
    try {
      // Criar backup dos dados atuais antes de salvar novos
      const existingData = localStorage.getItem(STORAGE_KEY);
      if (existingData) {
        localStorage.setItem(BACKUP_KEY, existingData);
      }

      // Salvar novos dados
      const dataToSave = {
        data: ruturas,
        timestamp: new Date().toISOString(),
        count: ruturas.length
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('💾 Dados salvos no localStorage:', ruturas.length, 'registros');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar dados no localStorage:', error);
      return false;
    }
  }

  /**
   * Adiciona novos dados aos existentes, evitando duplicatas
   */
  static addData(novasRuturas: Rutura[]): boolean {
    try {
      const existingData = this.loadData();
      const combinedData = [...existingData, ...novasRuturas];
      
      // Remover duplicatas baseado em chave única
      const uniqueData = combinedData.reduce((acc, current) => {
        const key = `${current.numero_produto}-${current.secao}-${current.data}-${current.hora_rutura}-${current.ot}-${current.req}`;
        const exists = acc.find(item => {
          const itemKey = `${item.numero_produto}-${item.secao}-${item.data}-${item.hora_rutura}-${item.ot}-${item.req}`;
          return itemKey === key;
        });
        
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, [] as Rutura[]);

      return this.saveData(uniqueData);
    } catch (error) {
      console.error('❌ Erro ao adicionar dados:', error);
      return false;
    }
  }

  /**
   * Carrega dados do localStorage com suporte a descompressão
   */
  static loadData(): Rutura[] {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.log('📭 Nenhum dado encontrado no localStorage');
        return [];
      }

      const parsed = JSON.parse(savedData);
      
      // Verificar se dados estão comprimidos
      if (parsed.compressed && parsed.version === '1.1') {
        console.log('🗜️ Dados comprimidos detectados, descomprimindo...');
        const dadosDescomprimidos = this.descomprimirDados(parsed.data);
        console.log('✅ Dados descomprimidos:', dadosDescomprimidos.length, 'registros');
        return dadosDescomprimidos;
      }
      
      // Dados não comprimidos (formato antigo)
      const ruturas = parsed.data || parsed;
      console.log('🔄 Dados carregados do localStorage:', ruturas.length, 'registros');
      return ruturas;
    } catch (error) {
      console.error('❌ Erro ao carregar dados do localStorage:', error);
      // Tentar recuperar do backup
      return this.loadBackup();
    }
  }

  /**
   * Tenta carregar dados do backup
   */
  static loadBackup(): Rutura[] {
    try {
      const backupData = localStorage.getItem(BACKUP_KEY);
      if (backupData) {
        const parsed = JSON.parse(backupData);
        const ruturas = parsed.data || parsed;
        console.log('🔄 Dados recuperados do backup:', ruturas.length, 'registros');
        return ruturas;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar backup:', error);
    }
    return [];
  }

  /**
   * Limpa todos os dados salvos
   */
  static clearData(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKUP_KEY);
      console.log('🗑️ Todos os dados foram limpos do localStorage');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      return false;
    }
  }

  /**
   * Retorna informações sobre os dados salvos
   */
  static getDataInfo(): {
    count: number;
    timestamp: string | null;
    size: string;
  } {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        return { count: 0, timestamp: null, size: '0 KB' };
      }

      const parsed = JSON.parse(savedData);
      const size = new Blob([savedData]).size;
      const sizeFormatted = size > 1024 * 1024 
        ? `${(size / (1024 * 1024)).toFixed(2)} MB`
        : size > 1024 
          ? `${(size / 1024).toFixed(2)} KB`
          : `${size} bytes`;

      return {
        count: parsed.data ? parsed.data.length : (Array.isArray(parsed) ? parsed.length : 0),
        timestamp: parsed.timestamp || null,
        size: sizeFormatted
      };
    } catch (error) {
      console.error('❌ Erro ao obter informações dos dados:', error);
      return { count: 0, timestamp: null, size: '0 KB' };
    }
  }

  /**
   * Verifica se há dados salvos
   */
  static hasData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}
