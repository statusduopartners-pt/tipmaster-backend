// rulesEngine.js

// Estado do Super Andar Bahar
let andarBaharState = {
  active: false,
  consecutiveWins: 0,
  maxWins: 3
};

// Estado da Roleta (Colunas e Dúzias)
let rouletteState = {
  lastColumn: null,
  columnHitCount: 0,
  targetColumn: 3
};

// Estado do Monopoly Roulette (Janela móvel de 1H)
let monopolyHistory1H = []; // [{ timestamp, number }]
let monopolyRoundsWithoutHot = 0;

/**
 * 1. REGRA ROLETA: 3x seguidas na Coluna 3
 */
function processRouletteColumn(columnDrawn) {
  if (columnDrawn === rouletteState.targetColumn) {
    rouletteState.columnHitCount++;
  } else {
    rouletteState.columnHitCount = 0;
  }

  if (rouletteState.columnHitCount >= 3) {
    rouletteState.columnHitCount = 0; // Reset
    return {
      triggered: true,
      game: "Lightning Roulette",
      rule: "COLUMN_3_DELAY",
      title: "🎯 TIP ROLETA: Atraso na Coluna 3!",
      message: "Coluna 3 saiu 3x seguidas. Apostar na Coluna 1 e Coluna 2.",
      targets: ["Coluna 1", "Coluna 2"]
    };
  }
  return { triggered: false };
}

/**
 * 2. REGRA SUPER ANDAR BAHAR: Gatilho 1-5 & Ciclo de até 3 Wins
 */
function processSuperAndarBahar(resultNumber) {
  // Gatilho Inicial (Resultado 1-5)
  if (!andarBaharState.active) {
    if (resultNumber >= 1 && resultNumber <= 5) {
      andarBaharState.active = true;
      andarBaharState.consecutiveWins = 0;
      return {
        triggered: true,
        game: "Super Andar Bahar",
        rule: "GATILHO_1_5",
        title: "🎯 TIP SUPER ANDAR BAHAR!",
        message: "Resultado 1-5 detetado! Gestão de banca recomendada.",
        stakes: { "6-10": "4x", "11-15": "3x", "16-20": "2x", "21-25": "1x" }
      };
    }
  } else {
    // Ciclo em curso (Verifica Green vs Red)
    const isWin = resultNumber >= 6 && resultNumber <= 25;

    if (isWin) {
      andarBaharState.consecutiveWins++;
      if (andarBaharState.consecutiveWins >= andarBaharState.maxWins) {
        // Atingiu 3 Wins -> Conclui o ciclo
        andarBaharState.active = false;
        andarBaharState.consecutiveWins = 0;
        return {
          triggered: true,
          game: "Super Andar Bahar",
          rule: "CYCLE_COMPLETED",
          title: "🏆 META ATINGIDA: 3 WINS!",
          message: "3 Vitórias consecutivas atingidas. Ciclo encerrado com sucesso."
        };
      } else {
        // Repete a tip
        return {
          triggered: true,
          game: "Super Andar Bahar",
          rule: "REPEAT_TIP",
          title: `🔥 REPETIR TIP (${andarBaharState.consecutiveWins}/3 Wins)`,
          message: "Aposta ganha! Repetir a mesma entrada.",
          stakes: { "6-10": "4x", "11-15": "3x", "16-20": "2x", "21-25": "1x" }
        };
      }
    } else {
      // Red -> Interrompe imediatamente
      andarBaharState.active = false;
      
      // Se o Red for também um novo 1-5, reinicia o ciclo
      if (resultNumber >= 1 && resultNumber <= 5) {
        andarBaharState.active = true;
        andarBaharState.consecutiveWins = 0;
        return {
          triggered: true,
          game: "Super Andar Bahar",
          rule: "RED_AND_RETRIGGER",
          title: "🔄 RED & NOVO GATILHO (1-5)",
          message: "Aposta perdedora, mas novo gatilho 1-5 detetado. Iniciar nova tip.",
          stakes: { "6-10": "4x", "11-15": "3x", "16-20": "2x", "21-25": "1x" }
        };
      }

      return {
        triggered: true,
        game: "Super Andar Bahar",
        rule: "RED_INTERRUPT",
        title: "🛑 RED - TIP INTERROMPIDA",
        message: "Resultado fora da margem. Tip interrompida a aguardar novo 1-5."
      };
    }
  }
  return { triggered: false };
}

/**
 * 3. REGRA MONOPOLY ROULETTE: 8 Rodadas sem Hot Numbers da Última 1H
 */
function processMonopolyRoulette(numberDrawn) {
  const now = Date.now();
  const oneHourAgo = now - 3600 * 1000;

  // 1. Atualiza histórico e remove registos > 1H
  monopolyHistory1H.push({ timestamp: now, number: numberDrawn });
  monopolyHistory1H = monopolyHistory1H.filter(r => r.timestamp >= oneHourAgo);

  // 2. Calcula os 8 Hot Numbers da última hora
  const counts = {};
  monopolyHistory1H.forEach(r => { counts[r.number] = (counts[r.number] || 0) + 1; });
  const sortedNumbers = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const hotNumbers = sortedNumbers.slice(0, 8).map(Number);

  // 3. Verifica se saiu um Hot Number
  if (hotNumbers.includes(numberDrawn)) {
    monopolyRoundsWithoutHot = 0;
  } else {
    monopolyRoundsWithoutHot++;
    if (monopolyRoundsWithoutHot >= 8) {
      monopolyRoundsWithoutHot = 0; // Reset
      return {
        triggered: true,
        game: "Monopoly Roulette Live",
        rule: "HOT_NUMBERS_REVERTS",
        title: "🎯 TIP MONOPOLY: 8 Rodadas sem Hot Numbers!",
        message: `Apostar 1x em cada um dos 8 Hot Numbers da última hora.`,
        targets: hotNumbers
      };
    }
  }
  return { triggered: false };
}

module.exports = {
  processRouletteColumn,
  processSuperAndarBahar,
  processMonopolyRoulette
};