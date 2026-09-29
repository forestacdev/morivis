import type { Geometry, Position } from 'geojson';
import { readCoordinateData, requireTab, TabReader } from './binary';
import { formatMapinfoTab } from './definition';
import type { MapHeader } from './projection';

type XY = [number, number];
const zero: XY = [0, 0];
const intPoint = (r: TabReader, compressed: boolean, origin: XY): XY =>
	compressed
		? [origin[0] + r.i16(), origin[1] + r.i16()]
		: [r.i32(), r.i32()];
const closeRing = (points: Position[]) => {
	requireTab(points.length >= 3, '面の頂点が不足しています');
	const first = points[0], last = points.at(-1)!;
	return first[0] === last[0] && first[1] === last[1] ? points : [...points, [...first]];
};
const multipart = (parts: Position[][], holes: number[], region: boolean): Geometry => {
	if (!region) {
		return parts.length === 1
			? { type: 'LineString', coordinates: parts[0] }
			: { type: 'MultiLineString', coordinates: parts };
	}
	const polygons: Position[][][] = [];
	for (let i = 0; i < parts.length;) {
		const count = holes[i];
		requireTab(
			i + count < parts.length && holes.slice(i + 1, i + 1 + count).every(v => v === 0),
			'面の穴参照が不正です'
		);
		polygons.push(parts.slice(i, i + count + 1).map(closeRing));
		i += count + 1;
	}
	return polygons.length === 1
		? { type: 'Polygon', coordinates: polygons[0] }
		: { type: 'MultiPolygon', coordinates: polygons };
};

