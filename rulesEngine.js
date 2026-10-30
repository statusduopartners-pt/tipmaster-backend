
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

// Estado do Bac Bo
let bacBoState = {
  streakSide: null,
  streakCount: 0,
  active: false,
  primaryTarget: null,
  attempt: 0
};

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
 * 3. REGRA BAC BO
 *
 * 4 Bankers consecutivos:
 *   Apostar em Player + Tie.
 *
 * 4 Players consecutivos:
 *   Apostar em Banker + Tie.
 *
 * Primeira tentativa:
 *   1 unidade no resultado principal + 1 unidade no Tie.
 *
 * Segunda tentativa, se ambas perderem:
 *   2 unidades no resultado principal + 1 unidade no Tie.
 *
 * Se sair qualquer um dos dois resultados apostados,
 * a ronda é considerada ganha e a contagem reinicia.
 *
 * Após duas derrotas:
 *   Interrompe a sequência e aguarda novo gatilho.
 */
function processBacBo(result) {
  const resultDrawn = String(result).trim().toLowerCase();

  const validResults = ["player", "banker", "tie"];

  if (!validResults.includes(resultDrawn)) {
    return {
      triggered: false,
      error: "Resultado inválido. Utilizar Player, Banker ou Tie."
    };
  }

  const resultName =
    resultDrawn.charAt(0).toUpperCase() + resultDrawn.slice(1);

  // Se existe uma tip ativa, avaliar o resultado da aposta
  if (bacBoState.active) {
    const isWin =
      resultDrawn === bacBoState.primaryTarget ||
      resultDrawn === "tie";

    // Pelo menos uma das duas apostas ganhou
    if (isWin) {
      const winningTarget =
        resultDrawn === "tie" ? "Tie" : resultName;

      bacBoState = {
        streakSide: null,
        streakCount: 0,
        active: false,
        primaryTarget: null,
        attempt: 0
      };

      return {
        triggered: true,
        game: "Bac Bo",
        rule: "BAC_BO_WIN",
        title: "🏆 BAC BO: RONDA GANHA!",
        message: `${winningTarget} saiu. Pelo menos uma das apostas ganhou. Sequência encerrada e contagem reiniciada.`,
        result: resultName,
        status: "ganha"
      };
    }

    // Primeira tentativa perdida: emitir segunda tentativa
    if (bacBoState.attempt === 1) {
      bacBoState.attempt = 2;

      return {
        triggered: true,
        game: "Bac Bo",
        rule: "BAC_BO_RECOVERY",
        title: "🔄 BAC BO: SEGUNDA TENTATIVA",
        message: `Saiu ${resultName}. Primeira tentativa perdida. Duplicar apenas a aposta em ${bacBoState.primaryTarget} e manter a aposta no Tie.`,
        targets: [bacBoState.primaryTarget, "Tie"],
        stakes: {
          primary: 2,
          tie: 1
        },
        attempt: 2,
        status: "recuperacao"
      };
    }

    // Segunda tentativa também perdida: interromper
    // O resultado atual inicia uma nova contagem, se for Player ou Banker.
    bacBoState = {
      streakSide: resultDrawn === "tie" ? null : resultDrawn,
      streakCount: resultDrawn === "tie" ? 0 : 1,
      active: false,
      primaryTarget: null,
      attempt: 0
    };

    return {
      triggered: true,
      game: "Bac Bo",
      rule: "BAC_BO_STOP",
      title: "🛑 BAC BO: SEQUÊNCIA INTERROMPIDA",
      message: `Saiu ${resultName}. Segunda tentativa perdida. Apostas interrompidas. A aguardar uma nova sequência de 4 resultados consecutivos.`,
      result: resultName,
      status: "interrompida"
    };
  }

  // Sem tip ativa: acompanhar sequências de Player e Banker.
  // O Tie interrompe a sequência consecutiva.
  if (resultDrawn === "tie") {
    bacBoState.streakSide = null;
    bacBoState.streakCount = 0;
    return { triggered: false };
  }

  if (bacBoState.streakSide === resultDrawn) {
    bacBoState.streakCount++;
  } else {
    bacBoState.streakSide = resultDrawn;
    bacBoState.streakCount = 1;
  }

  // Ainda não atingiu os 4 resultados consecutivos
  if (bacBoState.streakCount < 4) {
    return { triggered: false };
  }

  // Gatilho atingido: definir o resultado principal
  const primaryTarget =
    resultDrawn === "banker" ? "Player" : "Banker";

  bacBoState.active = true;
  bacBoState.primaryTarget = primaryTarget;
  bacBoState.attempt = 1;

  return {
    triggered: true,
    game: "Bac Bo",
    rule: "BAC_BO_INITIAL",
    title: `🎯 TIP BAC BO: ${primaryTarget.toUpperCase()} + TIE`,
    message: `Foram detetados 4 resultados consecutivos de ${resultName}. Apostar em ${primaryTarget} + Tie.`,
    targets: [primaryTarget, "Tie"],
    stakes: {
      primary: 1,
      tie: 1
    },
    attempt: 1,
    status: "pendente"
  };
}

module.exports = {
  processRouletteColumn,
  processSuperAndarBahar,
  processBacBo
};
