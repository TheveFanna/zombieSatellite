import { createTleProxyHandler } from '../../../lib/shell/index';

export const GET = createTleProxyHandler({ fetch: (input, init) => globalThis.fetch(input, init) });
