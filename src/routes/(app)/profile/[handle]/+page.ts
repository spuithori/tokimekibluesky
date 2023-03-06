import type { PageLoad } from './$types';

export const load = (async ({ params, depends }) => {
   return { params }
}) satisfies PageLoad;
