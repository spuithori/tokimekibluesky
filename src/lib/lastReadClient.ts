// Debounced writes to avoid hammering the API
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();
const DEBOUNCE_MS = 2000;

export async function getLastReadUri(did: string, columnId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/last-read?did=${encodeURIComponent(did)}&columnId=${encodeURIComponent(columnId)}`);
    const data = await res.json();
    return data.uri ?? null;
  } catch (e) {
    console.error('Failed to get last read position:', e);
    return null;
  }
}

export async function getAllLastReadPositions(did: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/last-read?did=${encodeURIComponent(did)}`);
    const data = await res.json();
    return data.positions ?? {};
  } catch (e) {
    console.error('Failed to get last read positions:', e);
    return {};
  }
}

export function setLastReadUri(did: string, columnId: string, uri: string): void {
  const key = `${did}:${columnId}`;

  // Clear any pending write for this column
  const existing = pendingWrites.get(key);
  if (existing) clearTimeout(existing);

  // Debounce the write
  pendingWrites.set(key, setTimeout(async () => {
    pendingWrites.delete(key);
    try {
      await fetch('/api/last-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ did, columnId, uri })
      });
    } catch (e) {
      console.error('Failed to save last read position:', e);
    }
  }, DEBOUNCE_MS));
}
