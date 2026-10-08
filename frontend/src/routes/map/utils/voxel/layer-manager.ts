import {
	readGeoZarrVolumeRegion,
	readGeoZarrVoxelRegion,
	registerGeoZarr
} from '$routes/map/protocol/geozarr';
import type { GpmLayout } from '$routes/map/protocol/geozarr/gpm';
import type { VoxelRegionData } from '$routes/map/protocol/geozarr/voxels';
import { formatGeoZarr } from '$routes/map/utils/formats/geozarr/definition';
import type { CustomLayerInterface, Map as MapLibreMap } from '$routes/map/utils/maplibre';
import { ColorMapManager } from '$routes/map/utils/style/color-mapping';
import {
	BoxGeometry,
	Camera,
	Color,
	Float32BufferAttribute,
	InstancedMesh,
	Matrix4,
	MeshBasicMaterial,
	Scene,
	SRGBColorSpace,
	Vector2,
	Vector4,
	WebGLRenderer
} from 'three';
import type { VoxelSpec } from './spec';
import {
	createVolumeRegion,
	releaseVolumeRegion,
	updateVolumeCamera,
	updateVolumeRegion,
	type VolumeRegion
} from './volume-mesh';

import { GEOZARR_VOXEL_LAYER_ID } from './constants';
export { GEOZARR_VOXEL_LAYER_ID } from './constants';
type VoxelRegion = {
	kind: 'voxel';
	bytes: number;
	overview: boolean;
	data: VoxelRegionData;
	mesh: InstancedMesh;
	material: MeshBasicMaterial;
};
type Region = VoxelRegion | VolumeRegion;
type Runtime = {
	spec: VoxelSpec;
	layout?: GpmLayout;
	regions: Map<number, Region>;
	jobs: Map<number, AbortController>;
	desired: Map<number, boolean>;
	failed: Set<string>;
	abort: AbortController;
};
const palette = new ColorMapManager();
const worldX = (lon: number) => (lon + 180) / 360;

/** 地域単位のInstancing。データ取得・描画実体・GPU解放はentryの外に置く。 */
export class GeoZarrVoxelLayerManager {
	private specs: VoxelSpec[] = [];
	private runtimes = new Map<string, Runtime>();
	private map: MapLibreMap | null = null;
	private renderer: WebGLRenderer | null = null;
	private geometry = (() => {
		const geometry = new BoxGeometry(1, 1, 1), normals = geometry.getAttribute('normal');
		const shades = new Float32Array(normals.count * 3);
		for (let i = 0; i < normals.count; i++) {
			const shade = normals.getZ(i) > 0
				? 1
				: normals.getZ(i) < 0
				? 0.65
				: normals.getX(i) !== 0
				? 0.78
				: 0.9;
			shades.fill(shade, i * 3, i * 3 + 3);
		}
		geometry.setAttribute('color', new Float32BufferAttribute(shades, 3));
		return geometry;
	})();
	private camera = new Camera();
	private scene = new Scene();
	private activeJobs = 0;
	private max3DTextureSize = 0;
	private linear3DFiltering = false;
	private uniforms = {
		voxelAnchor: { value: new Vector2() },
		voxelFlat: { value: new Matrix4() },
		voxelGlobe: { value: new Matrix4() },
		voxelTransition: { value: 0 },
		voxelClip: { value: new Vector4() }
	};

