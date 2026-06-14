import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// 利用時は `pnpm exec msw init static --save=false` で生成した worker を使う。
export const worker = setupWorker(...handlers);
