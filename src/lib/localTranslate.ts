import { writable } from "svelte/store";
import { buildTranslatedRecord, HAS_LETTER } from "$lib/translate";

export const translatorReady = writable(0);

type Entry = {
    instance?: Translator;
    promise?: Promise<Translator | null>;
    unavailable?: boolean;
};

type AcquireOptions = {
    fromGesture: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: number) => void;
};

const instances = new Map<string, Entry>();

const MAX_CONCURRENT = 2;
let activeCount = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
    if (activeCount < MAX_CONCURRENT) {
        activeCount++;
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        waiters.push(() => {
            activeCount++;
            resolve();
        });
    });
}

function releaseSlot(): void {
    activeCount--;
    const next = waiters.shift();
    if (next) {
        next();
    }
}

export function isLocalTranslateSupported(): boolean {
    return (
        typeof self !== "undefined" &&
        "Translator" in self &&
        self.isSecureContext
    );
}

export function normalizeTranslateLang(tag?: string): string | undefined {
    if (!tag) {
        return undefined;
    }

    const [base, ...rest] = tag.toLowerCase().split("-");

    if (!base) {
        return undefined;
    }

    if (base === "zh") {
        const sub = rest.join("-");
        if (
            sub === "tw" ||
            sub === "hk" ||
            sub === "mo" ||
            sub.includes("hant")
        ) {
            return "zh-Hant";
        }
        return "zh";
    }

    return base;
}

export function pickSourceLang(
    langs: string[] | undefined,
    target?: string,
): string | undefined {
    if (!Array.isArray(langs) || !langs.length || !target) {
        return undefined;
    }

    const normalized = langs
        .map(normalizeTranslateLang)
        .filter((lang): lang is string => !!lang && lang !== "und");

    // The post already includes the user's language, so it does not need translating.
    if (!normalized.length || normalized.includes(target)) {
        return undefined;
    }

    return normalized[0];
}

async function getAvailability(
    source: string,
    target: string,
): Promise<string> {
    if (!isLocalTranslateSupported() || source === target) {
        return "unavailable";
    }

    try {
        return await self.Translator.availability({
            sourceLanguage: source,
            targetLanguage: target,
        });
    } catch (e) {
        return "unavailable";
    }
}

async function acquireTranslator(
    source: string | undefined,
    target: string | undefined,
    opts: AcquireOptions,
): Promise<Translator | null> {
    if (
        !isLocalTranslateSupported() ||
        !source ||
        !target ||
        source === target
    ) {
        return null;
    }

    const key = `${source}->${target}`;
    const existing = instances.get(key);

    if (existing?.unavailable) {
        return null;
    }
    if (existing?.instance) {
        return existing.instance;
    }
    if (existing?.promise) {
        return existing.promise;
    }

    const promise = (async () => {
        const availability = await getAvailability(source, target);

        if (availability === "unavailable") {
            instances.set(key, { unavailable: true });
            return null;
        }

        if (!opts.fromGesture && availability !== "available") {
            instances.delete(key);
            return null;
        }

        try {
            const createOptions: TranslatorCreateOptions = {
                sourceLanguage: source,
                targetLanguage: target,
            };

            if (opts.onProgress) {
                createOptions.monitor = (monitor) => {
                    monitor.addEventListener("downloadprogress", (e) => {
                        opts.onProgress?.(e.loaded);
                    });
                };
            }

            const instance = await self.Translator.create(createOptions);
            instances.set(key, { instance });
            translatorReady.update((n) => n + 1);
            return instance;
        } catch (e) {
            if ((e as DOMException)?.name === "NotSupportedError") {
                instances.set(key, { unavailable: true });
            } else {
                instances.delete(key);
            }
            return null;
        }
    })();

    instances.set(key, { promise });
    return promise;
}

export async function warmUpTranslator(
    source: string | undefined,
    target: string | undefined,
    onProgress?: (progress: number) => void,
): Promise<boolean> {
    const instance = await acquireTranslator(
        normalizeTranslateLang(source),
        normalizeTranslateLang(target),
        { fromGesture: true, onProgress },
    );
    return !!instance;
}

export function getCachedTranslator(
    source: string | undefined,
    target: string | undefined,
): Translator | null {
    const nSource = normalizeTranslateLang(source);
    const nTarget = normalizeTranslateLang(target);
    if (!nSource || !nTarget || nSource === nTarget) {
        return null;
    }
    return instances.get(`${nSource}->${nTarget}`)?.instance ?? null;
}

export async function translateLocal(
    text: string,
    source: string | undefined,
    target: string | undefined,
    opts: { fromGesture?: boolean; signal?: AbortSignal } = {},
): Promise<string | null> {
    if (!text) {
        return null;
    }

    const translator = opts.fromGesture
        ? await acquireTranslator(
              normalizeTranslateLang(source),
              normalizeTranslateLang(target),
              { fromGesture: true },
          )
        : getCachedTranslator(source, target);

    if (!translator || opts.signal?.aborted) {
        return null;
    }

    await acquireSlot();

    try {
        if (opts.signal?.aborted) {
            return null;
        }
        const result = await translator.translate(text);
        return opts.signal?.aborted ? null : result;
    } catch (e) {
        return null;
    } finally {
        releaseSlot();
    }
}

async function translateProseLocal(
    text: string,
    source: string | undefined,
    target: string | undefined,
    opts: { fromGesture?: boolean; signal?: AbortSignal },
): Promise<string | null> {
    const lines = text.split("\n");
    const out: string[] = [];

    for (const line of lines) {
        if (!HAS_LETTER.test(line)) {
            out.push(line);
            continue;
        }

        const leading = line.match(/^\s*/)?.[0] ?? "";
        const trailing = line.match(/\s*$/)?.[0] ?? "";
        const core = line.slice(leading.length, line.length - trailing.length);

        const translated = await translateLocal(core, source, target, opts);
        if (translated == null) {
            return null;
        }

        out.push(leading + translated + trailing);
    }

    return out.join("\n");
}

export async function formatLocalTranslateRecord(
    text: string,
    source: string | undefined,
    target: string | undefined,
    _agent: any,
    record: any,
    opts: { fromGesture?: boolean; signal?: AbortSignal } = {},
) {
    return buildTranslatedRecord(record ?? { text }, (prose) =>
        translateProseLocal(prose, source, target, opts),
    );
}

export function disposeAllTranslators(): void {
    for (const entry of instances.values()) {
        try {
            entry.instance?.destroy();
        } catch (e) {}
    }
    instances.clear();
}
