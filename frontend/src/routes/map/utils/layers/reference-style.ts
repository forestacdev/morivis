import { MAP_STYLE_SATELLITE_PATH } from '$routes/constants';
import type {
	LineLayerSpecification,
	StyleSpecification,
	SymbolLayerSpecification,
	VectorSourceSpecification
} from '$routes/map/utils/maplibre';
import { fetchWithDevProxy } from '$routes/map/utils/platform/request';

type ReferenceLayer = LineLayerSpecification | SymbolLayerSpecification;
type ReferenceLayerGroup = 'line' | 'label' | 'poi';
export type ReferenceLayerVisibility = { line: boolean; label: boolean; };
export type ReferenceStyle = {
	layers: ReferenceLayer[];
	sources: Record<string, VectorSourceSpecification>;
};

const REFERENCE_PREFIX = '@reference_';

const getReferenceLayerGroup = (
	layer: StyleSpecification['layers'][number]
): ReferenceLayerGroup | null => {
	if (layer.type === 'line') {
		return layer['source-layer'] === 'transportation' || layer['source-layer'] === 'boundary'
			? 'line'
			: null;
	}
	if (layer.type !== 'symbol') return null;

	const id = layer.id.startsWith(REFERENCE_PREFIX)
		? layer.id.slice(REFERENCE_PREFIX.length)
		: layer.id;
	if (id.startsWith('label-')) return 'label';
	if (id.startsWith('poi-')) return 'poi';
	return null;
};

/** 線・地名・POIを、配信スタイルの描画順のまま取り出す。 */
export const extractReferenceStyle = (style: StyleSpecification): ReferenceStyle => {
	if (style.version !== 8 || !Array.isArray(style.layers) || !style.sources) {
		throw new Error('地図表示用スタイルの形式が不正です');
	}

	const sources: ReferenceStyle['sources'] = {};
	const layers = style.layers
		.filter((layer): layer is ReferenceLayer => getReferenceLayerGroup(layer) !== null)
		.map((layer) => {
			const source = style.sources[layer.source];
			if (!source || source.type !== 'vector') {
				throw new Error(`レイヤー ${layer.id} のベクターソースが見つかりません`);
			}

			// ユーザーのレイヤーやプレビューが使う同名ソースと干渉させない。
			const sourceId = `${REFERENCE_PREFIX}${layer.source}`;
			sources[sourceId] = structuredClone(source);
			return {
				...structuredClone(layer),
				id: `${REFERENCE_PREFIX}${layer.id}`,
				source: sourceId
			};
		});

	if (layers.length === 0) {
		throw new Error('スタイルに線・地名・POIのレイヤーがありません');
	}

	return { layers, sources };
};

/** 表示するグループに必要なレイヤーとソースだけを選ぶ。 */
export const selectReferenceStyle = (
	style: ReferenceStyle,
	visibility: ReferenceLayerVisibility
): ReferenceStyle => {
	const layers = style.layers.filter((layer) => {
		const group = getReferenceLayerGroup(layer);
		return group !== null && visibility[group === 'poi' ? 'label' : group];
	});
	const sources = Object.fromEntries(
		[...new Set(layers.map((layer) => layer.source))].map((id) => [id, style.sources[id]])
	);
	return { layers, sources };
};

let referenceStylePromise: Promise<ReferenceStyle> | null = null;

/** 同時取得と成功結果を共有し、失敗した取得は次のスタイル更新で再試行する。 */
export const loadReferenceStyle = async (): Promise<ReferenceStyle> => {
	referenceStylePromise ??= (async () => {
		const response = await fetchWithDevProxy(MAP_STYLE_SATELLITE_PATH, {
			signal: AbortSignal.timeout(15000)
		});
		if (!response.ok) {
			throw new Error(`地図表示用スタイルの取得に失敗しました (${response.status})`);
		}
		return extractReferenceStyle(await response.json());
	})().catch((error) => {
		referenceStylePromise = null;
		throw error;
	});

	return structuredClone(await referenceStylePromise);
};
