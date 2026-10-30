
// rulesEngine.js

// Estado do Super Andar Bahar
let andarBaharState = {
  active: false,
  consecutiveWins: 0,
  maxWins: 3
};

// Estado independente da Lightning Roulette
const rouletteState = {
  columns: { last: null, count: 0 },
  dozens: { last: null, count: 0 }
};

/**
 * LIGHTNING ROULETTE
 * Cada coluna e cada dúzia têm contadores independentes.
 */

function processRouletteSequence(value, type) {
  const number = Number(value);

  if (![1, 2, 3].includes(number)) {
    return {
      triggered: false,
      error: `${type === "column" ? "Coluna" : "Dúzia"} inválida. Utilizar 1, 2 ou 3.`
    };
  }

  const state = rouletteState[type === "column" ? "columns" : "dozens"];

  if (state.last === number) {
    state.count++;
  } else {
    state.last = number;
    state.count = 1;
  }

  if (state.count < 3) {
    return { triggered: false };
  }

  // Reiniciar apenas o contador desta categoria
  state.last = null;
  state.count = 0;

  const targets = [1, 2, 3].filter(n => n !== number);
  const label = type === "column" ? "Coluna" : "Dúzia";
  const targetLabels = targets.map(n => `${label} ${n}`);

  return {
    triggered: true,
    game: "Lightning Roulette",
    rule: `${type.toUpperCase()}_${number}_DELAY`,
    title: `🎯 TIP LIGHTNING ROULETTE: ATRASO NA ${label.toUpperCase()} ${number}!`,
    message: `${label} ${number} saiu 3 vezes consecutivas. Apostar na ${targetLabels[0]} e na ${targetLabels[1]}.`,
    targets: targetLabels
  };
}

function processRouletteColumn(columnDrawn) {
  return processRouletteSequence(columnDrawn, "column");
}

function processRouletteDozen(dozenDrawn) {
  return processRouletteSequence(dozenDrawn, "dozen");
}

// SUPER ANDAR BAHAR
// Lógica original preservada.

function processSuperAndarBahar(resultNumber) {
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
        stakes: {
          "6-10": "4x",
          "11-15": "3x",
          "16-20": "2x",
          "21-25": "1x"
        }
      };
    }
  } else {
    const isWin = resultNumber >= 6 && resultNumber <= 25;

    if (isWin) {
      andarBaharState.consecutiveWins++;

      if (andarBaharState.consecutiveWins >= andarBaharState.maxWins) {
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
        return {
          triggered: true,
          game: "Super Andar Bahar",
          rule: "REPEAT_TIP",
          title: `🔥 REPETIR TIP (${andarBaharState.consecutiveWins}/3 Wins)`,
          message: "Aposta ganha! Repetir a mesma entrada.",
          stakes: {
            "6-10": "4x",
            "11-15": "3x",
            "16-20": "2x",
            "21-25": "1x"
          }
        };
      }
    } else {
      andarBaharState.active = false;

      if (resultNumber >= 1 && resultNumber <= 5) {
        andarBaharState.active = true;
        andarBaharState.consecutiveWins = 0;

        return {
          triggered: true,
          game: "Super Andar Bahar",
          rule: "RED_AND_RETRIGGER",
          title: "🔄 RED & NOVO GATILHO (1-5)",
          message: "Aposta perdedora, mas novo gatilho 1-5 detetado. Iniciar nova tip.",
          stakes: {
            "6-10": "4x",
            "11-15": "3x",
            "16-20": "2x",
            "21-25": "1x"
          }
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

// BAC BO
// Lógica original preservada.

let bacBoState = {
  streakSide: null,
  streakCount: 0,
  active: false,
  primaryTarget: null,
  attempt: 0
};

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

  if (bacBoState.active) {
    const isWin =
      resultDrawn === bacBoState.primaryTarget ||
      resultDrawn === "tie";

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
      rule: "BAC_BO_STOP",
      title: "🛑 BAC BO: SEQUÊNCIA INTERROMPIDA",
      message: `Saiu ${resultName}. Segunda tentativa perdida. Apostas interrompidas. A aguardar uma nova sequência de 4 resultados consecutivos.`,
      result: resultName,
      status: "interrompida"
    };
  }

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

  if (bacBoState.streakCount < 4) {
    return { triggered: false };
  }

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
  processRouletteDozen,
  processSuperAndarBahar,
  processBacBo
};
