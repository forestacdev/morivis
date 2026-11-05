import legacyBlocks from './legacy-blocks.json';
import type { NbtCompound, NbtValue } from './nbt';

// PrismarineJS/minecraft-data, data/pc/common/legacy.json の blocks（出典はREADME.md）。
const states: Record<string, string> = legacyBlocks;

const nibble = (bytes: Uint8Array, index: number) => (bytes[index >> 1] >> ((index & 1) * 4)) & 15;

/** 数値IDとメタデータから共通パレットへの変換結果はリージョン内で再利用する。 */
export const createLegacySectionDecoder = (registerBlock: (state: NbtValue) => number) => {
	const mapped = new Map<number, number>();
	return (section: NbtCompound) => {
		const { Blocks: ids, Add: high, Data: metadata } = section;
		if (!(ids instanceof Uint8Array) || ids.length !== 4096) {
			throw new Error('旧形式のBlocksは4096バイト必要です');
		}
		if (!(metadata instanceof Uint8Array) || metadata.length !== 2048) {
			throw new Error('旧形式のDataは2048バイト必要です');
		}
		if (high !== undefined && (!(high instanceof Uint8Array) || high.length !== 2048)) {
			throw new Error('旧形式のAddは2048バイト必要です');
		}
		const blocks = new Uint16Array(4096);
		for (let i = 0; i < blocks.length; i++) {
			const id = ids[i] | (high ? nibble(high, i) << 8 : 0);
			if (id === 0) continue;
			const data = nibble(metadata, i);
			const key = (id << 4) | data;
			let paletteId = mapped.get(key);
			if (paletteId === undefined) {
				const state = states[`${id}:${data}`] ?? states[`${id}:0`]
					?? `legacy:block_${id}_${data}`;
				const [name, properties] = state.replace(/\]$/, '').split('[');
				paletteId = registerBlock({
					id: name,
					properties: properties
						? Object.fromEntries(properties.split(',').map(pair => pair.split('=')))
						: {}
				});
				mapped.set(key, paletteId);
			}
			blocks[i] = paletteId;
		}
		return blocks.every(id => id === blocks[0]) ? blocks[0] : blocks;
	};
};
