import type { OsmPbfBlock, OsmPbfPrimitive } from '@osmix/pbf/dist/proto/osmformat.js';
import { readOsmBlocks } from './blocks';
import { formatOsmPbf } from './definition';

export type OsmKind = 'node' | 'way' | 'relation';
export type OsmMember = { type: OsmKind; ref: number; role: string; };
interface OsmBase {
	id: number;
	tags: Record<string, string>;
}
export type OsmEntity =
	| (OsmBase & { type: 'node'; lat: number; lon: number; })
	| (OsmBase & { type: 'way'; nodes: number[]; })
	| (OsmBase & { type: 'relation'; members: OsmMember[]; });

const integer = (value: number) => {
	if (!Number.isSafeInteger(value)) {
		throw new Error('OSM PBFのID・座標が安全に扱える整数範囲を超えています');
	}
	return value;
};
const idValue = (value: number) => {
	if (integer(value) <= 0) throw new Error('OSM PBFのIDが不正です');
	return value;
};

export const readOsmEntities = async (file: File): Promise<OsmEntity[]> => {
	const elements: OsmEntity[] = [];
	const ids = { node: new Set<number>(), way: new Set<number>(), relation: new Set<number>() };
	let references = 0;
	const add = (entity: OsmEntity) => {
		idValue(entity.id);
		if (ids[entity.type].has(entity.id)) {
			throw new Error('OSM PBFのIDが重複しています。履歴・差分は未対応です');
		}
		ids[entity.type].add(entity.id);
		if (ids.node.size > formatOsmPbf.limits.maxSourcePoints) {
			throw new Error('OSM PBFの参照ノードは500万点以下にしてください');
		}
		if (ids.way.size + ids.relation.size > formatOsmPbf.limits.maxFeatures) {
			throw new Error(
				`OSM PBFのway・relationは合計${
					formatOsmPbf.limits.maxFeatures.toLocaleString('ja-JP')
				}件以下にしてください`
			);
		}
		elements.push(entity);
	};
	const reserveRefs = (count: number) => {
		references += count;
		if (references > formatOsmPbf.limits.maxVertices) {
			throw new Error(
				`OSM PBFの参照数は${
					formatOsmPbf.limits.maxVertices.toLocaleString('ja-JP')
				}以下にしてください`
			);
		}
	};
	const decode = (block: OsmPbfBlock) => {
		const strings = block.stringtable.map(bytes =>
			new TextDecoder('utf-8', { fatal: true }).decode(bytes)
		);
		if (strings[0] !== '') throw new Error('OSM PBFの文字列テーブルが不正です');
		const string = (index: number) => {
			if (!Number.isInteger(index) || index < 0 || index >= strings.length) {
				throw new Error('OSM PBFの文字列参照が不正です');
			}
			return strings[index];
		};
		// @osmix/pbfはgranularityを度への除数、offsetを度へ変換して返す。
		const divisor = block.granularity ?? 1e7;
		if (!Number.isFinite(divisor) || divisor <= 0) {
			throw new Error('OSM PBFの座標倍率が不正です');
		}
		const coordinates = (lat: number, lon: number) => {
			const y = integer(lat) / divisor + (block.lat_offset ?? 0);
			const x = integer(lon) / divisor + (block.lon_offset ?? 0);
			if (
				!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 180 || Math.abs(y) > 90
			) throw new Error('OSM PBFの座標が緯度経度の範囲外です');
			return { lat: y, lon: x };
		};
		const tags = (item: OsmPbfPrimitive) => {
			if (item.info?.visible === false) throw new Error('OSM PBFの削除履歴は未対応です');
			if (item.keys.length !== item.vals.length) {
				throw new Error('OSM PBFのタグ数が一致しません');
			}
			const values: Record<string, string> = Object.create(null);
			item.keys.forEach((key, i) => {
				if (!key) throw new Error('OSM PBFのタグ名が不正です');
				values[string(key)] = string(item.vals[i]);
			});
			return values;
		};
		for (const group of block.primitivegroup) {
			for (const node of group.nodes) {
				add({
					type: 'node',
					id: node.id,
					tags: tags(node),
					...coordinates(node.lat, node.lon)
				});
			}
			if (group.dense) {
				const dense = group.dense;
				if (dense.id.length !== dense.lat.length || dense.id.length !== dense.lon.length) {
					throw new Error('OSM PBFのDenseNodesの配列長が一致しません');
				}
				if (dense.denseinfo) {
					for (const values of Object.values(dense.denseinfo)) {
						if (values.length && values.length !== dense.id.length) {
							throw new Error('OSM PBFのDenseInfoの配列長が不正です');
						}
					}
					if (dense.denseinfo.visible.includes(false)) {
						throw new Error('OSM PBFの削除履歴は未対応です');
					}
				}
				let id = 0, lat = 0, lon = 0, cursor = 0;
				for (let i = 0; i < dense.id.length; i++) {
					id = integer(id + dense.id[i]);
					lat = integer(lat + dense.lat[i]);
					lon = integer(lon + dense.lon[i]);
					const values: Record<string, string> = Object.create(null);
					if (dense.keys_vals.length) {
						while (cursor < dense.keys_vals.length && dense.keys_vals[cursor] !== 0) {
							const key = dense.keys_vals[cursor++];
							values[string(key)] = string(dense.keys_vals[cursor++]);
						}
						if (dense.keys_vals[cursor++] !== 0) {
							throw new Error('OSM PBFのDenseNodesのタグ終端が欠損しています');
						}
					}
					add({ type: 'node', id, tags: values, ...coordinates(lat, lon) });
				}
				if (cursor !== dense.keys_vals.length) {
					throw new Error('OSM PBFのDenseNodesに余分なタグがあります');
				}
			}
			for (const way of group.ways) {
				reserveRefs(way.refs.length);
				let ref = 0;
				add({
					type: 'way',
					id: way.id,
					tags: tags(way),
					nodes: way.refs.map(delta => ref = idValue(ref + delta))
				});
			}
			for (const relation of group.relations) {
				if (
					relation.memids.length !== relation.roles_sid.length
					|| relation.memids.length !== relation.types.length
				) throw new Error('OSM PBFのrelationの配列長が一致しません');
				reserveRefs(relation.memids.length);
				let ref = 0;
				const members = relation.memids.map((delta, i): OsmMember => {
					const type = (['node', 'way', 'relation'] as const)[relation.types[i]];
					if (!type) throw new Error('OSM PBFのrelationの参照種別が不正です');
					return {
						type,
						ref: ref = idValue(ref + delta),
						role: string(relation.roles_sid[i])
					};
				});
				add({ type: 'relation', id: relation.id, tags: tags(relation), members });
			}
		}
	};
	await readOsmBlocks(file, decode);
	return elements;
};
