require('dotenv').config();
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTestAlert() {
  const domain = 'api.telegram.org';
  const url = 'https://' + domain + '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';

  const mensagem = [
    '⚽ *DICA DE VALOR (+EV) | TESTE TIPMASTER PRO*',
    '',
    '⚔️ *Jogo:* Benfica vs Sporting CP',
    '🏆 *Competição:* Liga Portugal Betclic',
    '📅 *Data/Hora:* Hoje, 20:30',
    '',
    '💡 *TIP RECOMENDADA:*',
    '• *Mercado:* Ambas Marcam (BTTS)',
    '• *Odds Atuais:* 1.95',
    '• *Valor Esperado:* +8.2% EV',
    '• *Stake Sugerida:* 1 Unidade',
    '',
    '🔍 *JUSTIFICAÇÃO RÁPIDA:*',
    'Alerta de teste manual para validação do Bot do Telegram e formatação em Markdown.',
    '',
    '🌤️ *Clima:* 18°C Limpo | 🚨 *Ausências:* Nenhuma relevante',
    '',
    '📲 [Ver Análise Completa na App]([suspicious link removed])',
    '',
    '#Futebol #ValueBet #TipMasterPro #TESTE'
  ].join('\n');

  try {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    console.log('✅ [SUCESSO] Alerta de teste enviado com sucesso para o Telegram!');
  } catch (error) {
    console.error('❌ [ERRO] Falha ao enviar mensagem de teste:', error.response?.data || error.message);
  }
}

sendTestAlert();
