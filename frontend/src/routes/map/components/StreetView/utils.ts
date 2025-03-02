import * as THREE from 'three';

/**
 * カメラの Y 軸回転角度を取得し、0〜360度の範囲に正規化する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @returns 0〜360度の Y 軸回転角度
 */
export const getCameraYRotation = (camera: THREE.Camera): number => {
	let degrees = -THREE.MathUtils.radToDeg(camera.rotation.y); // ラジアン→度に変換
	return (degrees + 360) % 360; // 0〜360度の範囲に調整
};

export const updateAngle = async (
	id: string,
	geometryBearing: { x: number; y: number; z: number }
) => {
	// const test = await fetch('/360', {
	// 	method: 'GET'
	// });

	// console.log(test);
	const response = await fetch('/360', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ id, geometryBearing })
	});
	const result = await response.json();
	if (result.success) {
		console.log('Angle updated successfully', result.updatedData);
	} else {
		console.error('Failed to update angle', result.error);
	}
};

/** 度（°）をラジアン（rad）に変換する関数 */
export const degreesToRadians = (degrees: number) => {
	return degrees * (Math.PI / 180);
};
