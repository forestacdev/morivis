/** MITABのバイナリレイアウトを参照。出典・許諾は static/vendor/mitab-parser/。 */
export const requireTab = (condition: unknown, detail: string): void => {
	if (!condition) throw new Error(`MapInfo TAB: ${detail}`);
};

export class TabReader {
	readonly view: DataView;
	position = 0;
	constructor(readonly bytes: Uint8Array) {
		this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	}
	range = (offset: number, size: number) => {
		requireTab(
			Number.isSafeInteger(offset) && Number.isSafeInteger(size)
				&& offset >= 0 && size >= 0 && offset + size <= this.bytes.length,
			'バイナリが欠損しています'
		);
	};
	seek = (offset: number) => {
		this.range(offset, 0);
		this.position = offset;
	};
	skip = (size: number) => {
		this.range(this.position, size);
		this.position += size;
	};
	u8 = () => {
		this.range(this.position, 1);
		return this.view.getUint8(this.position++);
	};
	i16 = () => {
		this.range(this.position, 2);
		const v = this.view.getInt16(this.position, true);
		this.position += 2;
		return v;
	};
	u16 = () => {
		this.range(this.position, 2);
		const v = this.view.getUint16(this.position, true);
		this.position += 2;
		return v;
	};
	i32 = () => {
		this.range(this.position, 4);
		const v = this.view.getInt32(this.position, true);
		this.position += 4;
		return v;
	};
	u32 = () => {
		this.range(this.position, 4);
		const v = this.view.getUint32(this.position, true);
		this.position += 4;
		return v;
	};
	f64 = () => {
		this.range(this.position, 8);
		const v = this.view.getFloat64(this.position, true);
		this.position += 8;
		requireTab(Number.isFinite(v), '数値が不正です');
		return v;
	};
	i64 = () => {
		this.range(this.position, 8);
		const v = this.view.getBigInt64(this.position, true);
		this.position += 8;
		return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)
			? Number(v)
			: v.toString();
	};
	take = (size: number) => {
		this.range(this.position, size);
		const v = this.bytes.subarray(this.position, this.position + size);
		this.position += size;
		return v;
	};
}

/** .MAP座標ブロックのリンクを辿る。ポインタ・終端・循環を検査し、要求量だけ読む。 */
export const readCoordinateData = (
	map: Uint8Array,
	start: number,
	size: number,
	blockSize: number
) => {
	requireTab(
		Number.isSafeInteger(size) && size >= 0 && size <= map.length,
		'座標データ長が不正です'
	);
	const output = new Uint8Array(size);
	if (!size) return output;
	const r = new TabReader(map);
	const seen = new Set<number>();
	let position = start, written = 0;
	while (written < size) {
		const block = Math.floor(position / blockSize) * blockSize;
		requireTab(block >= 512 && !seen.has(block), '座標ブロックの参照が不正・循環しています');
		seen.add(block);
		r.range(block, blockSize);
		r.seek(block);
		requireTab(r.u16() === 3, '座標ブロックではありません');
		const used = r.u16(), next = r.u32(), end = block + 8 + used;
		requireTab(
			used <= blockSize - 8 && position >= block + 8 && position < end,
			'座標ブロックの範囲が不正です'
		);
		const count = Math.min(size - written, end - position);
		output.set(map.subarray(position, position + count), written);
		written += count;
		if (written < size) {
			requireTab(next > 0 && next % blockSize === 0, '座標ブロックが途中で切れています');
			position = next + 8;
		}
	}
	return output;
};
