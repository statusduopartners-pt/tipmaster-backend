require('dotenv').config();
const axios = require('axios');

const API_SPORTS_KEY = process.env.API_SPORTS_KEY;
const domain = 'v3.football.api-sports.io';
const BASE_URL = 'https://' + domain;

// Ligas Principais + Ligas das Américas e Competições CONMEBOL (Madrugada em Portugal)
const TARGET_LEAGUES = [
  // Europa
  94,  // Liga Portugal Betclic
  39,  // Premier League (Inglaterra)
  140, // La Liga (Espanha)
  135, // Serie A (Itália)
  78,  // Bundesliga (Alemanha)
  61,  // Ligue 1 (França)
  2,   // UEFA Champions League
  
  // Américas - Ligas Nacionais
  71,  // Brasil - Brasileirão Série A
  128, // Argentina - Liga Profesional
  239, // Colômbia - Primera A
  262, // México - Liga MX
  253, // EUA - Major League Soccer (MLS)

  // Américas - Competições Continentais (CONMEBOL)
  13,  // Copa Libertadores
  11   // Copa Sul-Americana (Sudamericana)
];

async function getTodayFixtures() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`[API-SPORTS] A consultar jogos para a data: ${today}...`);

  try {
    const response = await axios.get(`${BASE_URL}/fixtures`, {
      params: {
        date: today,
        status: 'NS' // APENAS JOGOS NÃO INICIADOS (Not Started)
      },
      headers: {
        'x-apisports-key': API_SPORTS_KEY
      }
    });

    const allFixtures = response.data.response || [];
    
    // Filtrar apenas pelas ligas selecionadas
    const filteredFixtures = allFixtures.filter(fixture => 
      TARGET_LEAGUES.includes(fixture.league.id)
    );

    console.log(`[API-SPORTS] ${filteredFixtures.length} jogos encontrados nas ligas monitorizadas (Europa + Américas + CONMEBOL).`);
    return filteredFixtures;
  } catch (error) {
    console.error('[API-SPORTS ERRO] Falha ao consultar jogos:', error.response?.data || error.message);
    return [];
  }
}

module.exports = {
  getTodayFixtures,
  TARGET_LEAGUES
};
