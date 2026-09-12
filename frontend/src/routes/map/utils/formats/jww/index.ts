import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import type { FeatureProp } from '$routes/map/types/properties';
import { type JwwEntity, readJww } from './reader';

type Point = [number, number];
type Transform = [number, number, number, number, number, number];
const IDENTITY: Transform = [1, 0, 0, 1, 0, 0];
const TAU = Math.PI * 2;

// Jw_cad stores these document preferences as zero-length text records at a reserved position.
// Match the position AND known keys so ordinary notes with similar text are retained.
const isDocumentSetting = (e: JwwEntity) =>
	e.kind === 'CDataMoji'
	&& e.values[0] === 0 && e.values[1] === -1000
	&& e.values[2] === 0 && e.values[3] === -1000
	&& /^(?:Printer_(?:Orientation|PaperSize|D2dBMP|BmpZENTAI)|View_Direct2d|Draw_BmpTOUKA)\s*=/
		.test(e.text ?? '');

export interface JwwParseResult {
	geojson: FeatureCollection;
	version: number | null;
	warnings: string[];
	layers: {
		key: string;
		name: string;
		group: number;
		scale: number;
		visible: boolean;
		count: number;
	}[];
}

const colorRefToHex = (color: number) =>
	'#' + [color & 255, (color >>> 8) & 255, (color >>> 16) & 255]
		.map(value => value.toString(16).padStart(2, '0')).join('');

const transformPoint = (
	[x, y]: Point,
	t: Transform
): Point => [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];

const compose = (parent: Transform, child: Transform): Transform => {
	const origin = transformPoint([child[4], child[5]], parent);
	return [
		parent[0] * child[0] + parent[2] * child[1],
		parent[1] * child[0] + parent[3] * child[1],
		parent[0] * child[2] + parent[2] * child[3],
		parent[1] * child[2] + parent[3] * child[3],
		...origin
	];
};

const closeRing = (points: Point[]): Point[] => {
	const unique = points.filter((p, i) =>
		i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]
	);
	if (
		unique.length && (unique[0][0] !== unique.at(-1)![0] || unique[0][1] !== unique.at(-1)![1])
	) {
		unique.push([...unique[0]]);
	}
	return unique;
};

// JWW/GDI+ arc angles describe rays from the ellipse centre, before rotation.
const ellipsePoint = (rx: number, ry: number, angle: number): Point => {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const distance = 1 / Math.hypot(cos / rx, sin / ry);
	return [cos * distance, sin * distance];
};

const arcPoints = (
	center: Point,
	rx: number,
	ry: number,
	start: number,
	sweep: number,
	rotation: number
): Point[] => {
	if (rx <= 0 || ry <= 0 || Math.abs(sweep) > TAU + 1e-6) {
		throw new Error('JWWの円弧の半径・角度が不正です');
	}
	const steps = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 90)));
	const cos = Math.cos(rotation);
	const sin = Math.sin(rotation);
	return Array.from({ length: steps + 1 }, (_, i) => {
		const [x, y] = ellipsePoint(rx, ry, start + sweep * i / steps);
		return [center[0] + cos * x - sin * y, center[1] + sin * x + cos * y];
	});
};

