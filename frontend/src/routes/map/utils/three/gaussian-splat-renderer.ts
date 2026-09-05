import type { GaussianSplatStyle } from '$routes/map/data/types/model';
import type { GaussianSplatData } from '$routes/map/utils/formats/gaussian-splat';
import * as THREE from 'three';

const GAUSSIAN_SPLAT_MATERIAL_KEY = 'morivisGaussianSplatMaterial';

interface GaussianSplatUniforms {
	uOpacity: { value: number; };
	uSplatScale: { value: number; };
	uViewportHeight: { value: number; };
}

const getMaterial = (object: THREE.Object3D) => {
	if (!(object as THREE.Points).isPoints) return null;
	const material = (object as THREE.Points).material;
	return material instanceof THREE.ShaderMaterial && material.userData[GAUSSIAN_SPLAT_MATERIAL_KEY]
		? material
		: null;
};

const updateMaterial = (
	material: THREE.ShaderMaterial,
	style: GaussianSplatStyle,
	viewportHeight?: number
) => {
	const uniforms = material.uniforms as unknown as GaussianSplatUniforms;
	uniforms.uOpacity.value = style.opacity;
	uniforms.uSplatScale.value = style.splatScale;
	if (viewportHeight != null) uniforms.uViewportHeight.value = viewportHeight;
};

export const createGaussianSplatObject = (
	data: GaussianSplatData,
	style: GaussianSplatStyle
) => {
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
	geometry.setAttribute('splatColor', new THREE.BufferAttribute(data.colors, 3, true));
	geometry.setAttribute('splatOpacity', new THREE.BufferAttribute(data.opacities, 1));
	geometry.setAttribute('splatScale', new THREE.BufferAttribute(data.scales, 1));
	geometry.computeBoundingSphere();

	const material = new THREE.ShaderMaterial({
		uniforms: {
			uOpacity: { value: style.opacity },
			uSplatScale: { value: style.splatScale },
			uViewportHeight: { value: 1 }
		},
		vertexShader: `
			attribute vec3 splatColor;
			attribute float splatOpacity;
			attribute float splatScale;
			uniform float uOpacity;
			uniform float uSplatScale;
			uniform float uViewportHeight;
			varying vec3 vColor;
			varying float vOpacity;
			void main() {
				vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				gl_Position = clipPosition;
				float pointSize = splatScale * uSplatScale * projectionMatrix[1][1] * uViewportHeight / max(clipPosition.w, 0.00001);
				gl_PointSize = clamp(pointSize * 2.0, 1.0, 128.0);
				vColor = splatColor;
				vOpacity = splatOpacity * uOpacity;
			}
		`,
		fragmentShader: `
			varying vec3 vColor;
			varying float vOpacity;
			void main() {
				vec2 centered = gl_PointCoord - vec2(0.5);
				float alpha = vOpacity * exp(-dot(centered, centered) * 8.0);
				if (alpha < 0.003) discard;
				gl_FragColor = vec4(vColor, alpha);
			}
		`,
		transparent: true,
		depthWrite: false,
		depthTest: true,
		blending: THREE.NormalBlending,
		toneMapped: false
	});
	material.userData[GAUSSIAN_SPLAT_MATERIAL_KEY] = true;

	const points = new THREE.Points(geometry, material);
	// 3DGS PLYは通常Y-upなので、最下点を配置高さへ揃える。
	points.position.y = -data.bounds[1];
	points.userData.gaussianSplatBounds = data.bounds;
	return points;
};

export const applyGaussianSplatStyle = (
	object: THREE.Object3D,
	style: GaussianSplatStyle,
	viewportHeight?: number
) => {
	object.visible = style.visible ?? true;
	object.traverse((child) => {
		const material = getMaterial(child);
		if (material) updateMaterial(material, style, viewportHeight);
	});
};
