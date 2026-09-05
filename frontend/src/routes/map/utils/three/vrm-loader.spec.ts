import { describe, expect, it } from 'vitest';

import { getVrmFromGltf, rotateVrm0IfNeeded } from './vrm-loader';

describe('getVrmFromGltf', () => {
	it('VRMローダーが登録したモデル実体を取得する', () => {
		const vrm = { scene: {} };

		expect(getVrmFromGltf({ userData: { vrm } } as never)).toBe(vrm);
	});

	it('VRM拡張がないGLTFはエラーにする', () => {
		expect(() => getVrmFromGltf({ userData: {} } as never)).toThrow(
			'VRMとして認識できませんでした'
		);
	});

	it('VRM 0.xだけ正面を180度回転する', async () => {
		const vrm = {
			meta: { metaVersion: '0' },
			scene: { rotation: { y: 0 } }
		};

		await rotateVrm0IfNeeded(vrm as never);

		expect(vrm.scene.rotation.y).toBe(Math.PI);
	});

	it('VRM 1.0の正面方向は維持する', async () => {
		const vrm = {
			meta: { metaVersion: '1' },
			scene: { rotation: { y: 0 } }
		};

		await rotateVrm0IfNeeded(vrm as never);

		expect(vrm.scene.rotation.y).toBe(0);
	});
});
