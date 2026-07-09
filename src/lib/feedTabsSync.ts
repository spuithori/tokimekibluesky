import type { ColumnState } from '$lib/classes/columnState.svelte';
import type { TabsNode } from '$lib/classes/deckLayout';
import { diffPinnedTabs, feedKeyOfPinnedItem, type PinnedFeedItem } from '$lib/classes/feedTabs';

const syncing = new WeakSet<TabsNode>();

async function resolveName(item: PinnedFeedItem, _agent: any): Promise<string> {
    try {
        if (item.type === 'feed') {
            const res = await _agent.xrpc.get('app.bsky.feed.getFeedGenerator', { feed: item.value });
            return res?.view?.displayName ?? item.value;
        }
        if (item.type === 'list') {
            const res = await _agent.xrpc.get('app.bsky.graph.getList', { list: item.value });
            return res?.list?.name ?? item.value;
        }
    } catch (e) {
        console.error(`feed tabs: failed to resolve ${item.type}: ${item.value}`, e);
    }
    return item.value;
}

export async function syncPinnedFeedTabs(columnState: ColumnState, node: TabsNode, _agent: any): Promise<void> {
    if (!_agent || node?.type !== 'tabs' || node.source !== 'pinned') return;
    if (syncing.has(node)) return;
    syncing.add(node);
    try {
        const pinned: PinnedFeedItem[] = await _agent.getV2PinnedFeeds();
        if (!pinned.length) return;
        const { toAdd } = diffPinnedTabs(node.children, columnState.columns, pinned);
        let items = pinned;
        if (toAdd.length) {
            const names = await Promise.all(toAdd.map((item) => resolveName(item, _agent)));
            const nameByKey = new Map(toAdd.map((item, i) => [feedKeyOfPinnedItem(item), names[i]]));
            items = pinned.map((item) => {
                const name = nameByKey.get(feedKeyOfPinnedItem(item));
                return name === undefined ? item : { ...item, name };
            });
        }
        columnState.applyPinnedSync(node, items, _agent.did(), _agent.handle());
    } catch (e) {
        console.error('feed tabs: pinned sync failed', e);
    } finally {
        syncing.delete(node);
    }
}