export const createGeometryReader = (map: Uint8Array, h: MapHeader) => {
	let total = 0;
	const reserve = (count: number) => {
		requireTab(Number.isSafeInteger(count) && count >= 0, '頂点数が不正です');
		total += count;
		requireTab(
			total <= formatMapinfoTab.limits.maxVertices,
			'MapInfo TABは500万頂点以下にしてください'
		);
	};
	const coords = (r: TabReader, count: number, compressed: boolean, origin: XY) => {
		reserve(count);
		r.range(r.position, count * (compressed ? 4 : 8));
		return Array.from({ length: count }, () => h.point(...intPoint(r, compressed, origin)));
	};
	const sections = (
		r: TabReader,
		count: number,
		version: number,
		compressed: boolean,
		origin: XY,
		region: boolean
	) => {
		requireTab(
			count > 0 && count <= formatMapinfoTab.limits.maxVertices,
			'図形の部品数が不正です'
		);
		const headerSize = (version >= 450 ? 28 : 24) * count;
		const storedSize = (version >= 450 ? 4 : 2) + (version >= 800 ? 4 : 2)
			+ (compressed ? 8 : 16) + 4;
		r.range(r.position, count * storedSize);
		let vertices = 0;
		const items = Array.from({ length: count }, () => {
			const n = version >= 450 ? r.i32() : r.i16();
			const holes = version >= 800 ? r.i32() : r.i16();
			r.skip(compressed ? 8 : 16);
			const offset = (r.i32() - headerSize) / 8;
			requireTab(
				n >= (region ? 3 : 2) && holes >= 0 && Number.isInteger(offset) && offset >= 0,
				'図形の部品ヘッダーが不正です'
			);
			vertices += n;
			return { n, holes, offset };
		});
		const points = coords(r, vertices, compressed, origin);
		const parts = items.map(({ n, offset }) => {
			requireTab(offset + n <= vertices, '部品の座標参照が範囲外です');
			return points.slice(offset, offset + n);
		});
		// 重複する参照で出力頂点が増える場合も、正規化時に上限を再検査する。
		return multipart(parts, items.map(i => i.holes), region);
	};
	const arc = (min: XY, max: XY, start: number, end: number, count?: number) => {
		while (end < start) end += 360;
		const n = count ?? Math.max(2, Math.floor(Math.abs(end - start) / 2) + 1);
		reserve(n);
		const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
		const radius = [Math.abs(max[0] - min[0]) / 2, Math.abs(max[1] - min[1]) / 2];
		return Array.from({ length: n }, (_, i) => {
			const angle = (start + (end - start) * i / (n - 1)) * Math.PI / 180;
			return [
				center[0] + radius[0] * Math.cos(angle),
				center[1] + radius[1] * Math.sin(angle)
			];
		});
	};
	return (offset: number, id: number): Geometry | null => {
		if (!offset) return null;
		const block = Math.floor(offset / h.blockSize) * h.blockSize;
		const b = new TabReader(map);
		b.range(block, h.blockSize);
		b.seek(block);
		requireTab(block >= 512 && b.u16() === 2, 'IDが図形ブロックを参照していません');
		const used = b.u16();
		const center: XY = [b.i32(), b.i32()];
		requireTab(
			used <= h.blockSize - 20 && offset >= block + 20 && offset + 5 <= block + 20 + used,
			'図形ブロックの範囲が不正です'
		);
		const type = map[offset], length = map[type] & 127;
		requireTab(
			type > 0 && type <= 0x47 && length >= 5 && offset + length <= block + 20 + used,
			'未対応または欠損した図形です'
		);
		const r = new TabReader(map.subarray(offset, offset + length));
		r.skip(1);
		const objectId = r.u32();
		requireTab((objectId & 0x3fffffff) === id, 'IDと図形の行番号が一致しません');
		if (objectId & 0xc0000000) return null;
		const compressed = type % 3 === 1;
		const kind = compressed ? type + 1 : type;
		const point = () => {
			reserve(1);
			return h.point(...intPoint(r, compressed, center));
		};
		const body = (pointer: number, size: number) =>
			new TabReader(readCoordinateData(map, pointer, size, h.blockSize));
		if ([0x02, 0x29, 0x2c].includes(kind)) {
			if (kind === 0x29) r.skip(12);
			if (kind === 0x2c) r.skip(2);
			return { type: 'Point', coordinates: point() };
		}
		if (kind === 0x05) return { type: 'LineString', coordinates: [point(), point()] };
		if ([0x08, 0x0e, 0x26, 0x2f, 0x32, 0x3e, 0x41].includes(kind)) {
			const pointer = r.u32(), size = r.u32() & 0x7fffffff;
			const version = type < 0x2e ? 300 : type < 0x3d ? 450 : 800;
			const count = kind === 0x08 ? 1 : version >= 800 ? r.i32() : r.i16();
			if (version >= 800) r.skip(33);
			r.skip(compressed ? 4 : 8);
			const origin: XY = compressed ? [r.i32(), r.i32()] : zero;
			const data = body(pointer, size);
			let geometry: Geometry;
			if (kind === 0x08) {
				geometry = {
					type: 'LineString',
					coordinates: coords(data, size / (compressed ? 4 : 8), compressed, origin)
				};
			} else {geometry = sections(
					data,
					count,
					version,
					compressed,
					origin,
					[0x0e, 0x2f, 0x3e].includes(kind)
				);}
			requireTab(data.position === size, '図形の座標データ長が一致しません');
			return geometry;
		}
		if (kind === 0x35 || kind === 0x44) {
			const pointer = r.u32(), count = r.i32();
			requireTab(
				count >= 0 && count <= formatMapinfoTab.limits.maxVertices,
				'点数が不正です'
			);
			r.skip(17 + (kind === 0x44 ? 33 : 0));
			r.skip(compressed ? 4 : 8);
			const origin: XY = compressed ? [r.i32(), r.i32()] : zero;
			return {
				type: 'MultiPoint',
				coordinates: coords(
					body(pointer, count * (compressed ? 4 : 8)),
					count,
					compressed,
					origin
				)
			};
		}
		if (kind === 0x38 || kind === 0x47) {
			const pointer = r.u32(), points = r.i32(), regionSize = r.i32(), lineSize = r.i32();
			const v800 = kind === 0x47;
			const regions = v800 ? r.i32() : r.i16(), lines = v800 ? r.i32() : r.i16();
			requireTab(
				[points, regions, lines].every(n =>
					n >= 0 && n <= formatMapinfoTab.limits.maxVertices
				),
				'複合図形の点数・部品数が不正です'
			);
			if (v800) requireTab(r.u8() === 4, '未対応の複合図形ヘッダーです');
			r.skip(20);
			const origin: XY = compressed ? [r.i32(), r.i32()] : zero;
			const mini = compressed ? 12 : 24, extra = v800 ? 4 : 0;
			const rs = regionSize - 2 * regions, ls = lineSize - 2 * lines;
			requireTab(
				rs >= 0 && ls >= 0 && (regions > 0 || rs === 0) && (lines > 0 || ls === 0),
				'複合図形のデータ長が不正です'
			);
			const size = (regions ? mini + extra + rs : 0) + (lines ? mini + extra + ls : 0)
				+ (points ? mini + points * (compressed ? 4 : 8) : 0);
			const data = body(pointer, size), geometries: Geometry[] = [];
			for (
				const [count, region, bytes] of [[regions, true, rs], [lines, false, ls]] as const
			) {
				if (!count) continue;
				if (v800) requireTab(data.i32() === count, '複合図形の部品数が一致しません');
				data.skip(mini);
				const start = data.position;
				geometries.push(
					sections(data, count, v800 ? 800 : 450, compressed, origin, region)
				);
				requireTab(data.position - start === bytes, '複合図形の部品長が一致しません');
			}
			if (points) {
				data.skip(mini);
				geometries.push({
					type: 'MultiPoint',
					coordinates: coords(data, points, compressed, origin)
				});
			}
			return { type: 'GeometryCollection', geometries };
		}
		if ([0x14, 0x17, 0x1a].includes(kind)) {
			let corner: XY = zero;
			if (kind === 0x17) corner = intPoint(r, compressed, zero);
			const a = point(), b = point();
			const min: XY = [Math.min(a[0], b[0]), Math.min(a[1], b[1])],
				max: XY = [Math.max(a[0], b[0]), Math.max(a[1], b[1])];
			let ring: Position[];
			if (kind === 0x1a) ring = arc(min, max, 0, 360, 180);
			else if (kind === 0x17 && corner[0] > 0 && corner[1] > 0) {
				const dx = Math.min(
					Math.abs(corner[0] / h.xs) / 2,
					(max[0] - min[0]) / 2
				);
				const dy = Math.min(Math.abs(corner[1] / h.ys) / 2, (max[1] - min[1]) / 2);
				ring = [
					...arc([max[0] - 2 * dx, max[1] - 2 * dy], max, 0, 90, 45),
					...arc([min[0], max[1] - 2 * dy], [min[0] + 2 * dx, max[1]], 90, 180, 45),
					...arc(min, [min[0] + 2 * dx, min[1] + 2 * dy], 180, 270, 45),
					...arc([max[0] - 2 * dx, min[1]], [max[0], min[1] + 2 * dy], 270, 360, 45)
				];
			} else {
				reserve(5);
				ring = [min, [max[0], min[1]], max, [min[0], max[1]], min];
			}
			return { type: 'Polygon', coordinates: [closeRing(ring)] };
		}
		if (kind === 0x0b) {
			let start = r.i16() / 10, end = r.i16() / 10;
			if ([2, 4].includes(h.quadrant)) [start, end] = [end, start];
			if ([0, 2, 3].includes(h.quadrant)) {
				start = start <= 180 ? 180 - start : 540 - start;
				end = end <= 180 ? 180 - end : 540 - end;
			}
			if ([0, 3, 4].includes(h.quadrant)) {
				start = 360 - start;
				end = 360 - end;
			}
			requireTab(Math.abs(start - end) < 721, '円弧の角度が不正です');
			return { type: 'LineString', coordinates: arc(point(), point(), start, end) };
		}
		if (kind === 0x11) {
			const pointer = r.u32(), size = r.i16();
			r.skip(2);
			const angle = r.i16() / 10 * Math.PI / 180;
			r.skip(8 + (compressed ? 4 : 8));
			const height = (compressed ? r.i16() : r.i32()) / h.ys;
			r.skip(1);
			const a = point(), b = point();
			const x0 = Math.min(a[0], b[0]),
				x1 = Math.max(a[0], b[0]),
				y0 = Math.min(a[1], b[1]),
				y1 = Math.max(a[1], b[1]);
			if (size) body(pointer, size); // 文字列の欠損も検査する（描画は標準点）。
			const s = Math.sin(angle), c = Math.cos(angle);
			const coordinates = s > 0 && c > 0
				? [x0 + height * s, y0]
				: s > 0 && c < 0
				? [x1, y0 - height * c]
				: s < 0 && c < 0
				? [x1 + height * s, y1]
				: [x0, y1 - height * c];
			return { type: 'Point', coordinates };
		}
		throw new Error(`MapInfo TAB: 未対応の図形型です (0x${type.toString(16)})`);
	};
};
