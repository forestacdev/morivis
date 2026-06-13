import { gsiHandlers } from './gsi';
import { postcodeHandlers } from './postcode';

// 外部通信の代表的な境界だけをここへ集めておく。
export const handlers = [...gsiHandlers, ...postcodeHandlers];
