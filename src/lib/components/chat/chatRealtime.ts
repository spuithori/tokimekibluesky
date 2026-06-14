type ChatLogHandler = (log: any) => void;

class ChatRealtime {
    private listeners = new Map<string, Set<ChatLogHandler>>();
    private didRefCounts = new Map<string, number>();

    register(did: string, convoId: string, handler: ChatLogHandler): () => void {
        const key = `${did}\n${convoId}`;
        let handlers = this.listeners.get(key);

        if (!handlers) {
            handlers = new Set();
            this.listeners.set(key, handlers);
        }

        handlers.add(handler);
        this.didRefCounts.set(did, (this.didRefCounts.get(did) || 0) + 1);

        return () => {
            handlers.delete(handler);

            if (!handlers.size) {
                this.listeners.delete(key);
            }

            const count = (this.didRefCounts.get(did) || 1) - 1;

            if (count <= 0) {
                this.didRefCounts.delete(did);
            } else {
                this.didRefCounts.set(did, count);
            }
        };
    }

    dispatch(did: string, logs: any[] | undefined): void {
        if (!logs?.length || !this.didRefCounts.has(did)) {
            return;
        }

        for (const log of logs) {
            if (!log?.convoId) {
                continue;
            }

            const handlers = this.listeners.get(`${did}\n${log.convoId}`);

            if (!handlers) {
                continue;
            }

            for (const handler of handlers) {
                try {
                    handler(log);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }

    get activeDids(): Set<string> {
        return new Set(this.didRefCounts.keys());
    }

    get hasActive(): boolean {
        return this.didRefCounts.size > 0;
    }
}

export const chatRealtime = new ChatRealtime();
