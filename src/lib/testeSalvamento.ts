import { LocalStorageManager } from '@/lib/localStorage';
import type { Rutura } from '@/lib/types';

export class TesteSalvamento {
  /**
   * Testa se o localStorage está funcionando corretamente
   */
  static testarLocalStorage(): boolean {
    try {
      const dadosTeste: Rutura[] = [
        {
          semana: 'Teste de Salvamento',
          hora_rutura: '14:00',
          hora_da_rutura: '14:00',
          secao: 'TESTE',
          tipo_requisicao: 'TESTE',
          ot: 'TESTE001',
          req: 'REQ001',
          tipo_produto: 'TESTE',
          numero_produto: '999999',
          descricao: 'Produto de Teste de Salvamento',
          qtd_req: 1,
          qtd_env: 0,
          qtd_falta: 1,
          un_med: 'UN',
          data: '2025-08-12',
          data_requisicao: '2025-08-12',
          stock_ct: 0,
          stock_ff: 0,
          em_transito_ff: 0,
          tipologia_rutura: 'TESTE',
          aba_origem: '14H'
        }
      ];

      console.log('🧪 INICIANDO TESTE DE SALVAMENTO...');
      
      // Teste 1: Salvamento forçado
      const salvou = LocalStorageManager.forcarSalvamento(dadosTeste);
      if (!salvou) {
        console.error('❌ Falhou no salvamento forçado');
        return false;
      }

      // Teste 2: Verificação imediata
      const carregou = LocalStorageManager.loadData();
      if (carregou.length !== 1) {
        console.error('❌ Falhou no carregamento imediato');
        return false;
      }

      // Teste 3: Informações dos dados
      const info = LocalStorageManager.getDataInfo();
      console.log('📊 Info dos dados:', info);

      console.log('✅ TESTE DE SALVAMENTO CONCLUÍDO COM SUCESSO');
      return true;
    } catch (error) {
      console.error('❌ ERRO NO TESTE DE SALVAMENTO:', error);
      return false;
    }
  }

  /**
   * Força salvamento de dados existentes no contexto
   */
  static salvarDadosExistentes(ruturas: Rutura[]): void {
    console.log('💾 SALVANDO DADOS EXISTENTES:', ruturas.length, 'registros');
    
    if (ruturas.length === 0) {
      console.warn('⚠️ Nenhum dado para salvar');
      return;
    }

    const sucesso = LocalStorageManager.forcarSalvamento(ruturas);
    if (sucesso) {
      console.log('✅ DADOS SALVOS COM SUCESSO');
    } else {
      console.error('❌ FALHA NO SALVAMENTO DOS DADOS');
    }
  }

  /**
   * Limpa e verifica se foi limpo
   */
  static testarLimpeza(): boolean {
    console.log('🗑️ TESTANDO LIMPEZA...');
    
    const limpou = LocalStorageManager.clearData();
    if (!limpou) {
      console.error('❌ Falhou na limpeza');
      return false;
    }

    const dados = LocalStorageManager.loadData();
    if (dados.length !== 0) {
      console.error('❌ Dados ainda existem após limpeza');
      return false;
    }

    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO');
    return true;
  }
}
