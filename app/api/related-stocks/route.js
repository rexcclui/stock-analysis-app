import { getCache, setCache, getCacheKey, FOUR_HOUR_TTL_MINUTES } from '../../../lib/cache';
import { createNoCacheResponse } from '../../../lib/response';

export const dynamic = 'force-dynamic';

const FMP_KEY = process.env.FMP_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return createNoCacheResponse(
        { error: "Symbol is required" },
        400
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(`related-stocks`, symbol);
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      console.log(`[CACHE HIT] Related stocks for ${symbol}`);
      return createNoCacheResponse(cachedData);
    }

    const relatedStocks = [];

    // 1. Get company profile to find sector and industry
    const profileUrl = `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`;
    const profileResponse = await fetch(profileUrl);

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData && profileData.length > 0) {
        const profile = profileData[0];
        const sector = profile.sector;
        const industry = profile.industry;

        // 2. Get stock screener results for same industry first
        let sameIndustryCount = 0;

        if (sector && industry) {
          const industryScreenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?sector=${encodeURIComponent(sector)}&industry=${encodeURIComponent(industry)}&limit=100&apikey=${FMP_KEY}`;
          const industryScreenerResponse = await fetch(industryScreenerUrl);

          if (industryScreenerResponse.ok) {
            const industryScreenerData = await industryScreenerResponse.json();
            industryScreenerData.forEach(stock => {
              if (stock.symbol !== symbol && sameIndustryCount < 50) {
                relatedStocks.push({
                  symbol: stock.symbol,
                  name: stock.companyName,
                  relationshipType: "Same Industry"
                });
                sameIndustryCount++;
              }
            });
          }

          // If no matches were found in the same industry, fall back to sector-level matches
          if (sameIndustryCount === 0 && sector) {
            const sectorScreenerUrl = `https://financialmodelingprep.com/api/v3/stock-screener?sector=${encodeURIComponent(sector)}&limit=100&apikey=${FMP_KEY}`;
            const sectorScreenerResponse = await fetch(sectorScreenerUrl);

            if (sectorScreenerResponse.ok) {
              const sectorScreenerData = await sectorScreenerResponse.json();
              let sameSectorCount = 0;
              sectorScreenerData.forEach(stock => {
                if (stock.symbol !== symbol && !relatedStocks.find(s => s.symbol === stock.symbol) && sameSectorCount < 50) {
                  relatedStocks.push({
                    symbol: stock.symbol,
                    name: stock.companyName,
                    relationshipType: "Same Sector"
                  });
                  sameSectorCount++;
                }
              });
            }
          }
        }

        // 3. Get peers/competitors (cap at 50)
        let competitorCount = 0;
        const peersUrl = `https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${FMP_KEY}`;
        const peersResponse = await fetch(peersUrl);

        if (peersResponse.ok) {
          const peersData = await peersResponse.json();
          if (peersData && peersData.length > 0 && peersData[0].peersList) {
            const peers = peersData[0].peersList;

            for (const peerSymbol of peers) {
              if (peerSymbol !== symbol && !relatedStocks.find(s => s.symbol === peerSymbol) && competitorCount < 50) {
                // Get peer company name
                const peerProfileUrl = `https://financialmodelingprep.com/api/v3/profile/${peerSymbol}?apikey=${FMP_KEY}`;
                const peerProfileResponse = await fetch(peerProfileUrl);

                if (peerProfileResponse.ok) {
                  const peerProfileData = await peerProfileResponse.json();
                  if (peerProfileData && peerProfileData.length > 0) {
                    relatedStocks.push({
                      symbol: peerSymbol,
                      name: peerProfileData[0].companyName,
                      relationshipType: "Competitor"
                    });
                    competitorCount++;
                  }
                }

                if (competitorCount >= 50) break;
              }
            }
          }
        }

        // 4. Get ETF holders (indicates similar investment themes, cap at 50)
        let coHeldCount = 0;
        const etfHoldersUrl = `https://financialmodelingprep.com/api/v3/etf-holder/${symbol}?apikey=${FMP_KEY}`;
        const etfHoldersResponse = await fetch(etfHoldersUrl);

        if (etfHoldersResponse.ok) {
          const etfHoldersData = await etfHoldersResponse.json();
          if (etfHoldersData && etfHoldersData.length > 0) {
            // Get top ETFs that hold this stock
            for (const etfHolder of etfHoldersData.slice(0, 3)) {
              if (etfHolder && etfHolder.etfSymbol && coHeldCount < 50) {
                // Get other stocks in this ETF
                const etfHoldingsUrl = `https://financialmodelingprep.com/api/v3/etf-holder/${etfHolder.etfSymbol}?apikey=${FMP_KEY}`;
                const etfHoldingsResponse = await fetch(etfHoldingsUrl);

                if (etfHoldingsResponse.ok) {
                  const etfHoldingsData = await etfHoldingsResponse.json();
                  if (etfHoldingsData && etfHoldingsData.length > 0) {
                    for (const holding of etfHoldingsData) {
                      if (holding.asset !== symbol && !relatedStocks.find(s => s.symbol === holding.asset) && coHeldCount < 50) {
                        relatedStocks.push({
                          symbol: holding.asset,
                          name: holding.name || holding.asset,
                          relationshipType: `Co-held in ${etfHolder.etfSymbol}`
                        });
                        coHeldCount++;
                      }
                      if (coHeldCount >= 50) break;
                    }
                  }
                }
              }
              if (coHeldCount >= 50) break;
            }
          }
        }
      }
    }

    const result = {
      symbol,
      relatedStocks: relatedStocks.slice(0, 200) // Up to 50 per type x 4 types
    };

    // Cache the result (4 hours)
    setCache(cacheKey, result, FOUR_HOUR_TTL_MINUTES);

    return createNoCacheResponse(result);
  } catch (error) {
    console.error("Error in related-stocks API:", error);
    return createNoCacheResponse(
      { error: error.message || "Internal server error" },
      500
    );
  }
}
