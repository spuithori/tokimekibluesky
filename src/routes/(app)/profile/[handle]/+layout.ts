import type { LayoutLoad } from './$types';
import {error} from "@sveltejs/kit";

export const load = (({ params, depends, url,route }) => {
   console.log(params)
   return { params, url, route }

   throw error(404, 'Not found');
}) satisfies LayoutLoad;

export const prerender = false;