	setSpecs = (specs: VoxelSpec[]) => {
		this.specs = specs;
		const ids = new Set(specs.map(s => s.id));
		for (const [id, runtime] of this.runtimes) {
			const next = specs.find(s => s.id === id);
			if (
				!ids.has(id) || next?.url !== runtime.spec.url
				|| next?.arrayPath !== runtime.spec.arrayPath
				|| next?.type !== runtime.spec.type
			) {
				this.releaseRuntime(runtime);
				this.runtimes.delete(id);
			}
		}
		if (!this.map) return;
		for (const spec of specs) {
			let runtime = this.runtimes.get(spec.id);
			if (!runtime) {
				runtime = {
					spec,
					regions: new Map(),
					jobs: new Map(),
					desired: new Map(),
					failed: new Set(),
					abort: new AbortController()
				};
				this.runtimes.set(spec.id, runtime);
				void this.initialize(runtime);
			} else if (JSON.stringify(runtime.spec) !== JSON.stringify(spec)) {
				runtime.spec = spec;
				for (const region of runtime.regions.values()) {
					if (region.kind === 'volume') updateVolumeRegion(region, spec);
					else this.updateMesh(region, spec);
				}
			}
		}
		this.refresh();
	};
	private initialize = async (runtime: Runtime) => {
		try {
			const s = runtime.spec;
			const meta = await registerGeoZarr({
				entryId: s.id,
				url: s.url,
				arrayPath: s.arrayPath
			});
			if (runtime.abort.signal.aborted) return;
			if (!meta.gpm?.height) {
				throw new Error('このZarrにはボクセル表示用の地域・高度情報がありません');
			}
			runtime.layout = meta.gpm;
			this.refresh();
		} catch (error) {
			if (!runtime.abort.signal.aborted) this.report(error);
		}
	};
	private report = (error: unknown) =>
		this.map?.fire('error', {
			error: error instanceof Error ? error : new Error(String(error))
		});
	private refresh = () => {
		if (!this.map) return;
		const bounds = this.map.getBounds(), center = this.map.getCenter();
		for (const runtime of this.runtimes.values()) {
			if (!runtime.layout) continue;
			const layout = runtime.layout;
			const candidates = runtime.spec.visible && runtime.spec.opacity > 0
				? layout.regions.filter(({ bounds: b }) => {
					const middle = (b.west + b.east) / 2,
						shift = Math.round((center.lng - middle) / 360) * 360;
					return b.east + shift >= bounds.getWest() && b.west + shift <= bounds.getEast()
						&& b.north >= bounds.getSouth() && b.south <= bounds.getNorth();
				}).sort((a, b) => {
					const distance = (r: typeof a) =>
						Math.abs(
							(((r.bounds.west + r.bounds.east) / 2 - center.lng + 540) % 360) - 180
						) + Math.abs((r.bounds.south + r.bounds.north) / 2 - center.lat);
					return distance(a) - distance(b);
				})
				: [];
			runtime.desired = new Map(
				candidates.map((
					r,
					i
				) => [
					r.index,
					!!layout.overviewPath
					&& (this.map!.getZoom() < 5 || i >= formatGeoZarr.limits.maxDetailVoxelRegions)
				])
			);
			for (const [index, controller] of runtime.jobs) {
				if (!runtime.desired.has(index)) controller.abort();
			}
			for (const [index, region] of runtime.regions) {
				if (!runtime.desired.has(index)) {
					this.releaseRegion(region);
					runtime.regions.delete(index);
				}
			}
		}
		this.pump();
		this.map.triggerRepaint();
	};
	private pump = () => {
		if (!this.map) return;
		for (const runtime of this.runtimes.values()) {
			for (const [index, overview] of runtime.desired) {
				if (this.activeJobs >= formatGeoZarr.limits.maxConcurrentVoxelReads) {
					return;
				}
				if (
					runtime.regions.get(index)?.overview === overview || runtime.jobs.has(index)
					|| runtime.failed.has(`${index}/${overview}`)
				) continue;
				const controller = new AbortController();
				runtime.jobs.set(index, controller);
				this.activeJobs++;
				void this.load(runtime, index, overview, controller);
			}
		}
	};
	private load = async (
		runtime: Runtime,
		index: number,
		overview: boolean,
		controller: AbortController
	) => {
		try {
			const s = runtime.spec;
			if (s.type === 'volume') {
				const data = await readGeoZarrVolumeRegion({
					entryId: s.id,
					url: s.url,
					arrayPath: s.arrayPath,
					region: index,
					overview
				}, controller.signal);
				if (
					runtime.abort.signal.aborted || controller.signal.aborted
					|| runtime.desired.get(index) !== overview
				) return;
				this.checkMemory(data.values.byteLength * 2 + 64 * 1024, runtime, index);
				const region = createVolumeRegion(
					data,
					overview,
					this.uniforms,
					this.linear3DFiltering,
					this.max3DTextureSize
				);
				updateVolumeRegion(region, runtime.spec);
				const previous = runtime.regions.get(index);
				if (previous) this.releaseRegion(previous);
				runtime.regions.set(index, region);
				this.map?.triggerRepaint();
				return;
			}
			const data = await readGeoZarrVoxelRegion({
				entryId: s.id,
				url: s.url,
				arrayPath: s.arrayPath,
				region: index,
				overview
			}, controller.signal);
			if (
				runtime.abort.signal.aborted || controller.signal.aborted
				|| runtime.desired.get(index) !== overview
			) return;
			const bytes = data.cells.length / 7 * 104;
			this.checkMemory(bytes, runtime, index);
			const material = new MeshBasicMaterial({ vertexColors: true, toneMapped: false });
			material.onBeforeCompile = shader => {
				Object.assign(shader.uniforms, this.uniforms);
				shader.vertexShader =
					`uniform vec2 voxelAnchor; uniform mat4 voxelFlat; uniform mat4 voxelGlobe; uniform float voxelTransition; uniform vec4 voxelClip; varying float voxelHorizon;\n${shader.vertexShader}`
						.replace(
							'#include <project_vertex>',
							`
					vec4 local = instanceMatrix * vec4(transformed, 1.0);
					local = modelMatrix * local;
					vec2 merc = local.xy + voxelAnchor;
					float lon = merc.x * 6.28318530718 - 3.14159265359;
					float lat = 2.0 * atan(exp(3.14159265359 * (1.0 - 2.0 * merc.y))) - 1.57079632679;
					vec3 sphere = vec3(sin(lon)*cos(lat), sin(lat), cos(lon)*cos(lat)) * (1.0 + local.z*6.28318530718*cos(lat));
					voxelHorizon = voxelTransition > 0.99 ? dot(vec4(sphere,1.0), voxelClip) : 1.0;
					vec4 mvPosition = local;
					gl_Position = mix(voxelFlat * local, voxelGlobe * vec4(sphere,1.0), voxelTransition);
				`
						);
				shader.fragmentShader = `varying float voxelHorizon;\n${shader.fragmentShader}`
					.replace('void main() {', 'void main() { if (voxelHorizon < 0.0) discard;');
			};
			material.customProgramCacheKey = () => 'morivis-geozarr-voxel-v1';
			const mesh = new InstancedMesh(this.geometry, material, data.cells.length / 7);
			mesh.frustumCulled = false;
			const region: VoxelRegion = { kind: 'voxel', bytes, overview, data, mesh, material };
			this.updateMesh(region, runtime.spec);
			const previous = runtime.regions.get(index);
			if (previous) this.releaseRegion(previous);
			runtime.regions.set(index, region);
			this.map?.triggerRepaint();
		} catch (error) {
			if (!runtime.abort.signal.aborted && !controller.signal.aborted) {
				runtime.failed.add(`${index}/${overview}`);
				this.report(error);
			}
		} finally {
			if (runtime.jobs.get(index) === controller) runtime.jobs.delete(index);
			this.activeJobs--;
			this.pump();
		}
	};
	private checkMemory = (bytes: number, runtime: Runtime, index: number) => {
		let total = bytes - (runtime.regions.get(index)?.bytes ?? 0);
		for (const item of this.runtimes.values()) {
			for (const region of item.regions.values()) total += region.bytes;
		}
		if (total > formatGeoZarr.limits.maxExpandedBytes) {
			throw new Error(
				'Zarrの3D描画のメモリ上限に達しました。表示範囲を狭めるかoverview配列を選んでください'
			);
		}
	};
	private updateMesh = ({ mesh, material, data }: VoxelRegion, spec: VoxelSpec) => {
		const matrix = new Matrix4(),
			color = new Color(),
			colors = palette.createColorArray(spec.colorMap);
		let count = 0;
		for (let i = 0; i < data.cells.length; i += 7) {
			const c = data.cells, value = c[i + 6];
			if (value < spec.threshold) continue;
			matrix.makeScale(c[i + 3], c[i + 4], c[i + 5]).setPosition(c[i], c[i + 1], c[i + 2]);
			mesh.setMatrixAt(count, matrix);
			const at = Math.round(
				Math.max(
					0,
					Math.min(1, (value - spec.min) / Math.max(1e-9, spec.max - spec.min))
				) * 255
			) * 3;
			mesh.setColorAt(
				count++,
				color.setRGB(
					colors[at] / 255,
					colors[at + 1] / 255,
					colors[at + 2] / 255,
					SRGBColorSpace
				)
			);
		}
		mesh.count = count;
		mesh.scale.z = spec.heightScale;
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		material.opacity = spec.opacity;
		material.transparent = spec.opacity < 1;
		material.depthWrite = true;
		material.needsUpdate = true;
	};
	createLayer = (): CustomLayerInterface => ({
		id: GEOZARR_VOXEL_LAYER_ID,
		type: 'custom',
		renderingMode: '3d',
		onAdd: (map, gl) => {
			this.map = map;
			this.max3DTextureSize = gl.getParameter(
				(gl as WebGL2RenderingContext).MAX_3D_TEXTURE_SIZE
			);
			this.linear3DFiltering = !!gl.getExtension('OES_texture_float_linear');
			this.renderer = new WebGLRenderer({ canvas: map.getCanvas(), context: gl });
			this.renderer.autoClear = false;
			map.on('moveend', this.refresh);
			this.setSpecs(this.specs);
		},
		render: (_gl, args) => {
			if (!this.renderer || !this.map) return;
			const p = args.defaultProjectionData;
			this.uniforms.voxelGlobe.value.fromArray(p.mainMatrix);
			this.uniforms.voxelTransition.value = p.projectionTransition;
			this.uniforms.voxelClip.value.fromArray(p.clippingPlane);
			for (const runtime of this.runtimes.values()) {
				if (!runtime.spec.visible || runtime.spec.opacity <= 0) continue;
				for (const region of runtime.regions.values()) {
					const [x, y] = region.data.anchor;
					const wrap = Math.round(worldX(this.map.getCenter().lng) - x);
					this.uniforms.voxelAnchor.value.set(x + wrap, y);
					this.uniforms.voxelFlat.value.fromArray(
						p.projectionTransition > 0 ? p.fallbackMatrix : p.mainMatrix
					).multiply(new Matrix4().makeTranslation(x + wrap, y, 0));
					if (region.kind === 'volume') updateVolumeCamera(region, this.uniforms);
					this.scene.add(region.mesh);
					this.renderer.resetState();
					this.renderer.render(this.scene, this.camera);
					this.scene.remove(region.mesh);
				}
			}
			this.renderer.resetState();
		},
		onRemove: () => this.releaseRenderer()
	});
	private releaseRegion = (region: Region) => {
		if (region.kind === 'volume') {
			releaseVolumeRegion(region);
			return;
		}
		region.mesh.dispose();
		region.material.dispose();
	};
	private releaseRuntime = (runtime: Runtime) => {
		runtime.abort.abort();
		for (const job of runtime.jobs.values()) job.abort();
		for (const region of runtime.regions.values()) this.releaseRegion(region);
		runtime.regions.clear();
		runtime.desired.clear();
	};
	private releaseRenderer = () => {
		this.map?.off('moveend', this.refresh);
		for (const runtime of this.runtimes.values()) this.releaseRuntime(runtime);
		this.runtimes.clear();
		this.renderer?.dispose();
		this.renderer = null;
		this.map = null;
	};
	dispose = () => {
		this.releaseRenderer();
		this.specs = [];
		this.geometry.dispose();
	};
}
