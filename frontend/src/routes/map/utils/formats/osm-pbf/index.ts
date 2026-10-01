import type { Feature, FeatureCollection } from '$routes/map/types/geojson';
import type { AnyGeometry } from '$routes/map/types/geometry';
import osmtogeojson from 'osmtogeojson';
import { formatOsmPbf } from './definition';
import { type OsmEntity, readOsmEntities } from './entities';

type OsmFeature = GeoJSON.Feature<GeoJSON.Geometry, {
	type: string;
	id: number;
	tags: Record<string, string>;
	tainted?: boolean;
}>;
// ライブラリはコールバックを公開しているが、同梱型定義には第3引数がない。
const toGeoJson = osmtogeojson as unknown as (
	data: { elements: OsmEntity[]; },
	options: { flatProperties: boolean; },
	onFeature: (feature: OsmFeature) => void
) => void;

/** PBFの復号は@osmix/pbf、OSMの図形組み立てはXMLでも使うosmtogeojsonへ任せる。 */
export const convertOsmPbf = async (file: File): Promise<FeatureCollection> => {
	const elements = await readOsmEntities(file);
	const features: Feature[] = [];
	const encoder = new TextEncoder();
	let outputBytes = 42, vertices = 0;
	const emit = (feature: Feature) => {
		if (features.length >= formatOsmPbf.limits.maxFeatures) {
			throw new Error(
				`OSMは${
					formatOsmPbf.limits.maxFeatures.toLocaleString('ja-JP')
				}地物以下に分割してください`
			);
		}
		const count = (coords: unknown): void => {
			if (!Array.isArray(coords)) throw new Error('OSM PBFの変換後の図形が不正です');
			if (typeof coords[0] === 'number') {
				if (++vertices > formatOsmPbf.limits.maxVertices) {
					throw new Error(
						`OSMの出力は${
							formatOsmPbf.limits.maxVertices.toLocaleString('ja-JP')
						}頂点以下にしてください`
					);
				}
				if (coords.length < 2 || !coords.every(Number.isFinite)) {
					throw new Error('OSM PBFの変換後の座標が不正です');
				}
			} else coords.forEach(count);
		};
		count(feature.geometry.coordinates);
		outputBytes += encoder.encode(JSON.stringify(feature)).length + 1;
		if (outputBytes > formatOsmPbf.limits.maxOutputBytes) {
			throw new Error('OSMの展開結果が大きすぎます。範囲を分割してください');
		}
		features.push(feature);
	};
	toGeoJson({ elements }, { flatProperties: false }, feature => {
		const { type, id, tags, tainted } = feature.properties;
		if (type === 'node' && !Object.keys(tags).length) return;
		const geometry = feature.geometry;
		if (geometry.type === 'GeometryCollection') {
			throw new Error('OSMの図形組み立て結果が不正です');
		}
		emit({
			type: 'Feature',
			id: `${type}/${id}`,
			geometry: (type === 'relation' && geometry.type === 'Polygon'
				? { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
				: geometry) as AnyGeometry,
			properties: {
				...tags,
				...(type === 'way' && ['Polygon', 'MultiPolygon'].includes(geometry.type)
					? { osm_way_id: String(id) }
					: { osm_id: String(id) }),
				'osm:type': type,
				'osm:id': String(id),
				...(tainted ? { 'osm:tainted': true } : {})
			}
		});
	});
	// restriction等も、従来のother_relations同様に構成図形を残す。
	const otherRelations = elements.filter((
		entity
	): entity is Extract<OsmEntity, { type: 'relation'; }> =>
		entity.type === 'relation'
		&& !['route', 'waterway', 'multipolygon', 'boundary'].includes(entity.tags.type)
	);
	const entities = new Map<string, OsmEntity>();
	if (otherRelations.length) {
		for (const element of elements) entities.set(`${element.type}/${element.id}`, element);
	}
	for (const relation of otherRelations) {
		let index = 0;
		const path = new Set<number>();
		const visit = (entity: OsmEntity, depth: number): void => {
			if (depth > 32) throw new Error('OSM PBFのrelationの階層が深すぎます');
			if (entity.type === 'relation') {
				if (path.has(entity.id)) throw new Error('OSM PBFのrelationの参照が循環しています');
				path.add(entity.id);
				for (const member of entity.members) {
					const child = entities.get(`${member.type}/${member.ref}`);
					if (child) visit(child, depth + 1);
				}
				path.delete(entity.id);
				return;
			}
			let geometry: AnyGeometry;
			if (entity.type === 'node') {
				geometry = { type: 'Point', coordinates: [entity.lon, entity.lat] };
			} else {
				const coords: [number, number][] = [];
				for (const id of entity.nodes) {
					const node = entities.get(`node/${id}`);
					if (node?.type !== 'node') return; // 欠損ノードをまたぐ線を新たに作らない。
					coords.push([node.lon, node.lat]);
				}
				if (coords.length < 2) return;
				geometry = { type: 'LineString', coordinates: coords };
			}
			emit({
				type: 'Feature',
				id: `relation/${relation.id}_${index++}`,
				geometry,
				properties: {
					...relation.tags,
					osm_id: String(relation.id),
					'osm:type': 'relation',
					'osm:id': String(relation.id)
				}
			});
		};
		visit(relation, 0);
	}
	if (!features.length) throw new Error('OSMファイルに描画可能な地物がありません');
	return { type: 'FeatureCollection', features };
};
