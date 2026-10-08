import { formatVtk } from './definition';

export const count = (value: number, label: string, maximum = Number.MAX_SAFE_INTEGER) => {
	if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
		throw new Error(`VTK: ${label}が不正か上限を超えています`);
	}
	return value;
};

export const checkVtkFileSize = (size: number) => {
	if (!size || size > formatVtk.limits.maxFileBytes) {
		throw new Error('VTKファイルは空でない64 MiB以下のファイルを指定してください');
	}
};

/** 圧縮後のサイズとは別に、全配列の復号・数値化の合計を制限する。 */
export const createArrayBudget = () => {
	let bytes = 0;
	return (size: number) => {
		count(size, '配列サイズ', formatVtk.limits.maxExpandedBytes);
		bytes += size;
		if (bytes > formatVtk.limits.maxExpandedBytes) {
			throw new Error('VTK: 展開後の配列が128 MiBを超えています');
		}
	};
};
export type ArrayBudget = ReturnType<typeof createArrayBudget>;

const TYPE_SIZES: Record<string, number> = {
	Int8: 1,
	UInt8: 1,
	Int16: 2,
	UInt16: 2,
	Int32: 4,
	UInt32: 4,
	Int64: 8,
	UInt64: 8,
	Float32: 4,
	Float64: 8
};

export const typeSize = (type: string) => {
	const size = TYPE_SIZES[type];
	if (!size) throw new Error(`VTK: 未対応の数値型です (${type})`);
	return size;
};

export const readBinaryNumbers = (
	bytes: Uint8Array,
	type: string,
	littleEndian: boolean,
	budget: ArrayBudget
): Float64Array => {
	const size = typeSize(type);
	const length = count(bytes.byteLength / size, '配列長');
	budget(length * 8);
	const result = new Float64Array(length);
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (let i = 0; i < length; i++) {
		const offset = i * size;
		let value: number;
		switch (type) {
			case 'Int8':
				value = view.getInt8(offset);
				break;
			case 'UInt8':
				value = view.getUint8(offset);
				break;
			case 'Int16':
				value = view.getInt16(offset, littleEndian);
				break;
			case 'UInt16':
				value = view.getUint16(offset, littleEndian);
				break;
			case 'Int32':
				value = view.getInt32(offset, littleEndian);
				break;
			case 'UInt32':
				value = view.getUint32(offset, littleEndian);
				break;
			case 'Int64':
				value = Number(view.getBigInt64(offset, littleEndian));
				break;
			case 'UInt64':
				value = Number(view.getBigUint64(offset, littleEndian));
				break;
			case 'Float32':
				value = view.getFloat32(offset, littleEndian);
				break;
			default:
				value = view.getFloat64(offset, littleEndian);
		}
		if ((type === 'Int64' || type === 'UInt64') && !Number.isSafeInteger(value)) {
			throw new Error('VTK: 64ビット整数が安全に読み込める範囲を超えています');
		}
		result[i] = value;
	}
	return result;
};

export const numericToken = (token: string) => {
	// NaNは解析値の欠損として許容し、座標・接続では後段で拒否する。
	if (/^[+-]?nan$/i.test(token)) return NaN;
	if (/^[+]?inf(?:inity)?$/i.test(token)) return Infinity;
	if (/^-inf(?:inity)?$/i.test(token)) return -Infinity;
	if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) {
		throw new Error(`VTK: 数値を読み込めません (${token.slice(0, 40)})`);
	}
	return Number(token);
};

export const readAsciiNumbers = (text: string, budget: ArrayBudget): Float64Array => {
	let length = 0;
	for (const _match of text.matchAll(/\S+/g)) length++;
	budget(length * 8);
	const result = new Float64Array(length);
	let i = 0;
	for (const match of text.matchAll(/\S+/g)) result[i++] = numericToken(match[0]);
	return result;
};
