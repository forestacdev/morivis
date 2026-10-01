import type {
	GaussianSplatEntry,
	MeshEntry,
	MeshStyle,
	ThreeModelEntry
} from '$routes/map/data/types/model';
import type { ModelAttributes } from '$routes/map/utils/three/model-attributes';
import type { ModelTransform } from '$routes/map/utils/three/model-transform';
import type { LoadedPmxModel } from '$routes/map/utils/three/pmx-loader';
import type { getPmxMorphCatalog } from '$routes/map/utils/three/pmx-morphs';
import type { VRM } from '@pixiv/three-vrm';
import type { ThreeMmdAnimation } from '@yohawing/three-mmd-loader/three';
import type * as THREE from 'three';

export interface LoadedModel {
	entry: ThreeModelEntry;
	object: THREE.Object3D;
	transform: ModelTransform;
	mixer?: THREE.AnimationMixer;
	actions?: THREE.AnimationAction[];
	lastClipIndex?: number;
	lastAnimationLoop?: boolean;
	lastAnimationPlaying?: boolean;
	mmd?: {
		model: LoadedPmxModel;
		animations: Map<number, ThreeMmdAnimation>;
		morphCatalog: ReturnType<typeof getPmxMorphCatalog>;
		morphStateKey?: string;
		morphOverridesActive?: boolean;
		activeClipIndex?: number;
		loadingClipIndex?: number;
		elapsedSeconds: number;
		durationSeconds?: number;
		lastPlaying?: boolean;
	};
	vrm?: VRM;
	vrmAnimation?: {
		mixer: THREE.AnimationMixer;
		clips: Map<number, THREE.AnimationClip>;
		actions: Map<number, THREE.AnimationAction>;
		activeClipIndex?: number;
		activeAction?: THREE.AnimationAction;
		loadingClipIndex?: number;
		lastLoop?: boolean;
		lastPlaying?: boolean;
	};
	lod?: {
		activeUrl: string;
		failedUrl?: string;
		pendingLoad?: Promise<void>;
		pendingUrl?: string;
	};
	resolveAttributes?: (hit: THREE.Intersection<THREE.Object3D>) => Promise<ModelAttributes>;
}

export const isMeshModelEntry = (entry: ThreeModelEntry): entry is MeshEntry<MeshStyle> =>
	entry.style.type === 'mesh';

export const isGaussianSplatEntry = (entry: ThreeModelEntry): entry is GaussianSplatEntry =>
	entry.style.type === 'gaussian-splat';
