<script lang="ts">
    import { settings } from '$lib/stores';

    interface Props {
        symbol: string;
        japanese?: boolean;
    }

    let { symbol, japanese = false }: Props = $props();

    let data = $state<{
        symbol: string;
        name: string;
        logo: string;
        industry: string;
        price: number;
        change: number;
        changePercent: number;
        currency: string;
        isCrypto: boolean;
        isJapanese: boolean;
    } | null>(null);
    let loading = $state(true);
    let error = $state(false);
    let skipped = $state(false);

    $effect(() => {
        loading = true;
        error = false;
        data = null;
        skipped = false;

        const apiKey = $settings?.general?.finnhubApiKey || '';

        if (!apiKey && !japanese) {
            skipped = true;
            loading = false;
            return;
        }

        const params = new URLSearchParams({ symbol });
        if (japanese) params.set('market', 'jp');

        const headers: Record<string, string> = {};
        if (apiKey) {
            headers['X-Finnhub-Token'] = apiKey;
        }

        fetch(`/api/cashtag-quote?${params}`, { headers })
            .then((res) => {
                if (!res.ok) throw new Error();
                return res.json();
            })
            .then((json) => {
                if (json.error) throw new Error();
                data = json;
                loading = false;
            })
            .catch(() => {
                error = true;
                loading = false;
            });
    });

    function formatPrice(price: number, currency: string): string {
        try {
            const options: Intl.NumberFormatOptions = {
                style: 'currency',
                currency,
            };

            if (currency === 'JPY') {
                options.minimumFractionDigits = 0;
                options.maximumFractionDigits = 0;
            } else {
                options.minimumFractionDigits = 2;
                options.maximumFractionDigits = 2;
            }
            return new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'en-US', options).format(price);
        } catch {
            return `${currency} ${price.toFixed(currency === 'JPY' ? 0 : 2)}`;
        }
    }

    function formatChange(change: number, currency: string): string {
        const sign = change >= 0 ? '+' : '';
        const decimals = currency === 'JPY' ? 0 : 2;
        return `${sign}${change.toFixed(decimals)}`;
    }

    function formatChangePercent(percent: number): string {
        const sign = percent >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(2)}%`;
    }

    function displaySymbol(d: NonNullable<typeof data>): string {
        if (d.isJapanese) return `$¥${d.symbol}`;
        return `$${d.symbol}`;
    }
</script>

{#if loading}
    <div class="cashtag-card cashtag-card--loading">
        <div class="cashtag-card__logo skeleton"></div>
        <div class="cashtag-card__info">
            <div class="skeleton skeleton--text skeleton--name"></div>
            <div class="skeleton skeleton--text skeleton--price"></div>
        </div>
    </div>
{:else if data && !error}
    <div class="cashtag-card">
        {#if data.logo}
            <img class="cashtag-card__logo" src={data.logo} alt={data.name} />
        {:else}
            <div class="cashtag-card__logo cashtag-card__logo--placeholder">
                <span>{data.isJapanese ? '¥' : data.symbol.charAt(0)}</span>
            </div>
        {/if}

        <div class="cashtag-card__info">
            <div class="cashtag-card__header">
                <span class="cashtag-card__name">{data.name}</span>
                <span class="cashtag-card__symbol">{displaySymbol(data)}</span>
                {#if data.industry}
                    <span class="cashtag-card__industry">{data.industry}</span>
                {/if}
            </div>
            <div class="cashtag-card__price-row">
                <span class="cashtag-card__price">{formatPrice(data.price, data.currency)}</span>
                <span class="cashtag-card__change" class:positive={data.change >= 0} class:negative={data.change < 0}>
                    {formatChange(data.change, data.currency)} ({formatChangePercent(data.changePercent)})
                </span>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .cashtag-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color-1);
    }

    .cashtag-card--loading {
        min-height: 60px;
    }

    .cashtag-card__logo {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        flex-shrink: 0;
        object-fit: cover;
        background-color: var(--bg-color-2);
    }

    .cashtag-card__logo--placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: 700;
        color: var(--text-color-3);
    }

    .cashtag-card__info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    .cashtag-card__header {
        display: flex;
        align-items: baseline;
        gap: 6px;
        flex-wrap: wrap;
    }

    .cashtag-card__name {
        font-weight: 700;
        font-size: 14px;
        color: var(--text-color-1);
    }

    .cashtag-card__symbol {
        font-size: 13px;
        color: var(--text-color-3);
    }

    .cashtag-card__industry {
        font-size: 12px;
        color: var(--text-color-3);
    }

    .cashtag-card__price-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
    }

    .cashtag-card__price {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color-1);
    }

    .cashtag-card__change {
        font-size: 13px;
        font-weight: 500;
    }

    .cashtag-card__change.positive {
        color: #22c55e;
    }

    .cashtag-card__change.negative {
        color: #ef4444;
    }

    .skeleton {
        background: var(--bg-color-2);
        border-radius: 4px;
        animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton--text {
        height: 14px;
    }

    .skeleton--name {
        width: 120px;
    }

    .skeleton--price {
        width: 80px;
        margin-top: 4px;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
</style>
