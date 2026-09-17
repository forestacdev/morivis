import type { PmxMorphWeights } from '$routes/map/data/types/model';
import type { MmdAnimation } from '@yohawing/three-mmd-loader/parser';
import type { ThreeMmdAnimation, ThreeMmdModel } from '@yohawing/three-mmd-loader/three';
import { clearPmxAnimationClip } from './pmx-loader';

export interface PmxMorphOption {
	index: number;
	name: string;
	trackNames: string[];
}
export interface PmxMorphCatalog {
	options: PmxMorphOption[];
	unsupportedCount: number;
}
interface RuntimeMorph {
	name?: string;
	type?: string;
	groupOffsets?: { morphIndex: number; weight: number; }[];
}

/** 現在のMMDランタイムが手動トラックで描画できる頂点・ボーンと、そのグループ。 */
export const getPmxMorphCatalog = (model: Pick<ThreeMmdModel, 'mesh'>): PmxMorphCatalog => {
	const morphs: RuntimeMorph[] = model.mesh.userData.mmdMorphs ?? [];
	const dictionary = model.mesh.morphTargetDictionary ?? {};
	const supported = (index: number, ancestors = new Set<number>()): boolean => {
		const morph = morphs[index];
		if (!morph || ancestors.has(index)) return false;
		if (morph.type === 'vertex' || morph.type === 'bone') return true;
		if (morph.type !== 'group' || !morph.groupOffsets?.length) return false;
		const visited = new Set(ancestors).add(index);
		return morph.groupOffsets.every(offset =>
			Number.isFinite(offset.weight) && supported(offset.morphIndex, visited)
		);
	};
	const namesByIndex = new Map<number, string[]>();
	for (const [name, index] of Object.entries(dictionary)) {
		if (!name || !Number.isInteger(index) || index < 0 || index >= morphs.length) continue;
		const names = namesByIndex.get(index) ?? [];
		names.push(name);
		namesByIndex.set(index, names);
	}
	const options: PmxMorphOption[] = [];
	let unsupportedCount = 0;
	for (const [index, trackNames] of namesByIndex) {
		if (!supported(index)) {
			unsupportedCount++;
			continue;
		}
		options.push({ index, name: morphs[index].name || trackNames[0], trackNames });
	}
	return { options: options.sort((a, b) => a.index - b.index), unsupportedCount };
};

export const normalizePmxMorphWeights = (
	weights: PmxMorphWeights | undefined,
	options: readonly PmxMorphOption[]
): PmxMorphWeights =>
	Object.fromEntries(options.flatMap(option => {
		const value = weights?.[option.index];
		return typeof value === 'number' && Number.isFinite(value)
			? [[String(option.index), Math.max(0, Math.min(1, value))]]
			: [];
	}));

/** 元のVMD/VPDを変更せず、操作したモーフのトラックだけを定数に置換する。 */
export const createPmxMorphAnimation = (
	animation: ThreeMmdAnimation | undefined,
	weights: PmxMorphWeights | undefined,
	options: readonly PmxMorphOption[]
): ThreeMmdAnimation | undefined => {
	const normalized = normalizePmxMorphWeights(weights, options);
	if (!Object.keys(normalized).length) return animation;
	const base: MmdAnimation = animation?.animation ?? {
		kind: 'vmd',
		bytes: new Uint8Array(),
		metadata: {
			modelName: '',
			maxFrame: 0,
			counts: { bones: 0, morphs: 0, cameras: 0, lights: 0, selfShadows: 0, properties: 0 }
		},
		boneTracks: {},
		morphTracks: {},
		cameraFrames: [],
		lightFrames: [],
		selfShadowFrames: [],
		propertyFrames: []
	};
	const morphTracks = { ...base.morphTracks };
	for (const option of options) {
		const weight = normalized[option.index];
		if (weight === undefined) continue;
		for (const name of option.trackNames) {
			Object.defineProperty(morphTracks, name, {
				value: {
					packed: 'morph',
					frames: new Uint32Array([0]),
					weights: new Float32Array([weight])
				},
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
	}
	return {
		source: animation?.source ?? new Uint8Array(),
		animation: {
			...base,
			// 元バイナリではなく変更したトラックを評価する（VPDと同じ経路）。
			bytes: new Uint8Array(),
			morphTracks
		}
	};
};

export const applyPmxMorphState = (
	model: Pick<ThreeMmdModel, 'runtime' | 'setAnimation' | 'update'>,
	options: readonly PmxMorphOption[],
	weights: PmxMorphWeights | undefined,
	animation: ThreeMmdAnimation | undefined,
	seconds: number,
	isPose: boolean,
	ik = true
) => {
	const composed = createPmxMorphAnimation(animation, weights, options);
	if (!composed) {
		clearPmxAnimationClip(model);
		return;
	}
	// バインド時に現在のポーズが基準姿勢として累積しないよう戻す。
	model.runtime.resetPose();
	model.setAnimation(composed);
	model.update(
		seconds,
		isPose || !animation ? { physics: false, ik: animation ? ik : false } : undefined
	);
};