/** Returns 2D CAD geometry in local METRES. Placement/CRS selection is always required. */
export const convertJwCadDocument = (
	{ header, entities, definitions, imageCount }: ReturnType<typeof readJww>
): JwwParseResult => {
	const warnings = new Set<string>();
	const blocks = new Map<number, JwwEntity>();
	for (const block of definitions) {
		if (
			block.kind !== 'CDataList' || block.blockId === undefined || blocks.has(block.blockId)
		) {
			throw new Error('JWWのブロック定義が不正です');
		}
		blocks.set(block.blockId, block);
	}
	const features: Feature[] = [];
	const layers = new Map<string, JwwParseResult['layers'][number]>();
	let vertexCount = 0;
	let visits = 0;
	const visit = (
		e: JwwEntity,
		t: Transform,
		owner: JwwEntity,
		stack: number[],
		blockNames: string[]
	) => {
		if (++visits > 1_000_000 || stack.length > 32) {
			throw new Error('JWWのブロック展開数が上限を超えています');
		}
		const v = e.values;
		if (e.kind === 'CDataBlock') {
			const id = e.blockId!;
			const definition = blocks.get(id);
			if (!definition) throw new Error(`JWWのブロック定義が見つかりません: ${id}`);
			if (stack.includes(id)) throw new Error('JWWのブロックが循環参照しています');
			const cos = Math.cos(v[4]);
			const sin = Math.sin(v[4]);
			const next = compose(t, [cos * v[2], sin * v[2], -sin * v[3], cos * v[3], v[0], v[1]]);
			for (const child of definition.children ?? []) {
				visit(child, next, owner, [...stack, id], [
					...blockNames,
					definition.blockName ?? String(id)
				]);
			}
			return;
		}
		if (e.kind === 'CDataSunpou') {
			for (const child of e.children ?? []) visit(child, t, owner, stack, blockNames);
			return;
		}
		if (e.kind === 'CDataList') throw new Error('JWWの図形リスト内にブロック定義があります');
		if (isDocumentSetting(e)) {
			warnings.add('印刷・表示設定の文字レコードを図形から除外しました。');
			return;
		}
		const scale = header.scales[owner.group];
		if (!Number.isFinite(scale) || scale <= 0) {
			throw new Error(`JWWのグループ ${owner.group.toString(16)} の縮尺が不正です`);
		}
		const layerKey = `${owner.group.toString(16).toUpperCase()}-${
			owner.layer.toString(16).toUpperCase()
		}`;
		const groupName = header.groupNames[owner.group];
		const layerName = header.layerNames[owner.group][owner.layer];
		const visible = header.groupStates[owner.group] !== 0
			&& header.layerStates[owner.group][owner.layer] !== 0;
		const layer = layers.get(layerKey) ?? {
			key: layerKey,
			name: [groupName, layerName].filter(Boolean).join(' / ') || layerKey,
			group: owner.group,
			scale,
			visible,
			count: 0
		};
		const properties: FeatureProp = {
			layer: layerKey,
			layer_name: layerName,
			layer_group: owner.group,
			group_name: groupName,
			scale,
			visible,
			color: colorRefToHex(e.color ?? header.colors.get(e.penColor) ?? 0),
			pen_color: e.penColor,
			pen_style: e.penStyle,
			pen_width: e.penWidth,
			curve_group: e.curve,
			flags: e.flags,
			type: e.kind.slice(5).toUpperCase()
		};
		if (stack.length) {
			properties.block = blockNames.join(' / ');
			properties.block_id = stack.at(-1)!;
			properties.source_layer = `${e.group.toString(16)}-${e.layer.toString(16)}`;
		}
		const point = (p: Point): Point => {
			if (++vertexCount > 4_000_000) {
				throw new Error('JWWの頂点数が読み込み上限を超えています');
			}
			const mapped = transformPoint(p, t).map(value => value * scale / 1000) as Point;
			if (mapped.some(value => !Number.isFinite(value))) {
				throw new Error('JWWの変換後の座標が不正です');
			}
			return mapped;
		};
		const add = (geometry: AnyGeometry) => {
			features.push({ type: 'Feature', id: features.length, properties, geometry });
			layer.count++;
			layers.set(layerKey, layer);
		};
		const line = (points: Point[]) =>
			add({ type: 'LineString', coordinates: points.map(point) });
		const polygon = (rings: Point[][]) => {
			const closed = rings.map(ring => closeRing(ring.map(point)));
			if (closed.some(ring => ring.length < 4)) {
				warnings.add('面積を持たないソリッドを除外しました。');
				return;
			}
			add({ type: 'Polygon', coordinates: closed });
		};
		switch (e.kind) {
			case 'CDataSen':
				properties.type = 'LINE';
				line([[v[0], v[1]], [v[2], v[3]]]);
				break;
			case 'CDataEnko':
				properties.type = v[7] ? 'CIRCLE' : 'ARC';
				line(
					arcPoints(
						[v[0], v[1]],
						v[2],
						v[2] * v[6],
						v[7] ? 0 : v[3],
						v[7] ? TAU : v[4],
						v[5]
					)
				);
				break;
			case 'CDataTen':
				if (v[2]) {
					warnings.add('仮点を除外しました。');
					break;
				}
				properties.type = 'POINT';
				if (e.penStyle === 100) {
					properties.marker_code = v[3];
					warnings.add('矢印・点マーカーはポイントとして読み込みます。');
				}
				add({ type: 'Point', coordinates: point([v[0], v[1]]) });
				break;
			case 'CDataMoji':
				if (e.text?.startsWith('^@BM')) {
					warnings.add('貼り付け画像は読み込み対象外です。');
					break;
				}
				properties.type = 'TEXT';
				properties.text = e.text ?? '';
				properties.font = e.font ?? '';
				properties.text_height = v[6] * scale / 1000;
				properties.text_angle = v[8];
				add({ type: 'Point', coordinates: point([v[0], v[1]]) });
				break;
			case 'CDataSolid': {
				properties.type = 'SOLID';
				if (e.penStyle < 101) {
					// Disk order: first, fourth, second, third (jwdatafmt.txt).
					polygon([[[v[0], v[1]], [v[4], v[5]], [v[6], v[7]], [v[2], v[3]]]]);
					break;
				}
				const center: Point = [v[0], v[1]];
				const full = (e.penStyle === 101 || e.penStyle === 111) && v[7] === 100;
				const outer = arcPoints(
					center,
					v[2],
					v[2] * v[3],
					full ? 0 : v[5],
					full ? TAU : v[6],
					v[4]
				);
				if (e.penStyle === 111) {
					line(outer);
					break;
				}
				if (e.penStyle === 101 && [0, 5, 100].includes(v[7])) {
					polygon([v[7] === 0 ? [center, ...outer] : outer]);
				} else if (e.penStyle === 105 || e.penStyle === 106) {
					const innerY = e.penStyle === 105 ? v[7] * v[3] : v[2] * v[3] - (v[2] - v[7]);
					if (v[7] <= 0 || v[7] >= v[2] || innerY <= 0) {
						throw new Error('JWWの円環ソリッドの半径が不正です');
					}
					const inner = arcPoints(center, v[7], innerY, v[5], v[6], v[4]).reverse();
					polygon(Math.abs(v[6]) >= TAU - 1e-6 ? [outer, inner] : [[...outer, ...inner]]);
				} else {
					warnings.add(
						`未対応の円ソリッド（線種 ${e.penStyle}、種別 ${v[7]}）を除外しました。`
					);
				}
				break;
			}
		}
	};
	for (const entity of entities) visit(entity, IDENTITY, entity, [], []);
	if (imageCount) warnings.add(`同梱画像 ${imageCount} 件は読み込み対象外です。`);
	if (!features.length) {
		throw new Error(`読み込めるJWW図形がありません。${[...warnings].join('')}`);
	}
	return {
		geojson: { type: 'FeatureCollection', features },
		version: header.version,
		warnings: [...warnings],
		layers: [...layers.values()]
	};
};

export const parseJww = (buffer: ArrayBuffer): JwwParseResult =>
	convertJwCadDocument(readJww(buffer));
