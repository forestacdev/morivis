import { DefaultMmdRuntime } from '@yohawing/three-mmd-loader/runtime';
import {
	disposeMmdModel,
	type ThreeMmdAnimation,
	ThreeMmdLoader
} from '@yohawing/three-mmd-loader/three';
import { SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createTestPmxMorphs } from './__fixtures__/test-pmx-morphs';
import { loadPmxModel } from './pmx-loader';
import {
	applyPmxMorphState,
	createPmxMorphAnimation,
	getPmxMorphCatalog,
	normalizePmxMorphWeights
} from './pmx-morphs';

const poseBytes = (translation: number) =>
	new TextEncoder().encode(
		`Vocaloid Pose Data file\n\ntest-model.pmx;\n1;\nBone0{test-bone\n${translation},0,0;\n0,0,0,1;\n}\n`
	);

describe('PMXの手動表情', () => {
	it('JSランタイムでもグループモーフを解除して頂点を元へ戻す', async () => {
		const loader = new ThreeMmdLoader({ runtimeFactory: () => new DefaultMmdRuntime() });
		const model = await loader.loadModel(createTestPmxMorphs(), {
			outline: false,
			morphSplit: false
		});
		try {
			const { options } = getPmxMorphCatalog(model);
			applyPmxMorphState(model, options, { '2': 0.5 }, undefined, 0, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(0.25);
			applyPmxMorphState(model, options, {}, undefined, 0, false);
			expect(model.mesh.morphTargetInfluences).toEqual([0, 0, 0]);
			expect(model.mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual([0, 0, 0]);
		} finally {
			disposeMmdModel(model);
		}
	});

	it('実際にロードしたPMXから重複なしでモーフ名を取得し、描画用属性を保持する', async () => {
		const { model } = await loadPmxModel(createTestPmxMorphs());
		try {
			const catalog = getPmxMorphCatalog(model);
			expect(catalog.options.map(option => option.name)).toEqual([
				'test-vertex',
				'test-bone-morph',
				'test-group'
			]);
			expect(catalog.unsupportedCount).toBe(0);
			expect(model.mesh.geometry.morphAttributes.position?.length).toBe(3);
			applyPmxMorphState(model, catalog.options, { '0': 0.5 }, undefined, 0, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(0.5);
		} finally {
			disposeMmdModel(model);
		}
	});
	it('頂点・ボーン・グループを組み合わせ、変更・リセットで累積させない', async () => {
		const { model } = await loadPmxModel(createTestPmxMorphs());
		try {
			const { options } = getPmxMorphCatalog(model);
			applyPmxMorphState(
				model,
				options,
				{ '0': 0.25, '1': 0.5, '2': 0.5 },
				undefined,
				0,
				false
			);
			expect(model.mesh.morphTargetInfluences?.[0]).toBeCloseTo(0.5);
			expect(model.mesh.skeleton.bones[0].position.y).toBeCloseTo(1.25);
			applyPmxMorphState(model, options, { '0': 0.1, '1': 0.25 }, undefined, 0, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(0.1);
			expect(model.mesh.skeleton.bones[0].position.y).toBeCloseTo(0.5);
			applyPmxMorphState(model, options, {}, undefined, 0, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).toArray()).toEqual([0, 0, 0]);
		} finally {
			disposeMmdModel(model);
		}
	});
	it('再生更新でも手動表情を維持し、解除時に元のモーフトラックへ戻す', async () => {
		const { model, loader } = await loadPmxModel(createTestPmxMorphs());
		try {
			const { options } = getPmxMorphCatalog(model);
			const pose = await loader.loadPoseAnimation(poseBytes(2));
			const motion: ThreeMmdAnimation = {
				...pose,
				animation: {
					...pose.animation,
					morphTracks: {
						'test-vertex': {
							packed: 'morph',
							frames: new Uint32Array([0, 30]),
							weights: new Float32Array([0.2, 0.8])
						}
					},
					metadata: { ...pose.animation.metadata, maxFrame: 30 }
				}
			};
			applyPmxMorphState(model, options, { '0': 0.4 }, motion, 0, false);
			model.update(1);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(2.4);
			expect(motion.animation.morphTracks['test-vertex'].weights[1]).toBeCloseTo(0.8);
			applyPmxMorphState(model, options, { '0': 0 }, motion, 1, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(2);
			applyPmxMorphState(model, options, {}, motion, 1, false);
			expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(2.8);
		} finally {
			disposeMmdModel(model);
		}
	});
	it('ポーズを切り替えても、手動表情と元の骨姿勢を保つ', async () => {
		const { model, loader } = await loadPmxModel(createTestPmxMorphs());
		try {
			const { options } = getPmxMorphCatalog(model);
			for (const translation of [2, 4, 2]) {
				const pose = await loader.loadPoseAnimation(poseBytes(translation));
				applyPmxMorphState(model, options, { '0': 0.5 }, pose, 0, true, false);
				expect(model.mesh.getVertexPosition(0, new Vector3()).x).toBeCloseTo(
					translation + 0.5
				);
			}
		} finally {
			disposeMmdModel(model);
		}
	});
	it('名前の別名を同じモーフとして扱い、非対応・循環グループを除外する', () => {
		const mesh = new SkinnedMesh();
		mesh.morphTargetDictionary = {
			'test-face': 0,
			'test-alias': 0,
			'test-uv': 1,
			'test-cycle': 2,
			'test-mixed': 3
		};
		mesh.userData.mmdMorphs = [{ name: 'test-face', type: 'vertex' }, { type: 'uv' }, {
			type: 'group',
			groupOffsets: [{ morphIndex: 2, weight: 1 }]
		}, { type: 'group', groupOffsets: [{ morphIndex: 1, weight: 1 }] }];
		const catalog = getPmxMorphCatalog({ mesh });
		expect(catalog.options).toEqual([{
			index: 0,
			name: 'test-face',
			trackNames: ['test-face', 'test-alias']
		}]);
		expect(catalog.unsupportedCount).toBe(3);
		const animation = createPmxMorphAnimation(undefined, { '0': 0.5 }, catalog.options);
		expect(animation?.animation.morphTracks['test-alias'].weights[0]).toBe(0.5);
	});
	it('未指定と0を区別し、不正値・未知の番号を除外して範囲を制限する', () => {
		const options = [0, 1, 2, 3].map(index => ({
			index,
			name: `test-${index}`,
			trackNames: [`test-${index}`]
		}));
		expect(normalizePmxMorphWeights({ '0': 0, '1': 2, '2': -1, '3': NaN, '99': 1 }, options))
			.toEqual({ '0': 0, '1': 1, '2': 0 });
		expect(normalizePmxMorphWeights(undefined, options)).toEqual({});
		expect(createPmxMorphAnimation(undefined, {}, options)).toBeUndefined();
	});
});
