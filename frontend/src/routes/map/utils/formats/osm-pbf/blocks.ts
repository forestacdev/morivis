// 0.0.9のroot exportには未宣言の@osmix/shared依存があるため、独立したデコーダーを使う。
import {
	type OsmPbfBlock,
	readHeaderBlock,
	readPrimitiveBlock
} from '@osmix/pbf/dist/proto/osmformat.js';
import Pbf from 'pbf';
import { formatOsmPbf } from './definition';
import { MAX_BLOB_BYTES, visitOsmPbfBlobs } from './files';

/** 専用デコーダーへ渡す前後でprotobufの境界・整数精度を検査する。 */
const reader = (bytes: Uint8Array) => {
	const pbf = new Pbf(bytes);
	const readFields = pbf.readFields.bind(pbf);
	const readVarint = pbf.readVarint.bind(pbf);
	let boundary = bytes.length;
	pbf.readVarint = (signed?: boolean) => {
		const value = readVarint(signed);
		if (pbf.pos > boundary || !Number.isSafeInteger(value)) {
			throw new Error('OSM PBFの整数値が欠損しているか、安全に扱える範囲を超えています');
		}
		return value;
	};
	pbf.readFields = <T>(
		field: (tag: number, value: T, pbf: Pbf) => void,
		value: T,
		end = boundary
	): T => {
		if (!Number.isSafeInteger(end) || end < pbf.pos || end > boundary) {
			throw new Error('OSM PBFのメッセージ境界が不正です');
		}
		const parent = boundary;
		boundary = end;
		const seen = new Set<number>();
		const result = readFields(
			(tag, value, pbf) => {
				seen.add(tag);
				if (tag <= 0) throw new Error('OSM PBFのフィールド番号が不正です');
				field(tag, value, pbf);
			},
			value,
			end
		);
		if (pbf.pos !== end) throw new Error('OSM PBFのメッセージが欠損しています');
		if (value && typeof value === 'object') {
			const required = 'keys' in value && 'id' in value
				? ('lat' in value && !('refs' in value) ? [1, 8, 9] : [1])
				: 'stringtable' in value
				? [1]
				: [];
			if (required.some(tag => !seen.has(tag))) {
				throw new Error('OSM PBFの必須フィールドが欠損しています');
			}
		}
		boundary = parent;
		return result;
	};
	return pbf;
};

/** ネイティブのzlib検証を使い、宣言サイズを超えた時点で展開を止める。 */
const inflate = async (bytes: Uint8Array, size: number) => {
	const source = new Blob([Uint8Array.from(bytes)]).stream();
	const stream = source.pipeThrough(new DecompressionStream('deflate')).getReader();
	const output = new Uint8Array(size);
	let offset = 0;
	try {
		while (true) {
			const { value, done } = await stream.read();
			if (done) break;
			if (offset + value.length > size) {
				throw new Error('OSM PBFの展開サイズが宣言値を超えています');
			}
			output.set(value, offset);
			offset += value.length;
		}
		if (offset !== size) throw new Error('OSM PBFの展開サイズが一致しません');
		return output;
	} finally {
		await stream.cancel().catch(() => {});
		stream.releaseLock();
	}
};

export const readOsmBlocks = async (file: File, onBlock: (block: OsmPbfBlock) => void) => {
	let expanded = 0;
	await visitOsmPbfBlobs(file, async (blob, type) => {
		const pbf = reader(new Uint8Array(await blob.arrayBuffer()));
		let payload: Uint8Array | undefined;
		let encoding = 0, rawSize: number | undefined;
		pbf.readFields(tag => {
			if ([1, 3, 4, 5, 6, 7].includes(tag)) {
				if (payload) throw new Error('OSM PBFの圧縮データが重複しています');
				if (pbf.type !== 2) throw new Error('OSM PBFのBlobが不正です');
				encoding = tag;
				payload = pbf.readBytes();
			} else if (tag === 2) {
				if (pbf.type !== 0) throw new Error('OSM PBFの展開サイズが不正です');
				rawSize = pbf.readVarint();
			}
		}, undefined);
		if (!payload || ![1, 3].includes(encoding)) {
			throw new Error('OSM PBFは非圧縮・zlib圧縮に対応しています');
		}
		const size = encoding === 1 ? payload.length : rawSize;
		if (size === undefined || size <= 0 || size >= MAX_BLOB_BYTES) {
			throw new Error('OSM PBFの展開ブロックサイズが不正です');
		}
		expanded += size;
		if (expanded > formatOsmPbf.limits.maxExpandedBytes) {
			throw new Error('OSM PBFの展開量が512 MiBを超えました。範囲を分割してください');
		}
		if (encoding === 1 && rawSize !== undefined && rawSize !== size) {
			throw new Error('OSM PBFの非圧縮サイズが一致しません');
		}
		const decoded = reader(encoding === 1 ? payload : await inflate(payload, size));
		if (type === 'OSMHeader') {
			const header = readHeaderBlock(decoded);
			if (!header.required_features.includes('OsmSchema-V0.6')) {
				throw new Error('OSM PBFのスキーマが不正です');
			}
			const unsupported = header.required_features.filter(v =>
				!['OsmSchema-V0.6', 'DenseNodes'].includes(v)
			);
			if (unsupported.length) {
				throw new Error(`OSM PBFの未対応機能: ${unsupported.join(', ')}`);
			}
		} else onBlock(readPrimitiveBlock(decoded));
	});
};
