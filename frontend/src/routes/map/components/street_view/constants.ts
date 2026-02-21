import { checkPc } from '$routes/map/utils/ui';
import { PUBLIC_PANORAMA_PATH } from '$env/static/public';
import * as THREE from 'three';

export const PANORAMA_IMAGE_URL = PUBLIC_PANORAMA_PATH + '/';

export const IN_CAMERA_FOV = checkPc() ? 75 : 100; // 初期FOV
export const OUT_CAMERA_FOV = 150;
export const MIN_CAMERA_FOV = 20; // 最小FOV
export const MAX_CAMERA_FOV = 100; // 最大FOV
export const IN_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
export const OUT_CAMERA_POSITION = new THREE.Vector3(0, 10, 0);

export const SCENE_CENTER_COORDS: [number, number] = [-22135.73, -49828.66]; // シーンの中心にする地理座標[x（N）, y（E）] (EPSG:6675)
