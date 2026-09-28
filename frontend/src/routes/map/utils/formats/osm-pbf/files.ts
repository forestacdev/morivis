import Pbf from 'pbf';
import { formatOsmPbf } from './definition';

export const MAX_OSM_PBF_BYTES = formatOsmPbf.limits.maxFileBytes;
const MAX_HEADER_BYTES = 64 * 1024;
const MAX_BLOB_BYTES = 32 * 1024 * 1024;

export const isOsmPbfFileName = (name: string) => /\.osm\.pbf$/i.test(name);

const readHeader = (bytes: Uint8Array) => {
	const pbf = new Pbf(bytes);
	const result = pbf.readFields((tag, header, reader) => {
		if (tag === 1) header.type = reader.readString();
		if (tag === 3) header.size = reader.readVarint();
	}, { type: '', size: 0 });
	if (
		pbf.pos !== bytes.length || !result.type || result.size <= 0 || result.size > MAX_BLOB_BYTES
	) {
		throw new Error('OSM PBFのブロックヘッダーが不正です');
	}
	return result;
};

/** 拡張子が同じMVTとは、最初のBlobHeaderのtypeで区別する。 */
export const isOsmPbfFile = async (file: File): Promise<boolean> => {
	if (isOsmPbfFileName(file.name)) return true;
	if (!/\.pbf$/i.test(file.name) || file.size < 4) return false;
	try {
		const size = new DataView(await file.slice(0, 4).arrayBuffer()).getUint32(0);
		if (size <= 0 || size > MAX_HEADER_BYTES || size + 4 > file.size) return false;
		return readHeader(new Uint8Array(await file.slice(4, size + 4).arrayBuffer())).type
			=== 'OSMHeader';
	} catch {
		return false;
	}
};

/** GDALが末尾の欠損を部分成功として扱う前に、全ブロックの境界を確認する。 */
export const validateOsmPbfFile = async (file: File): Promise<void> => {
	if (file.size > MAX_OSM_PBF_BYTES) {
		throw new Error('OSM PBFは64 MiB以下に分割して読み込んでください');
	}
	let offset = 0;
	let count = 0;
	while (offset < file.size) {
		if (file.size - offset < 4) throw new Error('OSM PBFの末尾が欠損しています');
		const size = new DataView(await file.slice(offset, offset + 4).arrayBuffer()).getUint32(0);
		if (size <= 0 || size > MAX_HEADER_BYTES || offset + 4 + size > file.size) {
			throw new Error('OSM PBFのブロックヘッダーが不正です');
		}
		const header = readHeader(
			new Uint8Array(await file.slice(offset + 4, offset + 4 + size).arrayBuffer())
		);
		if (count === 0 && header.type !== 'OSMHeader') throw new Error('OSM PBFではありません');
		if (count > 0 && header.type !== 'OSMData') {
			throw new Error('OSM PBFに未対応のブロックがあります');
		}
		offset += 4 + size + header.size;
		if (offset > file.size) throw new Error('OSM PBFのデータブロックが欠損しています');
		count++;
	}
	if (!count) throw new Error('OSM PBFファイルが空です');
};
