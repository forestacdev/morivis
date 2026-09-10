import type { ModelLodLevel } from '$routes/map/data/types/model';

const HIGH_DETAIL_ZOOM_OFFSET = 0.01;

/** 現在ズームで読み込む GLB を決定する。下位LODに一致しなければ最高解像度を使う。 */
export const resolveModelLodUrl = (
	defaultUrl: string,
	lods: ModelLodLevel[] | undefined,
	zoom: number
) => {
	const selected = lods?.reduce<ModelLodLevel | undefined>((current, candidate) => {
		if (candidate.maxZoom < zoom) return current;
		return !current || candidate.maxZoom < current.maxZoom ? candidate : current;
	}, undefined);

	return selected?.url ?? defaultUrl;
};

/** 下位 LOD の上限を少し越え、最高詳細モデルが選ばれるズームを返す。 */
export const getHighDetailLodZoom = (lods: ModelLodLevel[] | undefined) => {
	if (!lods?.length) return undefined;

	// maxZoom は下位 LOD が選ばれる境界値なので、最高詳細へ切り替えるために微小量を加える。
	return Math.max(...lods.map((lod) => lod.maxZoom)) + HIGH_DETAIL_ZOOM_OFFSET;
};

/** 現在読み込まれているURLが最高詳細モデルではないかを判定する。 */
export const isLowerDetailLodUrl = (activeUrl: string | undefined, highDetailUrl: string) =>
	activeUrl !== undefined && activeUrl !== highDetailUrl;
