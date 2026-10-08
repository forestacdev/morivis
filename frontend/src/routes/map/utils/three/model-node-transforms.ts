import type { ThreeModelEntry } from '$routes/map/data/types/model';
import type { Object3D } from 'three';

/** 保存可能なノード変換を、現在選択された時刻で描画オブジェクトへ反映する。 */
export const applyModelNodeTransforms = (object: Object3D, entry: ThreeModelEntry): void => {
	const transforms = entry.properties?.nodeTransforms;
	if (!transforms?.length) return;
	const index = entry.state?.dimension?.currentIndex ?? 0;
	for (const item of transforms) {
		const node = object.getObjectByName(item.nodeName);
		if (!node) continue;
		const frame = item.frames[index];
		node.visible = !!frame;
		if (frame) {
			node.matrixAutoUpdate = false;
			node.matrix.fromArray(frame);
			node.matrixWorldNeedsUpdate = true;
		}
	}
	object.updateMatrixWorld(true);
};
