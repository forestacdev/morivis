import { DefaultMmdRuntime } from '@yohawing/three-mmd-loader/runtime';
import { ThreeMmdLoader, type ThreeMmdModel } from '@yohawing/three-mmd-loader/three';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { applyPmxAnimationClip, clearPmxAnimationClip, loadPmxAnimationClip } from './pmx-loader';

const createPoseUrl = (translation: number) =>
	`data:application/octet-stream,${
		encodeURIComponent(`Vocaloid Pose Data file

test-model.pmx;
1;
Bone0{test-bone
${translation}, 0, 0;
0, 0, 0.70710678, 0.70710678;
}
`)
	}`;

const createLoader = () =>
	new ThreeMmdLoader({
		fetch: async (url) => {
			const source = url.toString();
			return new Response(decodeURIComponent(source.slice(source.indexOf(',') + 1)));
		}
	});

describe('PMX static poses', () => {
	it('applies a VPD at frame zero and switches poses without accumulating transforms', async () => {
		const loader = createLoader();
		const bone = new THREE.Bone();
		bone.name = 'test-bone';
		bone.position.set(10, 0, 0);
		const mesh = new THREE.SkinnedMesh();
		mesh.add(bone);
		mesh.bind(new THREE.Skeleton([bone]));
		const runtime = new DefaultMmdRuntime();
		const model: Pick<ThreeMmdModel, 'setAnimation' | 'update' | 'runtime'> = {
			runtime,
			setAnimation: (animation) =>
				runtime.setAnimation(
					'animation' in animation ? animation.animation : animation,
					mesh
				),
			update: (seconds, options) => runtime.tick(seconds, { ...options, mesh })
		};
		const first = await loadPmxAnimationClip(loader, {
			name: 'test-pose-a',
			type: 'vpd',
			url: createPoseUrl(2)
		});
		const second = await loadPmxAnimationClip(loader, {
			name: 'test-pose-b',
			type: 'vpd',
			url: createPoseUrl(4)
		});

		applyPmxAnimationClip(model, first, true);
		expect(bone.position.x).toBeCloseTo(12);
		expect(Math.abs(bone.quaternion.z)).toBeCloseTo(Math.SQRT1_2);
		expect(runtime.frameState().seconds).toBe(0);
		applyPmxAnimationClip(model, second, true);
		expect(bone.position.x).toBeCloseTo(14);
		applyPmxAnimationClip(model, first, true);
		expect(bone.position.x).toBeCloseTo(12);
		clearPmxAnimationClip(model);
		expect(bone.position.x).toBeCloseTo(10);
		expect(bone.quaternion.equals(new THREE.Quaternion())).toBe(true);
		model.update(1, { physics: false, ik: false });
		expect(bone.position.x).toBeCloseTo(10);
		applyPmxAnimationClip(model, second, true);
		expect(bone.position.x).toBeCloseTo(14);
	});

	it('rejects files that do not contain a VPD pose', async () => {
		await expect(loadPmxAnimationClip(createLoader(), {
			name: 'invalid-pose',
			type: 'vpd',
			url: 'data:application/octet-stream,invalid'
		})).rejects.toThrow();
	});
});
