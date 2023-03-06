import type { PageLoad } from './$types';
import {error} from "@sveltejs/kit";

export const load = (({ params, depends }) => {
   console.log(params)
   return { params }

   throw error(404, 'Not found');
}) satisfies PageLoad;

export const prerender = false;