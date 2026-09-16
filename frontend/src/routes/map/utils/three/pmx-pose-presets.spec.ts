import { DefaultMmdRuntime } from '@yohawing/three-mmd-loader/runtime';
import { ThreeMmdLoader, type ThreeMmdModel } from '@yohawing/three-mmd-loader/three';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { applyPmxAnimationClip } from './pmx-loader';
import { getDefaultPmxPoseClips, withDefaultPmxPoses } from './pmx-pose-presets';

// 手作りの対称な骨格。モデルファイルや実在の人体寸法には依存しない。
const createTestSkeleton = () => {
	const bones: THREE.Bone[] = [];
	const addBone = (name: string, parent: THREE.Object3D, position: [number, number, number]) => {
		const bone = new THREE.Bone();
		bone.name = name;
		bone.position.fromArray(position);
		parent.add(bone);
		bones.push(bone);
		return bone;
	};
	const mesh = new THREE.SkinnedMesh();
	const root = addBone('全ての親', mesh, [0, 0, 0]);
	const center = addBone('センター', root, [0, 10, 0]);
	const lower = addBone('下半身', center, [0, 0, 0]);
	const upper = addBone('上半身', center, [0, 0, 0]);
	const neck = addBone('首', upper, [0, 5, 0]);
	const head = addBone('頭', neck, [0, 1, 0]);
	for (const [prefix, side] of [['左', 1], ['右', -1]] as const) {
		const thigh = addBone(`${prefix}足`, lower, [side, -0.5, 0]);
		const knee = addBone(`${prefix}ひざ`, thigh, [0, -4.5, 0]);
		addBone(`${prefix}足首`, knee, [0, -4.5, 0]);
		const arm = addBone(`${prefix}腕`, upper, [side, 4, 0]);
		const elbow = addBone(`${prefix}ひじ`, arm, [side * 2.5, -1.5, 0]);
		addBone(`${prefix}手首`, elbow, [side * 2, -1.2, 0]);
	}
	mesh.bind(new THREE.Skeleton(bones));
	const runtime = new DefaultMmdRuntime();
	const model: Pick<ThreeMmdModel, 'setAnimation' | 'update' | 'runtime'> = {
		runtime,
		setAnimation: (animation) =>
			runtime.setAnimation('animation' in animation ? animation.animation : animation, mesh),
		update: vi.fn((seconds, options) => runtime.tick(seconds, { ...options, mesh }))
	};
	const position = (name: string) =>
		bones.find((bone) => bone.name === name)!.getWorldPosition(new THREE.Vector3());
	return { model, mesh, position, head, center };
};

describe('PMX default pose presets', () => {
	it('appends all nine presets once, preserving imported clip indices and playback defaults', () => {
		const existing = {
			clips: [{ name: 'test-motion', type: 'vmd' as const, url: 'blob:test-motion' }],
			defaultClipIndex: 0,
			autoPlay: true
		};
		const merged = withDefaultPmxPoses(existing);
		expect(merged.clips).toHaveLength(10);
		expect(merged.clips[0]).toBe(existing.clips[0]);
		expect(merged.autoPlay).toBe(true);
		expect(merged.defaultClipIndex).toBe(0);
		expect(withDefaultPmxPoses(merged)).toBe(merged);
		expect(existing.clips).toHaveLength(1);
		expect(withDefaultPmxPoses().autoPlay).toBe(false);
		expect(withDefaultPmxPoses().defaultClipIndex).toBe(-1);
		expect(withDefaultPmxPoses({ clips: [] }).defaultClipIndex).toBe(-1);
		expect(withDefaultPmxPoses({ ...existing, defaultClipIndex: -1 }).defaultClipIndex).toBe(
			-1
		);
	});

	it.each(['common', 'male', 'female'])(
		'applies upright, seated and supine joint positions for %s',
		async (variant) => {
			const loader = new ThreeMmdLoader();
			const test = createTestSkeleton();
			const prefix = variant === 'common' ? '' : `${variant}-`;
			const presets = getDefaultPmxPoseClips().filter((preset) =>
				preset.url.endsWith(`/${prefix}standing.vpd`)
				|| preset.url.endsWith(`/${prefix}sitting.vpd`)
				|| preset.url.endsWith(`/${prefix}lying.vpd`)
			);
			const animations = await Promise.all(
				['standing', 'sitting', 'lying'].map(async (name) => {
					const bytes = await readFile(`static/poses/pmx/${prefix}${name}.vpd`);
					return loader.loadPoseAnimation(new Uint8Array(bytes), name);
				})
			);
			let standingAnkleHeight = 0;
			for (const [index, animation] of animations.entries()) {
				expect(animation.animation.metadata.maxFrame).toBe(0);
				applyPmxAnimationClip(test.model, animation, true, presets[index].ik);
				expect(test.model.update).toHaveBeenLastCalledWith(0, {
					physics: false,
					ik: false
				});
				const left = test.position('左足');
				const right = test.position('右足');
				expect(left.x).toBeCloseTo(-right.x);
				expect(left.y).toBeCloseTo(right.y);
				if (index === 0) {
					standingAnkleHeight = test.position('左足首').y;
					expect(test.position('頭').y).toBeGreaterThan(test.position('センター').y);
					expect(test.position('左手首').y).toBeLessThan(test.position('左ひじ').y);
				} else if (index === 1) {
					expect(test.position('左ひざ').y).toBeCloseTo(left.y);
					expect(test.position('左ひざ').z).toBeGreaterThan(left.z + 4);
					expect(test.position('左足首').y).toBeCloseTo(0.5);
				} else {
					expect(test.position('頭').y).toBeCloseTo(test.position('センター').y);
					const faceDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(
						test.head.getWorldQuaternion(new THREE.Quaternion())
					);
					expect(faceDirection.y).toBeCloseTo(1);
				}
			}
			applyPmxAnimationClip(test.model, animations[0], true, false);
			expect(test.position('センター').y).toBeCloseTo(10);
			expect(test.position('左足首').y).toBeCloseTo(standingAnkleHeight);
		}
	);
	it.each(['standing', 'sitting', 'lying'])(
		'distinguishes stance width without crossing the legs in %s',
		async (pose) => {
			const widths: number[] = [];
			for (const variant of ['male', 'female']) {
				const loader = new ThreeMmdLoader();
				const bytes = await readFile(`static/poses/pmx/${variant}-${pose}.vpd`);
				const animation = await loader.loadPoseAnimation(new Uint8Array(bytes));
				const test = createTestSkeleton();
				applyPmxAnimationClip(test.model, animation, true, false);
				const joint = pose === 'sitting' ? 'ひざ' : '足首';
				const width = test.position(`左${joint}`).x - test.position(`右${joint}`).x;
				expect(width).toBeGreaterThan(0);
				widths.push(width);
			}
			expect(widths[0]).toBeGreaterThan(widths[1]);
		}
	);
});
