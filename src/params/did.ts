import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = (param) => param.startsWith('did:') || param.startsWith('did%3A');
