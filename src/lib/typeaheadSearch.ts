export type TypeaheadSearch = {
    run: (term: string) => void;
    cancel: () => void;
};

export function createDebouncedSearch<T>(
    fetcher: (term: string, signal: AbortSignal) => Promise<T>,
    handlers: {
        onResult: (result: T) => void;
        onClear?: () => void;
        onError?: (e: unknown) => void;
    },
    delay = 250,
): TypeaheadSearch {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    function run(term: string) {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            const trimmed = term.trim();
            controller?.abort();

            if (!trimmed) {
                controller = undefined;
                handlers.onClear?.();
                return;
            }

            controller = new AbortController();
            const signal = controller.signal;

            try {
                const result = await fetcher(trimmed, signal);
                if (signal.aborted) {
                    return;
                }
                handlers.onResult(result);
            } catch (e: any) {
                if (e?.name === 'AbortError' || signal.aborted) {
                    return;
                }
                if (handlers.onError) {
                    handlers.onError(e);
                } else {
                    console.error(e);
                }
            }
        }, delay);
    }

    function cancel() {
        clearTimeout(timer);
        controller?.abort();
        controller = undefined;
    }

    return { run, cancel };
}
