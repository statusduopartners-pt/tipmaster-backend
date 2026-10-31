require('dotenv').config();
const axios = require('axios');

const apiSportsClient = axios.create({
  baseURL: 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': process.env.API_SPORTS_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
  },
  timeout: 10000
});

const cache = {
  fixtures: { date: null, data: [] },
  odds: {}
};

async function getTodayFixtures(leagueIds = [39, 94, 140, 135, 78, 61, 2, 3]) {
  const today = new Date().toISOString().split('T')[0];

  if (cache.fixtures.date === today && cache.fixtures.data.length > 0) {
    console.log('[API-SPORTS] A utilizar jogos em cache para hoje.');
    return cache.fixtures.data;
  }

  try {
    console.log([API-SPORTS] A consultar novos jogos para a data: ...);
    const response = await apiSportsClient.get('/fixtures', {
      params: {
        date: today,
        status: 'NS',
        timezone: 'Europe/Lisbon'
      }
    });

    const allFixtures = response.data.response || [];
    const filteredFixtures = allFixtures.filter(item => 
      leagueIds.includes(item.league.id)
    );

    cache.fixtures.date = today;
    cache.fixtures.data = filteredFixtures;

    console.log([API-SPORTS]  jogos encontrados nas ligas principais.);
    return filteredFixtures;
  } catch (error) {
    console.error('[API-SPORTS ERRO] Falha ao consultar fixtures:', error.response?.data || error.message);
    return [];
  }
}

async function getFixtureOdds(fixtureId) {
  if (cache.odds[fixtureId]) {
    return cache.odds[fixtureId];
  }

  try {
    const response = await apiSportsClient.get('/odds', {
      params: { fixture: fixtureId }
    });

    const oddsData = response.data.response?.[0]?.bookmakers || [];
    cache.odds[fixtureId] = oddsData;
    return oddsData;
  } catch (error) {
    console.error([API-SPORTS ERRO] Falha ao obter odds ():, error.message);
    return [];
  }
}

module.exports = {
  getTodayFixtures,
  getFixtureOdds
};
