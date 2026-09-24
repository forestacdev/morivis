import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// glTF専用ビルドはDraco点群を復号できないため、PNTSとメッシュに対応する通常版を使う。
export const createTilesDracoLoader = () =>
	new DRACOLoader().setDecoderPath(resolveStaticAssetPath('/draco/'));
