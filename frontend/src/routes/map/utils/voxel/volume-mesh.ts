import type { VolumeRegionData } from '$routes/map/protocol/geozarr/volume';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import {
	BackSide,
	BoxGeometry,
	Data3DTexture,
	DataTexture,
	FloatType,
	GLSL3,
	LinearFilter,
	Matrix4,
	Mesh,
	NearestFilter,
	RawShaderMaterial,
	RedFormat,
	RGBAFormat,
	Vector2,
	Vector3,
	Vector4
} from 'three';
import type { VoxelSpec } from './spec';

type ProjectionUniforms = {
	voxelAnchor: { value: Vector2; };
	voxelFlat: { value: Matrix4; };
	voxelGlobe: { value: Matrix4; };
	voxelTransition: { value: number; };
	voxelClip: { value: Vector4; };
};
const projection = `
uniform vec2 voxelAnchor;
uniform mat4 voxelFlat, voxelGlobe;
uniform float voxelTransition;
uniform vec4 voxelClip;
vec3 spherePosition(vec3 local) {
	vec2 merc = local.xy + voxelAnchor;
	float lon = merc.x * 6.28318530718 - 3.14159265359;
	float lat = 2.0 * atan(exp(3.14159265359 * (1.0 - 2.0 * merc.y))) - 1.57079632679;
	return vec3(sin(lon)*cos(lat), sin(lat), cos(lon)*cos(lat)) * (1.0 + local.z*6.28318530718*cos(lat));
}
vec4 projectPosition(vec3 local) {
	return mix(voxelFlat * vec4(local, 1.0), voxelGlobe * vec4(spherePosition(local), 1.0), voxelTransition);
}`;
const vertexShader = `
precision highp float;
in vec3 position;
uniform vec3 boxMin, boxMax;
out vec3 exitPoint;
${projection}
void main() {
	exitPoint = position + 0.5;
	gl_Position = projectPosition(mix(boxMin, boxMax, exitPoint));
}`;
const fragmentShader = `
precision highp float;
precision highp sampler3D;
uniform sampler3D volumeTexture;
uniform sampler2D paletteTexture;
uniform vec3 boxMin, boxMax, rayOrigin;
uniform vec4 geoBounds;
uniform vec2 heights, valueRange;
uniform float threshold, density, opacity, heightScale;
in vec3 exitPoint;
out vec4 outColor;
${projection}
void main() {
	vec3 direction = normalize(exitPoint - rayOrigin);
	vec3 inv = 1.0 / mix(vec3(0.000001), direction, greaterThan(abs(direction), vec3(0.000001)));
	vec3 a = -rayOrigin * inv, b = (1.0 - rayOrigin) * inv;
	vec3 nearBounds = min(a,b), farBounds = max(a,b);
	float start = max(0.0, max(nearBounds.x, max(nearBounds.y, nearBounds.z)));
	float end = min(farBounds.x, min(farBounds.y, farBounds.z));
	if (end <= start) discard;
	float stepSize = (end-start) / 256.0;
	vec4 sum = vec4(0.0);
	float firstDepth = 1.0;
	for (int i=0; i<256; i++) {
		vec3 unit = rayOrigin + direction * (start + (float(i)+0.5)*stepSize);
		vec3 local = mix(boxMin, boxMax, unit);
		if (voxelTransition > 0.99 && dot(vec4(spherePosition(local),1.0), voxelClip) < 0.0) continue;
		float latitude = 2.0*atan(exp(3.14159265359*(1.0-2.0*(local.y+voxelAnchor.y)))) - 1.57079632679;
		float meters = local.z * 40030228.88407185 * cos(latitude) / heightScale;
		vec3 uv = vec3(unit.x, (degrees(latitude)-geoBounds.y)/(geoBounds.w-geoBounds.y), (meters-heights.x)/(heights.y-heights.x));
		if (any(lessThan(uv,vec3(0.0))) || any(greaterThan(uv,vec3(1.0)))) continue;
		float value = texture(volumeTexture, uv).r;
		if (value <= 0.0 || value < threshold) continue;
		float normalized = clamp((value-valueRange.x)/max(0.000001,valueRange.y-valueRange.x),0.0,1.0);
		float alpha = 1.0-exp(-density*stepSize*4.0*max(normalized,0.05));
		if (sum.a == 0.0) {
			vec4 clip = projectPosition(local);
			firstDepth = clamp(clip.z/clip.w*0.5+0.5,0.0,1.0);
		}
		sum.rgb += (1.0-sum.a)*alpha*texture(paletteTexture,vec2(normalized,0.5)).rgb;
		sum.a += (1.0-sum.a)*alpha;
		if (sum.a > 0.98) break;
	}
	if (sum.a <= 0.0) discard;
	// MapLibre reserves part of the depth range for 2D layers.
	gl_FragDepth = gl_DepthRange.near + firstDepth * gl_DepthRange.diff;
	outColor = vec4(sum.rgb/sum.a, sum.a*opacity);
}`;
const palette = new ColorMapManager();
const mercatorY = (lat: number) => (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2;

export type VolumeRegion = {
	kind: 'volume';
	overview: boolean;
	data: VolumeRegionData;
	mesh: Mesh<BoxGeometry, RawShaderMaterial>;
	material: RawShaderMaterial;
	texture: Data3DTexture;
	colors: DataTexture;
	bytes: number;
};
export const createVolumeRegion = (
	data: VolumeRegionData,
	overview: boolean,
	projectionUniforms: ProjectionUniforms,
	linearFiltering: boolean,
	maxTextureSize: number
): VolumeRegion => {
	if (data.dimensions.some(size => size > maxTextureSize)) {
		throw new Error(
			'ボリュームの寸法がGPUの3Dテクスチャ上限を超えています。overview配列を選んでください'
		);
	}
	const texture = new Data3DTexture(data.values, ...data.dimensions);
	texture.format = RedFormat;
	texture.type = FloatType;
	texture.minFilter = texture.magFilter = linearFiltering ? LinearFilter : NearestFilter;
	texture.needsUpdate = true;
	const colors = new DataTexture(new Uint8Array(256 * 4), 256, 1, RGBAFormat);
	colors.minFilter = colors.magFilter = LinearFilter;
	const material = new RawShaderMaterial({
		glslVersion: GLSL3,
		vertexShader,
		fragmentShader,
		transparent: true,
		depthWrite: false,
		side: BackSide,
		uniforms: {
			...projectionUniforms,
			volumeTexture: { value: texture },
			paletteTexture: { value: colors },
			boxMin: { value: new Vector3() },
			boxMax: { value: new Vector3() },
			rayOrigin: { value: new Vector3() },
			geoBounds: { value: new Vector4(...data.bounds.slice(0, 4)) },
			heights: { value: new Vector2(data.bounds[4], data.bounds[5]) },
			valueRange: { value: new Vector2() },
			threshold: { value: 0 },
			density: { value: 2 },
			opacity: { value: 1 },
			heightScale: { value: 1 }
		}
	});
	// 分割した面を投影し、球面の曲率に追従する。
	const geometry = new BoxGeometry(1, 1, 1, 8, 8, 1);
	const mesh = new Mesh(geometry, material);
	mesh.frustumCulled = false;
	return {
		kind: 'volume',
		overview,
		data,
		mesh,
		material,
		texture,
		colors,
		bytes: data.values.byteLength * 2 + 256 * 4 * 2
			+ geometry.getAttribute('position').count * 32 + (geometry.index?.array.byteLength ?? 0)
	};
};

export const updateVolumeRegion = (region: VolumeRegion, spec: VoxelSpec) => {
	const { data, material, colors } = region, u = material.uniforms;
	const [west, south, east, north, minHeight, maxHeight] = data.bounds;
	const scale = (lat: number) => 1 / (40030228.88407185 * Math.cos(lat * Math.PI / 180));
	const scales = [scale(south), scale(north), scale(Math.max(south, Math.min(north, 0)))];
	u.boxMin.value.set(
		(west + 180) / 360 - data.anchor[0],
		mercatorY(north) - data.anchor[1],
		minHeight * Math.min(...scales) * spec.heightScale
	);
	u.boxMax.value.set(
		(east + 180) / 360 - data.anchor[0],
		mercatorY(south) - data.anchor[1],
		maxHeight * Math.max(...scales) * spec.heightScale
	);
	u.heightScale.value = spec.heightScale;
	u.threshold.value = spec.threshold;
	u.density.value = spec.density;
	u.opacity.value = spec.opacity;
	u.valueRange.value.set(spec.min, spec.max);
	const rgb = palette.createColorArray(spec.colorMap), rgba = colors.image.data as Uint8Array;
	for (let i = 0; i < 256; i++) {
		rgba[i * 4] = rgb[i * 3];
		rgba[i * 4 + 1] = rgb[i * 3 + 1];
		rgba[i * 4 + 2] = rgb[i * 3 + 2];
		rgba[i * 4 + 3] = 255;
	}
	colors.needsUpdate = true;
};

export const updateVolumeCamera = (region: VolumeRegion, uniforms: ProjectionUniforms) => {
	// 透視投影のカメラ原点はclip空間の(0,0,1,0)から逆変換できる。
	const camera = new Vector4(0, 0, 1, 0).applyMatrix4(uniforms.voxelFlat.value.clone().invert());
	camera.multiplyScalar(1 / camera.w);
	const position = new Vector3(camera.x, camera.y, camera.z);
	if (uniforms.voxelTransition.value > 0) {
		const globe = new Vector4(0, 0, 1, 0).applyMatrix4(
			uniforms.voxelGlobe.value.clone().invert()
		);
		globe.multiplyScalar(1 / globe.w);
		const radius = Math.hypot(globe.x, globe.y, globe.z);
		const lat = Math.asin(Math.max(-1, Math.min(1, globe.y / radius)));
		let x = (Math.atan2(globe.x, globe.z) + Math.PI) / (2 * Math.PI);
		x += Math.round(uniforms.voxelAnchor.value.x - x);
		const projected = new Vector3(
			x - uniforms.voxelAnchor.value.x,
			mercatorY(Math.max(-85, Math.min(85, lat * 180 / Math.PI)))
				- uniforms.voxelAnchor.value.y,
			(radius - 1) / (2 * Math.PI * Math.cos(lat))
		);
		position.lerp(projected, uniforms.voxelTransition.value);
	}
	const u = region.material.uniforms;
	u.rayOrigin.value.copy(position).sub(u.boxMin.value).divide(
		new Vector3().subVectors(u.boxMax.value, u.boxMin.value)
	);
};

export const releaseVolumeRegion = (region: VolumeRegion) => {
	region.texture.dispose();
	region.colors.dispose();
	region.mesh.geometry.dispose();
	region.material.dispose();
};
