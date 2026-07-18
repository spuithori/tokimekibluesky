import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDebouncedSearch } from "./typeaheadSearch";

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("createDebouncedSearch", () => {
    it("debounces consecutive runs into a single fetch of the last term", async () => {
        const fetcher = vi.fn().mockResolvedValue(["result"]);
        const onResult = vi.fn();
        const search = createDebouncedSearch(fetcher, { onResult });

        search.run("a");
        search.run("ab");
        search.run("abc");
        await vi.advanceTimersByTimeAsync(250);

        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(fetcher.mock.calls[0][0]).toBe("abc");
        expect(onResult).toHaveBeenCalledWith(["result"]);
    });

    it("clears instead of fetching when the term is empty", async () => {
        const fetcher = vi.fn();
        const onResult = vi.fn();
        const onClear = vi.fn();
        const search = createDebouncedSearch(fetcher, { onResult, onClear });

        search.run("   ");
        await vi.advanceTimersByTimeAsync(250);

        expect(fetcher).not.toHaveBeenCalled();
        expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("aborts the in-flight request when a new search fires and drops the stale result", async () => {
        const seen: AbortSignal[] = [];
        const deferred: Array<(value: string[]) => void> = [];
        const fetcher = vi.fn((term: string, signal: AbortSignal) => {
            seen.push(signal);
            return new Promise<string[]>((resolve) => {
                deferred.push(resolve);
            });
        });
        const onResult = vi.fn();
        const search = createDebouncedSearch(fetcher, { onResult });

        search.run("slow");
        await vi.advanceTimersByTimeAsync(250);
        search.run("fast");
        await vi.advanceTimersByTimeAsync(250);

        expect(seen[0].aborted).toBe(true);
        expect(seen[1].aborted).toBe(false);

        deferred[0](["slow-result"]);
        await Promise.resolve();
        expect(onResult).not.toHaveBeenCalled();

        deferred[1](["fast-result"]);
        await Promise.resolve();
        expect(onResult).toHaveBeenCalledTimes(1);
        expect(onResult).toHaveBeenCalledWith(["fast-result"]);
    });

    it("swallows AbortError and reports other errors via onError", async () => {
        const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
        const fetcher = vi.fn().mockRejectedValueOnce(abortError).mockRejectedValueOnce(new Error("boom"));
        const onResult = vi.fn();
        const onError = vi.fn();
        const search = createDebouncedSearch(fetcher, { onResult, onError });

        search.run("first");
        await vi.advanceTimersByTimeAsync(250);
        expect(onError).not.toHaveBeenCalled();

        search.run("second");
        await vi.advanceTimersByTimeAsync(250);
        expect(onError).toHaveBeenCalledTimes(1);
    });

    it("cancel() stops the pending timer and aborts the in-flight request", async () => {
        const seen: AbortSignal[] = [];
        const fetcher = vi.fn((term: string, signal: AbortSignal) => {
            seen.push(signal);
            return new Promise<string[]>(() => {});
        });
        const onResult = vi.fn();
        const search = createDebouncedSearch(fetcher, { onResult });

        search.run("pending");
        search.cancel();
        await vi.advanceTimersByTimeAsync(250);
        expect(fetcher).not.toHaveBeenCalled();

        search.run("inflight");
        await vi.advanceTimersByTimeAsync(250);
        search.cancel();
        expect(seen[0].aborted).toBe(true);
    });
});
