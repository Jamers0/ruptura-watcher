// Script de teste do LocalStorageManager
// Execute no console do navegador para testar a persistência

// Importar o LocalStorageManager (assumindo que está disponível globalmente)
const testData = [
  {
    semana: '4ª Semana de Janeiro',
    hora_rutura: '14:30',
    hora_da_rutura: '14:30',
    secao: 'CQ - Congelados',
    tipo_requisicao: 'NORMAL',
    ot: '12345',
    req: 'REQ001',
    tipo_produto: 'F&V',
    numero_produto: '123456',
    descricao: 'Produto Teste 1',
    qtd_req: 10,
    qtd_env: 5,
    qtd_falta: 5,
    un_med: 'UN',
    data: '2025-01-15',
    data_requisicao: '2025-01-15',
    stock_ct: 0,
    stock_ff: 10,
    em_transito_ff: 0,
    tipologia_rutura: 'Sem Stock Físico e BC',
    aba_origem: '14H',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    semana: '4ª Semana de Janeiro',
    hora_rutura: '18:45',
    hora_da_rutura: '18:45',
    secao: 'CF - Fresco',
    tipo_requisicao: 'URGENTE',
    ot: '12346',
    req: 'REQ002',
    tipo_produto: 'Pão & Iogurtes',
    numero_produto: '123457',
    descricao: 'Produto Teste 2',
    qtd_req: 20,
    qtd_env: 15,
    qtd_falta: 5,
    un_med: 'UN',
    data: '2025-01-15',
    data_requisicao: '2025-01-15',
    stock_ct: 5,
    stock_ff: 0,
    em_transito_ff: 0,
    tipologia_rutura: 'A pedir à FF',
    aba_origem: '18H',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

console.log('=== TESTE LOCALSTORAGE ===');

// Testar salvamento
console.log('1. Testando salvamento...');
localStorage.setItem('ruptura_watcher_data', JSON.stringify({
  data: testData,
  timestamp: new Date().toISOString(),
  count: testData.length
}));

// Testar carregamento
console.log('2. Testando carregamento...');
const savedData = localStorage.getItem('ruptura_watcher_data');
if (savedData) {
  const parsed = JSON.parse(savedData);
  console.log('✅ Dados salvos encontrados:', parsed.data.length, 'registros');
} else {
  console.log('❌ Nenhum dado encontrado');
}

// Verificar se persiste após reload
console.log('3. Para testar persistência: recarregue a página e execute:');
console.log('const data = localStorage.getItem("ruptura_watcher_data");');
console.log('console.log(data ? JSON.parse(data) : "Não encontrado");');
