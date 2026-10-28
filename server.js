// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const rules = require('./rulesEngine');

const app = express();
app.use(express.json());
// Receber resultados de teste e verificar as regras
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
        signal = rules.processRouletteColumn(Number(result));
        break;

      case 'superAndarBahar':
        signal = rules.processSuperAndarBahar(Number(result));
        break;

      case 'monopolyRoulette':
        signal = rules.processMonopolyRoulette(Number(result));
        break;

      default:
        return res.status(400).json({
          error: 'Jogo não reconhecido.'
        });
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

// Configuração do Telegram (Preencher com as suas chaves)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "O_SEU_TELEGRAM_BOT_TOKEN";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "@o_seu_canal_telegram";

// Conexão WebSocket com a App
io.on('connection', (socket) => {
  console.log(`📱 App conectada ao WebSocket! ID: ${socket.id}`);

  // Endpoint para a App acionar o envio no Telegram
  socket.on('dispatch_telegram', async (tipData) => {
    console.log('📲 Pedido da App para enviar no Telegram:', tipData.title);
    await sendToTelegram(tipData);
  });
});

// Função para emitir Tip em tempo real para todas as Apps ligadas
function broadcastTip(tipPayload) {
  console.log(`🚀 Emissão de Tip em Tempo Real: [${tipPayload.game}] ${tipPayload.title}`);
  io.emit('new_live_signal', tipPayload);
}

// Função para enviar para a API do Telegram
async function sendToTelegram(tipPayload) {
  if (TELEGRAM_BOT_TOKEN === "O_SEU_TELEGRAM_BOT_TOKEN") {
    console.log("⚠️ Token do Telegram não configurado.");
    return;
  }

  const textMessage = `${tipPayload.title}\n\n` +
                      `🎮 *Jogo:* ${tipPayload.game}\n` +
                      `💡 *Mensagem:* ${tipPayload.message}\n` +
                      (tipPayload.targets ? `🎯 *Alvos:* ${tipPayload.targets.join(', ')}\n` : '') +
                      (tipPayload.stakes ? `📊 *Gestão:* ${JSON.stringify(tipPayload.stakes)}` : '');

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: textMessage,
        parse_mode: 'Markdown'
      })
    });
    console.log("✅ Mensagem enviada para o Telegram com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao enviar para o Telegram:", err);
  }
}

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`⚡ Servidor TipMaster Pro ativo na porta ${PORT}`);
});

module.exports = { broadcastTip };
