

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const rules = require('./rulesEngine');

const app = express();
app.use(express.json());

// Receber resultados e verificar as regras
app.post('/api/test-rules', (req, res) => {
  const { game, result } = req.body;

  if (!game || result === undefined || result === null) {
    return res.status(400).json({
      error: 'Indica o jogo e o resultado.'
    });
  }

  let signal;

  try {
    switch (game) {
      case 'rouletteColumn':
      case 'lightningRoulette':
        signal = rules.processRouletteColumn(Number(result));
        break;

      case 'lightningRouletteDozen':
        signal = rules.processRouletteDozen(Number(result));
        break;

      case 'superAndarBahar':
        signal = rules.processSuperAndarBahar(Number(result));
        break;

      case 'bacBo':
        signal = rules.processBacBo(result);
        break;

      default:
        return res.status(400).json({
          error: 'Jogo não reconhecido.'
        });
    }

    if (signal && signal.triggered === true) {
      broadcastTip(signal);
    }

    return res.json({
      success: true,
      game,
      result,
      signal
    });

  } catch (error) {
    console.error('Erro ao processar regra:', error);

    return res.status(500).json({
      error: 'Não foi possível processar a regra.'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    name: 'TipMaster Pro',
    message: 'Servidor a funcionar corretamente!'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    port: 4000,
    websocket: true
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

// Configuração do Telegram
const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || "O_SEU_TELEGRAM_BOT_TOKEN";

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID || "@o_seu_canal_telegram";

// Evitar o envio duplicado do mesmo alerta durante a execução
const telegramSentSignals = new Set();

// Conexão WebSocket com a App
io.on('connection', (socket) => {
  console.log(`📱 App conectada ao WebSocket! ID: ${socket.id}`);

  // Mantém compatibilidade com o envio solicitado pela App
  socket.on('dispatch_telegram', async (tipData) => {
    if (!tipData) return;

    console.log('📲 Pedido da App para enviar no Telegram:', tipData.title);
    await sendToTelegram(tipData);
  });
});

// Função para criar identificadores de jogo
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Função para emitir Tip em tempo real e enviar automaticamente para Telegram
function broadcastTip(signal) {
  if (!signal || signal.triggered !== true) return;

  const liveSignal = {
    ...signal,
    id: signal.id || `sig-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: signal.status || 'pendente',
    target: signal.target || signal.title,
    reference: signal.reference || signal.message,
    game_name: signal.game_name || signal.game,
    game_slug: signal.game_slug || slugify(signal.game),
    signal_type: signal.signal_type || signal.rule
  };

  console.log(
    `🚀 Emissão de Tip em Tempo Real: [${liveSignal.game}] ${liveSignal.title}`
  );

  // Envio imediato para a aplicação
  io.emit('new_live_signal', liveSignal);

  // Envio automático para o Telegram, sem bloquear o Socket.IO
  void sendToTelegram(liveSignal);
}

// Função para enviar para a API do Telegram
async function sendToTelegram(tipPayload) {
  if (!tipPayload) return;

  if (
    !TELEGRAM_BOT_TOKEN ||
    TELEGRAM_BOT_TOKEN === "O_SEU_TELEGRAM_BOT_TOKEN"
  ) {
    console.log("⚠️ Token do Telegram não configurado.");
    return;
  }

  const signalId = tipPayload.id;

  // Evitar duplicados entre envio automático e pedido da App
  if (signalId && telegramSentSignals.has(signalId)) {
    console.log("⚠️ Alerta já enviado ou em processamento:", signalId);
    return;
  }

  if (signalId) {
    telegramSentSignals.add(signalId);
  }

  const textMessage = `${tipPayload.title}\n\n` +
    `🎮 *Jogo:* ${tipPayload.game || tipPayload.game_name || 'Não identificado'}\n` +
    `💡 *Mensagem:* ${tipPayload.message || tipPayload.reference || ''}\n` +
    (tipPayload.targets
      ? `🎯 *Alvos:* ${tipPayload.targets.join(', ')}\n`
      : '') +
    (tipPayload.stakes
      ? `📊 *Gestão:* ${JSON.stringify(tipPayload.stakes)}`
      : '');

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: textMessage,
          parse_mode: 'Markdown'
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(
        result.description || `Erro HTTP ${response.status}`
      );
    }

    console.log(
      "✅ Mensagem enviada para o Telegram:",
      signalId || tipPayload.title
    );

  } catch (err) {
    if (signalId) {
      telegramSentSignals.delete(signalId);
    }

    console.error(
      "❌ Erro ao enviar para o Telegram:",
      err.message
    );
  }
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`⚡ Servidor TipMaster Pro ativo na porta ${PORT}`);
});

module.exports = { broadcastTip };

