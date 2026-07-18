import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("$lib/translate", () => ({
    buildTranslatedRecord: (record: any) => Promise.resolve(record),
    HAS_LETTER: /\p{L}/u,
}));

import { warmUpTranslator, disposeAllTranslators } from "./localTranslate";

type CreatedRecord = { key: string; destroyed: boolean };

const created: CreatedRecord[] = [];

beforeEach(() => {
    disposeAllTranslators();
    created.length = 0;

    vi.stubGlobal("isSecureContext", true);
    (self as any).Translator = {
        availability: vi.fn().mockResolvedValue("available"),
        create: vi.fn(async ({ sourceLanguage, targetLanguage }: any) => {
            const rec: CreatedRecord = {
                key: `${sourceLanguage}->${targetLanguage}`,
                destroyed: false,
            };
            created.push(rec);
            return {
                translate: async (text: string) => text,
                destroy: () => {
                    rec.destroyed = true;
                },
            };
        }),
    };
});

describe("translator instance LRU", () => {
    it("keeps at most 3 live instances and destroys the oldest on overflow", async () => {
        expect(await warmUpTranslator("en", "ja")).toBe("ready");
        expect(await warmUpTranslator("ko", "ja")).toBe("ready");
        expect(await warmUpTranslator("fr", "ja")).toBe("ready");
        expect(await warmUpTranslator("de", "ja")).toBe("ready");

        expect(created).toHaveLength(4);
        expect(created[0].destroyed).toBe(true);
        expect(created[1].destroyed).toBe(false);
        expect(created[2].destroyed).toBe(false);
        expect(created[3].destroyed).toBe(false);
    });

    it("refreshes recency on hit so the touched pair survives eviction", async () => {
        await warmUpTranslator("en", "ja");
        await warmUpTranslator("ko", "ja");
        await warmUpTranslator("fr", "ja");

        expect(await warmUpTranslator("en", "ja")).toBe("ready");
        expect((self as any).Translator.create).toHaveBeenCalledTimes(3);

        await warmUpTranslator("de", "ja");

        expect(created[0].destroyed).toBe(false);
        expect(created[1].destroyed).toBe(true);
        expect(created[2].destroyed).toBe(false);
    });

    it("disposeAllTranslators destroys every remaining instance", async () => {
        await warmUpTranslator("en", "ja");
        await warmUpTranslator("ko", "ja");

        disposeAllTranslators();

        expect(created.every((rec) => rec.destroyed)).toBe(true);
    });
});
