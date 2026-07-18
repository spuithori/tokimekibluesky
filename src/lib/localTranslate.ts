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

const MAX_TRANSLATOR_INSTANCES = 3;

function touchInstanceEntry(key: string, entry: Entry): void {
    instances.delete(key);
    instances.set(key, entry);
}

function storeInstance(key: string, instance: Translator): void {
    instances.delete(key);
    instances.set(key, { instance });
    evictOverflowInstances();
}

function evictOverflowInstances(): void {
    let liveCount = 0;
    for (const entry of instances.values()) {
        if (entry.instance) liveCount++;
    }
    if (liveCount <= MAX_TRANSLATOR_INSTANCES) {
        return;
    }

    for (const [key, entry] of instances) {
        if (!entry.instance) continue;
        try {
            entry.instance.destroy();
        } catch (e) {}
        instances.delete(key);
        liveCount--;
        if (liveCount <= MAX_TRANSLATOR_INSTANCES) {
            return;
        }
    }
}

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
        touchInstanceEntry(key, existing);
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
            storeInstance(key, instance);
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

export function warmUpTranslator(
    source: string | undefined,
    target: string | undefined,
    onProgress?: (progress: number) => void,
): Promise<"ready" | "unavailable" | "retry"> {
    const s = normalizeTranslateLang(source);
    const t = normalizeTranslateLang(target);
    if (!isLocalTranslateSupported() || !s || !t || s === t) {
        return Promise.resolve("unavailable");
    }

    const key = `${s}->${t}`;
    const existing = instances.get(key);
    if (existing?.instance) {
        touchInstanceEntry(key, existing);
        return Promise.resolve("ready");
    }
    if (existing?.unavailable) return Promise.resolve("unavailable");

    const settle = (instance: Translator | null) =>
        instance
            ? "ready"
            : instances.get(key)?.unavailable
              ? ("unavailable" as const)
              : ("retry" as const);

    if (existing?.promise) {
        return existing.promise.then(settle);
    }

    const createOptions: TranslatorCreateOptions = {
        sourceLanguage: s,
        targetLanguage: t,
    };
    if (onProgress) {
        createOptions.monitor = (monitor) => {
            monitor.addEventListener("downloadprogress", (e) =>
                onProgress(e.loaded),
            );
        };
    }

    const promise = self.Translator.create(createOptions)
        .then((instance) => {
            storeInstance(key, instance as Translator);
            translatorReady.update((n) => n + 1);
            return instance as Translator;
        })
        .catch((e) => {
            if ((e as DOMException)?.name === "NotSupportedError") {
                instances.set(key, { unavailable: true });
            } else {
                instances.delete(key);
            }
            return null;
        });

    instances.set(key, { promise });
    return promise.then(settle);
}

export async function getTranslatorAvailability(
    source: string | undefined,
    target: string | undefined,
): Promise<TranslatorAvailability> {
    const s = normalizeTranslateLang(source);
    const t = normalizeTranslateLang(target);
    if (!s || !t) {
        return "unavailable";
    }
    return (await getAvailability(s, t)) as TranslatorAvailability;
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

    const translator = await acquireTranslator(
        normalizeTranslateLang(source),
        normalizeTranslateLang(target),
        { fromGesture: !!opts.fromGesture },
    );

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
