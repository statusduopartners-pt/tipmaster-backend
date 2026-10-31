require('dotenv').config();
const axios = require('axios');
const apiSports = require('./apiSportsService');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MIN_EV = parseFloat(process.env.MIN_EV_PERCENTAGE || '5.0');

// Limites máximos de envios diários por modalidade
const DAILY_LIMITS = {
  futebol: 10,
  basquetebol: 5,
  tenis: 3
};

// Emojis e Hashtags por desporto
const SPORT_META = {
  futebol: { emoji: '⚽', hashtag: '#Futebol' },
  basquetebol: { emoji: '🏀', hashtag: '#Basquetebol' },
  tenis: { emoji: '🎾', hashtag: '#Tenis' }
};

async function sendTelegramAlert(tip) {
  const url = `[suspicious link removed]{TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const sportKey = (tip.sport || 'futebol').toLowerCase();
  const meta = SPORT_META[sportKey] || SPORT_META.futebol;

  const mensagem = `
${meta.emoji} *DICA DE VALOR (+EV) | TIPMASTER PRO*

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

${meta.hashtag} #ValueBet #TipMasterPro
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
    console.log(`[TELEGRAM SUCESSO] Alerta enviado (${sportKey.toUpperCase()}): ${tip.homeTeam || 'Equipa'} vs ${tip.awayTeam || 'Equipa'}`);
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

  // Acumulador de candidatos por desporto
  const candidateTips = {
    futebol: [],
    basquetebol: [],
    tenis: []
  };

  // 1. Avaliar todas as partidas agendadas
  for (const match of fixtures) {
    console.log(`[ANALISANDO] ${match.teams.home.name} vs ${match.teams.away.name} (${match.league.name})`);

    const valueBet = rulesEngine.evaluateMatch ? rulesEngine.evaluateMatch(match) : null;

    if (valueBet && parseFloat(valueBet.ev) >= MIN_EV) {
      const sportKey = (valueBet.sport || 'futebol').toLowerCase();
      if (!candidateTips[sportKey]) {
        candidateTips[sportKey] = [];
      }
      candidateTips[sportKey].push(valueBet);
    }
  }

  // 2. Ordenar por maior % EV e enviar respeitando as quotas diárias
  for (const [sport, tips] of Object.entries(candidateTips)) {
    if (tips.length === 0) continue;

    // Ordenar do maior para o menor EV
    tips.sort((a, b) => {
      const evA = parseFloat(String(a.ev).replace(/[^0-9.-]/g, '')) || 0;
      const evB = parseFloat(String(b.ev).replace(/[^0-9.-]/g, '')) || 0;
      return evB - evA;
    });

    const limit = DAILY_LIMITS[sport] || 5;
    const selectedTips = tips.slice(0, limit);

    console.log(`[SELEÇÃO ${sport.toUpperCase()}] ${selectedTips.length} melhores tips selecionadas de ${tips.length} acumuladas (Limite: ${limit}).`);

    for (const tip of selectedTips) {
      await sendTelegramAlert(tip);
      // Pausa anti-spam de 2 segundos entre mensagens
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('--- [TIPMASTER PRO] PROCESSAMENTO CONCLUÍDO ---');
}

runAnalysisPipeline();
