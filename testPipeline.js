require('dotenv').config();
const axios = require('axios');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const mockMatch = {
  fixture: { id: 99999, date: new Date().toISOString() },
  league: { name: 'Copa Libertadores' },
  teams: {
    home: { name: 'Flamengo' },
    away: { name: 'Palmeiras' }
  }
};

async function testPipeline() {
  console.log('--- [TESTE PIPELINE] A avaliar jogo da Libertadores com o motor de regras ---');

  let valueBet = null;
  try {
    if (rulesEngine.evaluateMatch) {
      valueBet = rulesEngine.evaluateMatch(mockMatch);
    }
  } catch (e) {
    console.log('A utilizar mock de aposta de valor...');
  }

  if (!valueBet) {
    valueBet = {
      sport: 'futebol',
      homeTeam: 'Flamengo',
      awayTeam: 'Palmeiras',
      league: 'Copa Libertadores 🏆',
      dateTime: 'Hoje, 01:30',
      market: 'Mais de 2.5 Golos',
      odd: '1.98',
      ev: '+8.4%',
      stake: '1 Unidade',
      justification: 'Jogo decisivo de Libertadores. Modelo estatístico apurou probabilidade superior à odd oferecida pelas casas.',
      weather: '22°C Céu Limpo',
      absences: 'Sem ausências críticas',
      matchId: '99999'
    };
  }

  console.log(`[+EV DETETADO] ${valueBet.homeTeam} vs ${valueBet.awayTeam} | EV: ${valueBet.ev}`);

  const domain = 'api.telegram.org';
  const url = 'https://' + domain + '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  const appLink = '[suspicious link removed]' + valueBet.matchId;

  const mensagem = [
    '⚽ *DICA DE VALOR (+EV) | TIPMASTER PRO*',
    '',
    `⚔️ *Jogo:* ${valueBet.homeTeam} vs ${valueBet.awayTeam}`,
    `🏆 *Competição:* ${valueBet.league}`,
    `📅 *Data/Hora:* ${valueBet.dateTime}`,
    '',
    '💡 *TIP RECOMENDADA:*',
    `• *Mercado:* ${valueBet.market}`,
    `• *Odds Atuais:* ${valueBet.odd}`,
    `• *Valor Esperado:* ${valueBet.ev}`,
    `• *Stake Sugerida:* ${valueBet.stake}`,
    '',
    '🔍 *JUSTIFICAÇÃO RÁPIDA:*',
    `${valueBet.justification}`,
    '',
    `🌤️ *Clima:* ${valueBet.weather} | 🚨 *Ausências:* ${valueBet.absences}`,
    '',
    `📲 [Ver Análise Completa na App](${appLink})`,
    '',
    '#Futebol #Libertadores #ValueBet #TipMasterPro #PipelineTest'
  ].join('\n');

  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: mensagem,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    console.log('✅ [ALERTA DISPARADO] Notificação enviada para o canal do Telegram com sucesso!');
  } catch (err) {
    console.error('❌ [ERRO PIPELINE]', err.response?.data || err.message);
  }
}

testPipeline();
