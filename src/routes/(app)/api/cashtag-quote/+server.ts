import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CRYPTO_SYMBOLS = new Set([
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'DOT', 'LINK', 'AVAX', 'MATIC',
    'LTC', 'UNI', 'SHIB', 'ATOM', 'FIL', 'APT', 'ARB', 'OP', 'SUI', 'NEAR',
    'BNB', 'TRX', 'TON', 'PEPE', 'WIF', 'BONK',
]);

const CRYPTO_NAMES: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'Ethereum', SOL: 'Solana', XRP: 'XRP', DOGE: 'Dogecoin',
    ADA: 'Cardano', DOT: 'Polkadot', LINK: 'Chainlink', AVAX: 'Avalanche', MATIC: 'Polygon',
    LTC: 'Litecoin', UNI: 'Uniswap', SHIB: 'Shiba Inu', ATOM: 'Cosmos', FIL: 'Filecoin',
    APT: 'Aptos', ARB: 'Arbitrum', OP: 'Optimism', SUI: 'Sui', NEAR: 'NEAR Protocol',
    BNB: 'BNB', TRX: 'TRON', TON: 'Toncoin', PEPE: 'Pepe', WIF: 'dogwifhat', BONK: 'Bonk',
};

interface CacheEntry {
    data: unknown;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key: string): unknown | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: unknown): void {
    cache.set(key, { data, timestamp: Date.now() });
}

async function fetchJapaneseStockFinnhub(code: string, apiKey: string) {
    const finnhubSymbol = `${code}.T`;
    const [quoteRes, profileRes] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`),
        fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(finnhubSymbol)}&token=${apiKey}`),
    ]);

    if (!quoteRes.ok || !profileRes.ok) return null;

    const [quote, profile] = await Promise.all([quoteRes.json(), profileRes.json()]);

    if (!quote.c || quote.c === 0) return null;

    return {
        symbol: code,
        name: profile.name || code,
        logo: profile.logo || '',
        industry: profile.finnhubIndustry || '',
        price: quote.c,
        change: quote.d ?? 0,
        changePercent: quote.dp ?? 0,
        currency: profile.currency || 'JPY',
        isCrypto: false,
        isJapanese: true,
    };
}

async function fetchJapaneseStockYahoo(code: string) {
    const yahooSymbol = `${code}.T`;
    const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } },
    );

    if (!res.ok) return null;

    const body = await res.json();
    const meta = body?.chart?.result?.[0]?.meta;

    if (!meta?.regularMarketPrice) return null;

    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const change = previousClose ? price - previousClose : 0;
    const changePercent = previousClose ? (change / previousClose) * 100 : 0;

    return {
        symbol: code,
        name: meta.shortName || meta.longName || code,
        logo: '',
        industry: '',
        price,
        change,
        changePercent,
        currency: meta.currency || 'JPY',
        isCrypto: false,
        isJapanese: true,
    };
}

export const GET: RequestHandler = async ({ url }) => {
    const symbol = url.searchParams.get('symbol');
    const market = url.searchParams.get('market');
    const isJapanese = market === 'jp';

    if (isJapanese) {
        if (!symbol || !/^\d{4,5}$/.test(symbol)) {
            return json({ error: 'Invalid Japanese stock code' }, { status: 400 });
        }

        const cacheKey = `JP:${symbol}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return json(cached, {
                headers: { 'Cache-Control': 'public, max-age=900' },
            });
        }

        try {
            const FINNHUB_API_KEY = env.FINNHUB_API_KEY;

            let data = FINNHUB_API_KEY
                ? await fetchJapaneseStockFinnhub(symbol, FINNHUB_API_KEY)
                : null;

            if (!data) {
                data = await fetchJapaneseStockYahoo(symbol);
            }

            if (!data) {
                return json({ error: 'No data available' }, { status: 404 });
            }

            setCache(cacheKey, data);
            return json(data, {
                headers: { 'Cache-Control': 'public, max-age=900' },
            });
        } catch {
            return json({ error: 'An internal server error occurred' }, { status: 500 });
        }
    }

    const FINNHUB_API_KEY = env.FINNHUB_API_KEY;
    if (!FINNHUB_API_KEY) {
        return json({ error: 'API key not configured' }, { status: 503 });
    }

    const upperSymbol = symbol?.toUpperCase();
    if (!upperSymbol || !/^[A-Z]{1,5}$/.test(upperSymbol)) {
        return json({ error: 'Invalid symbol' }, { status: 400 });
    }

    const cached = getCached(upperSymbol);
    if (cached) {
        return json(cached, {
            headers: { 'Cache-Control': 'public, max-age=900' },
        });
    }

    const isCrypto = CRYPTO_SYMBOLS.has(upperSymbol);

    try {
        if (isCrypto) {
            const quoteSymbol = `BINANCE:${upperSymbol}USDT`;
            const quoteRes = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(quoteSymbol)}&token=${FINNHUB_API_KEY}`
            );

            if (!quoteRes.ok) {
                return json({ error: 'Failed to fetch quote' }, { status: 502 });
            }

            const quote = await quoteRes.json();

            if (!quote.c || quote.c === 0) {
                return json({ error: 'No data available' }, { status: 404 });
            }

            const data = {
                symbol: upperSymbol,
                name: CRYPTO_NAMES[upperSymbol] || upperSymbol,
                logo: '',
                industry: 'Cryptocurrency',
                price: quote.c,
                change: quote.d ?? 0,
                changePercent: quote.dp ?? 0,
                currency: 'USD',
                isCrypto: true,
                isJapanese: false,
            };

            setCache(upperSymbol, data);
            return json(data, {
                headers: { 'Cache-Control': 'public, max-age=900' },
            });
        }

        const [quoteRes, profileRes] = await Promise.all([
            fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(upperSymbol)}&token=${FINNHUB_API_KEY}`),
            fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(upperSymbol)}&token=${FINNHUB_API_KEY}`),
        ]);

        if (!quoteRes.ok || !profileRes.ok) {
            return json({ error: 'Failed to fetch data' }, { status: 502 });
        }

        const [quote, profile] = await Promise.all([quoteRes.json(), profileRes.json()]);

        if (!quote.c || quote.c === 0) {
            return json({ error: 'No data available' }, { status: 404 });
        }

        const data = {
            symbol: upperSymbol,
            name: profile.name || upperSymbol,
            logo: profile.logo || '',
            industry: profile.finnhubIndustry || '',
            price: quote.c,
            change: quote.d ?? 0,
            changePercent: quote.dp ?? 0,
            currency: profile.currency || 'USD',
            isCrypto: false,
            isJapanese: false,
        };

        setCache(upperSymbol, data);
        return json(data, {
            headers: { 'Cache-Control': 'public, max-age=900' },
        });
    } catch {
        return json({ error: 'An internal server error occurred' }, { status: 500 });
    }
};
