import type { LayoutLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load = (({ params, url }) => {
   return { params, url }
   // throw error(404, 'Not found');
}) satisfies LayoutLoad;

export const prerender = false;