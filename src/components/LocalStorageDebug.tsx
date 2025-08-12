import React, { useEffect, useState } from 'react';
import { LocalStorageManager } from '@/lib/localStorage';
import { Button } from '@/components/ui/button';

export const LocalStorageDebug: React.FC = () => {
  const [info, setInfo] = useState({ count: 0, size: '0 KB', timestamp: null as string | null });

  useEffect(() => {
    const updateInfo = () => {
      const data = LocalStorageManager.getDataInfo();
      setInfo(data);
    };

    updateInfo();
    const interval = setInterval(updateInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const testSave = () => {
    const testData = [
      {
        semana: 'Test Week',
        hora_rutura: '14:00',
        hora_da_rutura: '14:00',
        secao: 'Test Section',
        tipo_requisicao: 'NORMAL',
        ot: 'TEST001',
        req: 'REQ001',
        tipo_produto: 'Test',
        numero_produto: '123456',
        descricao: 'Produto de teste',
        qtd_req: 10,
        qtd_env: 5,
        qtd_falta: 5,
        un_med: 'UN',
        data: '2025-01-15',
        data_requisicao: '2025-01-15',
        stock_ct: 0,
        stock_ff: 10,
        em_transito_ff: 0,
        tipologia_rutura: 'Test',
        aba_origem: '14H',
        semana_mes: 'Test Week'
      }
    ];

    LocalStorageManager.saveData(testData);
    console.log('Teste de salvamento executado');
  };

  const testLoad = () => {
    const data = LocalStorageManager.loadData();
    console.log('Dados carregados:', data);
  };

  const testClear = () => {
    LocalStorageManager.clearData();
    console.log('Dados limpos');
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="font-bold text-lg mb-4">Debug LocalStorage</h3>
      <div className="mb-4">
        <p>Registros: {info.count}</p>
        <p>Tamanho: {info.size}</p>
        <p>Timestamp: {info.timestamp || 'N/A'}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={testSave} size="sm">Testar Salvar</Button>
        <Button onClick={testLoad} size="sm" variant="outline">Testar Carregar</Button>
        <Button onClick={testClear} size="sm" variant="destructive">Testar Limpar</Button>
      </div>
    </div>
  );
};
