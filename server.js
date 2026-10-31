require('dotenv').config();
const axios = require('axios');
const apiSports = require('./apiSportsService');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MIN_EV = parseFloat(process.env.MIN_EV_PERCENTAGE || '5.0');

async function sendTelegramAlert(tip) {
  const url = 'https://' + 'api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  
  const mensagem = 
⚽ *DICA DE VALOR (+EV) | TIPMASTER PRO*

⚔️ *Jogo:*  vs 
🏆 *Competição:* 
📅 *Data/Hora:* 

💡 *TIP RECOMENDADA:*
• *Mercado:* 
• *Odds Atuais:* 
• *Valor Esperado:* 
• *Stake Sugerida:* 

🔍 *JUSTIFICAÇÃO RÁPIDA:*


🌤️ *Clima:*  | 🚨 *Ausências:* 

📲 [Ver Análise Completa na App]([suspicious link removed]{tip.matchId || '12345'})

#Futebol #ValueBet #TipMasterPro
  .trim();

  try {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };
    const bytes = Buffer.from(JSON.stringify(payload), 'utf-8');

    await axios.post(url, bytes, {
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
    console.log([TELEGRAM SUCESSO] Alerta enviado:  vs );
  } catch (error) {
    console.error('[TELEGRAM ERRO] Falha ao enviar mensagem:', error.response?.data || error.message);
  }
}

async function runAnalysisPipeline() {
  console.log('--- [TIPMASTER PRO] INICIANDO PROCESSAMENTO DA API-SPORTS ---');

  const fixtures = await apiSports.getTodayFixtures();

  if (fixtures.length === 0) {
    console.log('[TIPMASTER PRO] Sem partidas agendadas nas ligas selecionadas para hoje.');
    return;
  }

  for (const match of fixtures) {
    console.log([ANALISANDO]  vs  ());

    const valueBet = rulesEngine.evaluateMatch ? rulesEngine.evaluateMatch(match) : null;

    if (valueBet && parseFloat(valueBet.ev) >= MIN_EV) {
      await sendTelegramAlert(valueBet);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('--- [TIPMASTER PRO] PROCESSAMENTO CONCLUÍDO ---');
}

runAnalysisPipeline();
