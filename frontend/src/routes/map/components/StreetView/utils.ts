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

/**
 * パノラマ写真の回転角度を設定する
 * @param camera THREE.PerspectiveCamera | THREE.OrthographicCamera
 * @param degrees 0〜360度の Y 軸回転角度
 */
export const updateAngle = async (
	id: string,
	{
		x,
		y,
		z
	}: {
		x: number;
		y: number;
		z: number;
	}
) => {
	const response = await fetch('http://127.0.0.1:8000/update_angle', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			id,
			angleX: x,
			angleY: y,
			angleZ: z
		})
	});

	if (!response.ok) {
		console.error('Failed to update angles:', response.status);
		return;
	}

	const data = await response.json();
	console.log('Updated data:', data);
};

/** 度（°）をラジアン（rad）に変換する関数 */
export const degreesToRadians = (degrees: number) => {
	return degrees * (Math.PI / 180);
};
