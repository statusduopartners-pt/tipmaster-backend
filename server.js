require('dotenv').config();
const http = require('http');
const axios = require('axios');
const apiSports = require('./apiSportsService');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MIN_EV = parseFloat(process.env.MIN_EV_PERCENTAGE || '5.0');
const PORT = process.env.PORT || 3000;

// Armazenamento em memória das tips ativas enviadas
let activeTips = [];

const DAILY_LIMITS = {
  futebol: 10,
  basquetebol: 5,
  tenis: 3
};

const SPORT_META = {
  futebol: { emoji: '⚽', hashtag: '#Futebol' },
  basquetebol: { emoji: '🏀', hashtag: '#Basquetebol' },
  tenis: { emoji: '🎾', hashtag: '#Tenis' }
};

async function sendTelegramAlert(tip) {
  const domain = 'api.telegram.org';
  const url = 'https://' + domain + '/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';

  const sportKey = (tip.sport || 'futebol').toLowerCase();
  const meta = SPORT_META[sportKey] || SPORT_META.futebol;
  const matchId = tip.matchId || '12345';
  const appLink = '[suspicious link removed]' + matchId;

  const mensagem = [
    `${meta.emoji} *DICA DE VALOR (+EV) | TIPMASTER PRO*`,
    '',
    `⚔️ *Jogo:* ${tip.homeTeam || 'Equipa A'} vs ${tip.awayTeam || 'Equipa B'}`,
    `🏆 *Competição:* ${tip.league || 'Liga'}`,
    `📅 *Data/Hora:* ${tip.dateTime || 'Hoje'}`,
    '',
    '💡 *TIP RECOMENDADA:*',
    `• *Mercado:* ${tip.market || 'Cantos Totais'}`,
    `• *Odds Atuais:* ${tip.odd || '1.85'}`,
    `• *Valor Esperado:* ${tip.ev || '+6.5% EV'}`,
    `• *Stake Sugerida:* ${tip.stake || '1 Unidade'}`,
    '',
    '🔍 *JUSTIFICAÇÃO RÁPIDA:*',
    `${tip.justification || 'Tendência estatística favorável apurada pelo modelo TipMaster.'}`,
    '',
    `🌤️ *Clima:* ${tip.weather || 'Ver na App'} | 🚨 *Ausências:* ${tip.absences || 'Ver na App'}`,
    '',
    `📲 [Ver Análise Completa na App](${appLink})`,
    '',
    `${meta.hashtag} #ValueBet #TipMasterPro`
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
    console.log(`[TELEGRAM SUCESSO] Alerta enviado (${sportKey.toUpperCase()}): ${tip.homeTeam || 'Equipa'} vs ${tip.awayTeam || 'Equipa'}`);
  } catch (error) {
    console.error('[TELEGRAM ERRO] Falha ao enviar mensagem:', error.response?.data || error.message);
  }
}

async function runAnalysisPipeline() {
  console.log('--- [TIPMASTER PRO] INICIANDO PROCESSAMENTO DA API-SPORTS ---');

  try {
    const fixtures = await apiSports.getTodayFixtures();

    if (!fixtures || fixtures.length === 0) {
      console.log('[TIPMASTER PRO] Sem partidas agendadas nas ligas selecionadas para hoje.');
      return;
    }

    const candidateTips = {
      futebol: [],
      basquetebol: [],
      tenis: []
    };

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

    const newActiveTips = [];

    for (const [sport, tips] of Object.entries(candidateTips)) {
      if (tips.length === 0) continue;

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
        newActiveTips.push({
          ...tip,
          timestamp: new Date().toISOString()
        });
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (newActiveTips.length > 0) {
      activeTips = newActiveTips;
    }
  } catch (err) {
    console.error('[PIPELINE ERRO]', err.message);
  }

  console.log('--- [TIPMASTER PRO] PROCESSAMENTO CONCLUÍDO ---');
}

// Servidor HTTP com suporte a Query Parameters (ex: ?sport=futebol)
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = req.url || '/';
  const pathname = reqUrl.split('?')[0];

  if (pathname === '/api/tips') {
    const urlParams = new URLSearchParams(reqUrl.includes('?') ? reqUrl.split('?')[1] : '');
    const sportFilter = urlParams.get('sport');

    let filteredTips = activeTips;
    if (sportFilter && sportFilter !== 'todos' && sportFilter !== 'all') {
      filteredTips = activeTips.filter(t => (t.sport || 'futebol').toLowerCase() === sportFilter.toLowerCase());
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: filteredTips.length, tips: filteredTips }));
  } else if (pathname === '/run') {
    runAnalysisPipeline();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Pipeline de análise iniciado manualmente.');
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('TipMaster Pro Backend está Online e Operacional!');
  }
});

server.listen(PORT, () => {
  console.log(`[SERVER] Servidor ativo a escutar na porta ${PORT}`);
  runAnalysisPipeline();
});
