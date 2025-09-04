import type { PageLoad } from './$types';
import {getEndpoint} from "$lib/util";

export const load: PageLoad = async ({ params }) => {
    return {
        endpoint: await getEndpoint(params.handle)
    };
};

export const prerender = false;