import type { VectorEntryGeometryType } from '$routes/map/data/types/vector';
import type { FeatureCollection } from '$routes/map/types/geojson';
import { canRenderGeoJsonAs3d, type GeoJsonRenderMode } from './geojson-entry';

/**
 * 2D/3D の描画方式選択ダイアログの状態を扱う。
 * 「3D描画可能なら選択させ、そうでなければ2Dで進める」導線を各フォームで共通化する。
 */
export const createRenderModeState = () => {
	let showDialog = $state(false);
	let selected = $state<GeoJsonRenderMode>('geojson');

	return {
		get showDialog() {
			return showDialog;
		},
		set showDialog(value: boolean) {
			showDialog = value;
		},
		get selected() {
			return selected;
		},
		set selected(value: GeoJsonRenderMode) {
			selected = value;
		},

		/** 選択UIを出す必要があるか。3D描画できないデータでは false。 */
		needsSelection(geojson: FeatureCollection, geometryType: VectorEntryGeometryType) {
			return canRenderGeoJsonAs3d(geojson, geometryType);
		},

		/**
		 * 選択が必要なら選択UIを開く。開いた場合は true を返す。
		 * 呼び出し側は true のとき entry 生成を中断し、ユーザーの決定を待つ。
		 */
		open(geojson: FeatureCollection, geometryType: VectorEntryGeometryType) {
			if (!canRenderGeoJsonAs3d(geojson, geometryType)) {
				showDialog = false;
				return false;
			}
			showDialog = true;
			return true;
		},

		reset() {
			showDialog = false;
			selected = 'geojson';
		}
	};
};

export type RenderModeState = ReturnType<typeof createRenderModeState>;
