import { browser, dev } from '$app/environment';
import { advanceState, normalizeRoute, randomInt, type AnalyticsEvent, type AnalyticsState } from './session';

const MEASUREMENT_ID = 'G-XW80FHPE9G';
const HOSTS = ['tokimeki.blue', 'tokimekibluesky.vercel.app'];
const ENDPOINT = 'https://www.google-analytics.com/g/collect';
const STORAGE_KEY = 'tokimeki-ga';
const MIN_ENGAGEMENT = 1000;

type ClientHints = Record<string, string>;

interface UserAgentData {
    getHighEntropyValues(hints: string[]): Promise<{
        architecture?: string;
        bitness?: string;
        fullVersionList?: { brand: string; version: string }[];
        mobile?: boolean;
        model?: string;
        platform?: string;
        platformVersion?: string;
        wow64?: boolean;
    }>;
}

const enabled = browser && !dev && HOSTS.includes(location.hostname);
const pageId = randomInt();

let clientHints: Promise<ClientHints> | undefined;
let hitCount = 0;
let currentPath = '';
let visibleSince = 0;
let pendingEngagement = 0;

function loadClientHints(): Promise<ClientHints> {
    const data = (navigator as Navigator & { userAgentData?: UserAgentData }).userAgentData;
    if (!data) {
        return Promise.resolve({});
    }

    return data
        .getHighEntropyValues(['architecture', 'bitness', 'fullVersionList', 'model', 'platformVersion', 'wow64'])
        .then(
            (values) => ({
                uaa: values.architecture ?? '',
                uab: values.bitness ?? '',
                uafvl: (values.fullVersionList ?? [])
                    .map(({ brand, version }) => `${encodeURIComponent(brand)};${version}`)
                    .join('|'),
                uamb: values.mobile ? '1' : '0',
                uam: values.model ?? '',
                uap: values.platform ?? '',
                uapv: values.platformVersion ?? '',
                uaw: values.wow64 ? '1' : '0',
            }),
            () => ({}),
        );
}

function readState(): AnalyticsState | null {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
        return typeof value?.cid === 'string' ? value : null;
    } catch {
        return null;
    }
}

function settleEngagement(now: number) {
    if (visibleSince && now > visibleSince) {
        pendingEngagement += now - visibleSince;
        visibleSince = now;
    }
}

function dispatch(event: AnalyticsEvent, now: number, path: string, referrer: string, hints: ClientHints) {
    settleEngagement(now);
    const { state, firstVisit, sessionStart } = advanceState(readState(), event, pendingEngagement, now);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        return;
    }

    const params = new URLSearchParams({
        v: '2',
        tid: MEASUREMENT_ID,
        _p: String(pageId),
        cid: state.cid,
        ul: navigator.language.toLowerCase(),
        sr: `${screen.width}x${screen.height}`,
        ...hints,
        _s: String(++hitCount),
        sid: String(state.sid),
        sct: String(state.sct),
        seg: String(state.seg),
        dl: location.origin + path,
        dt: path,
        en: event,
    });

    if (referrer) {
        params.set('dr', referrer);
    }
    if (firstVisit) {
        params.set('_fv', '1');
    }
    if (sessionStart) {
        params.set('_nsi', '1');
        params.set('_ss', '1');
    }
    if (pendingEngagement) {
        params.set('_et', String(pendingEngagement));
        pendingEngagement = 0;
    }

    fetch(`${ENDPOINT}?${params}`, {
        method: 'POST',
        mode: 'no-cors',
        credentials: 'omit',
        keepalive: true,
        priority: 'low',
    }).catch(() => {});
}

function queue(event: AnalyticsEvent, now: number, path: string, referrer: string) {
    clientHints?.then((hints) => dispatch(event, now, path, referrer, hints));
}

function handleVisibilityChange() {
    const now = Date.now();

    if (document.visibilityState === 'visible') {
        visibleSince = now;
        return;
    }

    settleEngagement(now);
    visibleSince = 0;

    if (pendingEngagement >= MIN_ENGAGEMENT) {
        queue('user_engagement', now, currentPath, '');
    }
}

function externalReferrer(path: string) {
    const referrer = document.referrer;
    if (!referrer || path.startsWith('/oauth/') || referrer.startsWith(`${location.origin}/`)) {
        return '';
    }
    return referrer;
}

export function trackPageView(routeId: string) {
    if (!enabled) {
        return;
    }

    const now = Date.now();
    const path = normalizeRoute(routeId);
    let referrer: string;

    if (clientHints) {
        referrer = location.origin + currentPath;
    } else {
        clientHints = loadClientHints();
        referrer = externalReferrer(path);
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (!visibleSince && document.visibilityState === 'visible') {
        visibleSince = now;
    }

    currentPath = path;
    queue('page_view', now, path, referrer);
}
