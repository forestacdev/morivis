import type { AnyTiles3DEntry } from '$routes/map/data/types/model';
import {
	Color,
	Material,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	Points,
	PointsMaterial
} from 'three';

type StyledObject = Mesh | Points;
type MaterialState = { object: StyledObject; original: Material[]; flat: Material[]; };

/** 元マテリアルはTilesRendererが所有し、flat表示用の追加分だけをここで所有する。 */
export const createTilesMaterialController = () => {
	const scenes = new Map<Object3D, MaterialState[]>();
	const register = (scene: Object3D) => {
		const states: MaterialState[] = [];
		scene.traverse((object) => {
			if (!(object instanceof Mesh) && !(object instanceof Points)) return;
			const original = Array.isArray(object.material) ? object.material : [object.material];
			const flat = original.map((material) => {
				if (!(material instanceof MeshStandardMaterial)) return material;
				return new MeshBasicMaterial({
					color: material.color.clone(),
					map: material.map,
					alphaMap: material.alphaMap,
					vertexColors: material.vertexColors,
					side: material.side,
					alphaTest: material.alphaTest,
					transparent: material.transparent,
					opacity: material.opacity,
					depthWrite: material.depthWrite
				});
			});
			states.push({ object, original, flat });
		});
		scenes.set(scene, states);
	};
	const bases = new WeakMap<
		Material,
		{ opacity: number; transparent: boolean; color?: Color; }
	>();
	const apply = (scene: Object3D, entry: AnyTiles3DEntry) => {
		if (!scenes.has(scene)) register(scene);
		for (const { object, original, flat } of scenes.get(scene)!) {
			const materials =
				entry.style.type === '3d-tiles-mesh' && entry.style.lighting === 'flat'
					? flat
					: original;
			object.material = Array.isArray(object.material) ? materials : materials[0];
			for (const material of materials) {
				const colored = material as Material & { color?: Color; };
				if (!bases.has(material)) {
					bases.set(material, {
						opacity: material.opacity,
						transparent: material.transparent,
						color: colored.color?.clone()
					});
				}
				const base = bases.get(material)!;
				material.opacity = base.opacity * entry.style.opacity;
				const transparent = base.transparent || material.opacity < 1;
				if (material.transparent !== transparent) {
					material.transparent = transparent;
					material.needsUpdate = true;
				}
				if (base.color && colored.color && entry.style.type === '3d-tiles-mesh') {
					colored.color.copy(base.color).multiply(new Color(entry.style.color));
				}
				if (material instanceof PointsMaterial && entry.style.type === 'point-cloud') {
					material.size = entry.style.pointSize;
					material.sizeAttenuation = false;
				}
			}
		}
	};
	const release = (scene: Object3D) => {
		for (const { original, flat } of scenes.get(scene) ?? []) {
			flat.forEach((material, index) => {
				if (material !== original[index]) material.dispose();
			});
		}
		scenes.delete(scene);
	};
	return {
		apply,
		release,
		dispose: () => {
			for (const scene of scenes.keys()) release(scene);
		}
	};
};
