import { parseRbxl } from './binary';
import { parseRbxlx } from './xml';
export { parseRbxl, parseRbxlx };
export type { RobloxPart, RobloxShape, RobloxWorld } from './world';

/** 拡張子に依存せず、ヘッダーでバイナリとXMLを判別する。 */
export const parseRobloxWorld = (buffer: ArrayBuffer) => {
	const bytes = new Uint8Array(buffer);
	return bytes[7] === 0x21 && bytes[8] === 0x89
		? parseRbxl(bytes)
		: Promise.resolve(parseRbxlx(new TextDecoder().decode(bytes)));
};
