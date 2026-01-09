import * as THREE from 'three';
import fs from './shaders/fragment.glsl?raw';
// import fs from '../shaders/fragment_debug.glsl?raw';
import vs from './shaders/vertex.glsl?raw';

export interface Uniforms {
	skybox: { value: THREE.CubeTexture | null };
	gamma: { value: number }; // ガンマ補正用
	exposure: { value: number }; // 明度調整用
	inputGamma: { value: number }; // 入力ガンマ補正
	outputGamma: { value: number }; // 出力ガンマ補正
	brightness: { value: number }; // 明るさ調整用
	contrast: { value: number }; // コントラスト調整用
	rotationAnglesA: { value: THREE.Vector3 };
	rotationAnglesB: { value: THREE.Vector3 };
	rotationAnglesC: { value: THREE.Vector3 };
	textureA: { value: THREE.Texture | null };
	textureB: { value: THREE.Texture | null };
	textureC: { value: THREE.Texture | null };
	fadeStartTime: { value: number };
	fadeSpeed: { value: number };
	time: { value: number };
	fromTarget: { value: number }; // フェード元 0=A, 1=B, 2=C
	toTarget: { value: number }; // フェード先 0=A, 1=B, 2=C
}

export const uniforms: Uniforms = {
	skybox: { value: null },
	exposure: { value: 0.6 }, // 明度調整用
	gamma: { value: 2.2 }, // ガンマ補正用
	inputGamma: { value: 2.2 },
	outputGamma: { value: 2.2 },
	brightness: { value: 1.5 },
	contrast: { value: 0.5 },
	rotationAnglesA: { value: new THREE.Vector3() },
	rotationAnglesB: { value: new THREE.Vector3() },
	rotationAnglesC: { value: new THREE.Vector3() },
	textureA: { value: null },
	textureB: { value: null },
	textureC: { value: null },
	fadeStartTime: { value: 0.0 },
	fadeSpeed: { value: 3.0 },
	time: { value: 0.0 },
	fromTarget: { value: 0 }, // フェード元
	toTarget: { value: 0 } // フェード先
};

// 自動フェード用シェーダー
export const fadeShaderMaterial = new THREE.ShaderMaterial({
	// visible: false,
	side: THREE.BackSide,
	uniforms: uniforms as any, // 型の互換性のためにanyを使用
	fragmentShader: fs,
	vertexShader: vs,
	transparent: false, // 必要に応じてtrueに
	alphaTest: 0,
	premultipliedAlpha: false // これも重要
});

// デバッグ用ボックスマテリアル
export const debugBoxMaterial = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	wireframe: true,
	side: THREE.DoubleSide,
	opacity: 1.0,
	visible: false
});
