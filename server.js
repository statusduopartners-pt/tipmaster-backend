require('dotenv').config();
const axios = require('axios');
const apiSports = require('./apiSportsService');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MIN_EV = parseFloat(process.env.MIN_EV_PERCENTAGE || '5.0');

async function sendTelegramAlert(tip) {
  const url = `[suspicious link removed]{TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const mensagem = `
⚽ *DICA DE VALOR (+EV) | TIPMASTER PRO*

⚔️ *Jogo:* ${tip.homeTeam || 'Equipa A'} vs ${tip.awayTeam || 'Equipa B'}
🏆 *Competição:* ${tip.league || 'Liga'}
📅 *Data/Hora:* ${tip.dateTime || 'Hoje'}

💡 *TIP RECOMENDADA:*
• *Mercado:* ${tip.market || 'Cantos Totais'}
• *Odds Atuais:* ${tip.odd || '1.85'}
• *Valor Esperado:* ${tip.ev || '+6.5% EV'}
• *Stake Sugerida:* ${tip.stake || '1 Unidade'}

🔍 *JUSTIFICAÇÃO RÁPIDA:*
${tip.justification || 'Tendência estatística favorável apurada pelo modelo TipMaster.'}

🌤️ *Clima:* ${tip.weather || 'Ver na App'} | 🚨 *Ausências:* ${tip.absences || 'Ver na App'}

📲 [Ver Análise Completa na App]([suspicious link removed]{tip.matchId || '12345'})

#Futebol #ValueBet #TipMasterPro
  `.trim();

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
    console.log(`[TELEGRAM SUCESSO] Alerta enviado: ${tip.homeTeam || 'Equipa'} vs ${tip.awayTeam || 'Equipa'}`);
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
    console.log(`[ANALISANDO] ${match.teams.home.name} vs ${match.teams.away.name} (${match.league.name})`);

    const valueBet = rulesEngine.evaluateMatch ? rulesEngine.evaluateMatch(match) : null;

    if (valueBet && parseFloat(valueBet.ev) >= MIN_EV) {
      await sendTelegramAlert(valueBet);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.log('--- [TIPMASTER PRO] PROCESSAMENTO CONCLUÍDO ---');
}

runAnalysisPipeline();
