require('dotenv').config();
const http = require('http');
const axios = require('axios');
const apiSports = require('./apiSportsService');
const rulesEngine = require('./rulesEngine');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MIN_EV = parseFloat(process.env.MIN_EV_PERCENTAGE || '5.0');
const PORT = process.env.PORT || 3000;

// Armazenamento em memória das tips ativas
let activeTips = [];

// Grupos B2B de Telegram Parceiros (19,99€ / mês)
let partnerGroups = [
  {
    id: '1',
    name: 'Canal Oficial TipMaster Pro',
    chatId: TELEGRAM_CHAT_ID,
    active: true,
    expiresAt: '2099-12-31'
  }
];

// Lista de Afiliados e Influencers
let affiliates = [
  {
    id: 'aff_1',
    name: 'Pedro Tips',
    code: 'PEDRO10',
    activeUsers: 120,
    inactiveUsers: 15,
    monthlyPrice: 19.99
  },
  {
    id: 'aff_2',
    name: 'Canal BetMaster',
    code: 'BETVIP',
    activeUsers: 550,
    inactiveUsers: 42,
    monthlyPrice: 19.99
  }
];

// Função para calcular o escalão de comissão do Afiliado
function calculateCommissionTier(activeCount) {
  if (activeCount >= 1000) return 40;
  if (activeCount >= 500) return 30;
  if (activeCount >= 100) return 20;
  return 15;
}

const DAILY_LIMITS = { futebol: 10, basquetebol: 5, tenis: 3 };
const SPORT_META = {
  futebol: { emoji: '⚽', hashtag: '#Futebol' },
  basquetebol: { emoji: '🏀', hashtag: '#Basquetebol' },
  tenis: { emoji: '🎾', hashtag: '#Tenis' }
};

// Enviar alerta para TODOS os grupos de Telegram ativos
async function broadcastTelegramAlert(tip) {
  const domain = 'api.telegram.org';
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

  const today = new Date().toISOString().split('T')[0];
  const activeTargets = partnerGroups.filter(g => g.active && g.expiresAt >= today);

  console.log(`[BROADCAST] A enviar alerta para ${activeTargets.length} grupos parceiros...`);

  for (const group of activeTargets) {
    const botToken = group.botToken || TELEGRAM_BOT_TOKEN;
    const url = `https://${domain}/bot${botToken}/sendMessage`;

    try {
      await axios.post(url, {
        chat_id: group.chatId,
        text: mensagem,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });
      console.log(` ✅ [SUCESSO ENVIADO] Grupo: "${group.name}" (${group.chatId})`);
    } catch (error) {
      console.error(` ❌ [ERRO ENVIAR] Grupo: "${group.name}":`, error.response?.data || error.message);
    }
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

    const candidateTips = { futebol: [], basquetebol: [], tenis: [] };

    for (const match of fixtures) {
      const valueBet = rulesEngine.evaluateMatch ? rulesEngine.evaluateMatch(match) : null;

      if (valueBet && parseFloat(valueBet.ev) >= MIN_EV) {
        const sportKey = (valueBet.sport || 'futebol').toLowerCase();
        if (!candidateTips[sportKey]) candidateTips[sportKey] = [];
        candidateTips[sportKey].push(valueBet);
      }
    }

    const newActiveTips = [];

    for (const [sport, tips] of Object.entries(candidateTips)) {
      if (tips.length === 0) continue;

      tips.sort((a, b) => (parseFloat(b.ev) || 0) - (parseFloat(a.ev) || 0));
      const selectedTips = tips.slice(0, DAILY_LIMITS[sport] || 5);

      for (const tip of selectedTips) {
        await broadcastTelegramAlert(tip);
        newActiveTips.push({ ...tip, timestamp: new Date().toISOString() });
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (newActiveTips.length > 0) activeTips = newActiveTips;
  } catch (err) {
    console.error('[PIPELINE ERRO]', err.message);
  }

  console.log('--- [TIPMASTER PRO] PROCESSAMENTO CONCLUÍDO ---');
}

// Servidor HTTP
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = req.url || '/';
  const pathname = reqUrl.split('?')[0];

  // 1. TIPS +EV
  if (pathname === '/api/tips') {
    const urlParams = new URLSearchParams(reqUrl.includes('?') ? reqUrl.split('?')[1] : '');
    const sportFilter = urlParams.get('sport');

    let filteredTips = activeTips;
    if (sportFilter && sportFilter !== 'todos' && sportFilter !== 'all') {
      filteredTips = activeTips.filter(t => (t.sport || 'futebol').toLowerCase() === sportFilter.toLowerCase());
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, count: filteredTips.length, tips: filteredTips }));
  } 
  
  // 2. GESTÃO DE GRUPOS TELEGRAM (B2B)
  else if (pathname === '/api/groups') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, count: partnerGroups.length, groups: partnerGroups }));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newGroup = JSON.parse(body);
          if (!newGroup.name || !newGroup.chatId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Nome e ChatID são obrigatórios.' }));
            return;
          }

          const existingIndex = partnerGroups.findIndex(g => g.chatId === newGroup.chatId);
          if (existingIndex >= 0) {
            partnerGroups[existingIndex] = { ...partnerGroups[existingIndex], ...newGroup };
          } else {
            partnerGroups.push({
              id: String(Date.now()),
              active: true,
              expiresAt: newGroup.expiresAt || '2026-12-31',
              ...newGroup
            });
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, groups: partnerGroups }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'JSON Inválido.' }));
        }
      });
    }
  }

  // 3. RELATÓRIO DE AFILIADOS E COMISSÕES
  else if (pathname === '/api/affiliates') {
    if (req.method === 'GET') {
      const detailedAffiliates = affiliates.map(aff => {
        const tierPercent = calculateCommissionTier(aff.activeUsers);
        const totalRevenue = aff.activeUsers * (aff.monthlyPrice || 19.99);
        const payout = totalRevenue * (tierPercent / 100);

        return {
          ...aff,
          tierPercent,
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          payout: parseFloat(payout.toFixed(2))
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, affiliates: detailedAffiliates }));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const newAff = JSON.parse(body);
          if (!newAff.name || !newAff.code) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: 'Nome e Código do Cupão são obrigatórios.' }));
            return;
          }

          affiliates.push({
            id: 'aff_' + Date.now(),
            name: newAff.name,
            code: newAff.code.toUpperCase(),
            activeUsers: 0,
            inactiveUsers: 0,
            monthlyPrice: 19.99
          });

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, affiliates }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'JSON Inválido.' }));
        }
      });
    }
  }

  // 4. RUN PIPELINE MANUAL
  else if (pathname === '/run') {
    runAnalysisPipeline();
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Pipeline de análise iniciado manualmente.');
  }

  // 5. HEALTH CHECK
  else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('TipMaster Pro Backend SaaS está Online e Operacional!');
  }
});

server.listen(PORT, () => {
  console.log(`[SERVER] Servidor SaaS ativo na porta ${PORT}`);
  runAnalysisPipeline();
});
