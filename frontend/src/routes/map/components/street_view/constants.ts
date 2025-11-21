import { checkPc } from '$routes/map/utils/ui';
import * as THREE from 'three';
import { Tween } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

export const PANORAMA_IMAGE_URL = 'https://forestacdev.github.io/360photo-data-webp/webp/';
export const IN_CAMERA_FOV = checkPc() ? 75 : 100; // 初期FOV
export const OUT_CAMERA_FOV = 150;
export const MIN_CAMERA_FOV = 20; // 最小FOV
export const MAX_CAMERA_FOV = 100; // 最大FOV
export const IN_CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
export const OUT_CAMERA_POSITION = new THREE.Vector3(0, 10, 0);

export const SCENE_CENTER_COORDS: [number, number] = [-12043, -34145]; // シーンの中心にする地理座標[x, y] (EPSG:6677)
