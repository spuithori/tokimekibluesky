import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLastRead, setLastRead, getAllLastRead } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
  const did = url.searchParams.get('did');
  const columnId = url.searchParams.get('columnId');

  if (!did) {
    return json({ error: 'did required' }, { status: 400 });
  }

  // If columnId provided, return single value; otherwise return all
  if (columnId) {
    const uri = getLastRead(did, columnId);
    return json({ uri });
  } else {
    const positions = getAllLastRead(did);
    return json({ positions });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  const { did, columnId, uri } = await request.json();

  if (!did || !columnId || !uri) {
    return json({ error: 'did, columnId, and uri required' }, { status: 400 });
  }

  setLastRead(did, columnId, uri);
  return json({ success: true });
};
