<script lang="ts">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

	import DropContainer from '$routes/map/components/DropContainer.svelte';
	import type { MeshFormatType } from '$routes/map/data/types/model';
	import { getUploadedModelObject } from '$routes/map/utils/three/model-bounds';

	type CandidateModelFile = {
		id: string;
		file: File;
		format: MeshFormatType;
		path: string;
	};

	type LoadedModelSummary = {
		path: string;
		format: MeshFormatType;
		nodeCount: number;
		meshCount: number;
		materialCount: number;
		vertexCount: number;
		triangleCount: number;
		animationNames: string[];
		unitScaleFactor: number | null;
		bbox: {
			min: [number, number, number];
			max: [number, number, number];
			center: [number, number, number];
			size: [number, number, number];
		};
	};

	type PathLikeFile = File & {
		morivisRelativePath?: string;
		webkitRelativePath?: string;
	};

	const MODEL_FILE_ACCEPT =
		'.glb,.gltf,.vrm,.obj,.3ds,.dae,.3dm,.fbx,.drc,.3mf,.amf,.ifc,.mtl,.bin,.png,.jpg,.jpeg,.bmp,.tga,.gif,.webp';

	const FORMAT_EXTENSIONS: Array<{ format: MeshFormatType; extensions: string[] }> = [
		{ format: 'gltf', extensions: ['.glb', '.gltf'] },
		{ format: 'vrm', extensions: ['.vrm'] },
		{ format: 'obj', extensions: ['.obj'] },
		{ format: '3ds', extensions: ['.3ds'] },
		{ format: 'dae', extensions: ['.dae'] },
		{ format: '3dm', extensions: ['.3dm'] },
		{ format: 'fbx', extensions: ['.fbx'] },
		{ format: 'drc', extensions: ['.drc'] },
		{ format: '3mf', extensions: ['.3mf'] },
		{ format: 'amf', extensions: ['.amf'] },
		{ format: 'ifc', extensions: ['.ifc'] }
	];

	let viewport = $state<HTMLDivElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let selectedFiles = $state.raw<File[]>([]);
	let selectedModelId = $state<string | null>(null);
	let normalizeToLocalOrigin = $state(false);
	let isLoading = $state(false);
	let isDragOver = $state(false);
	let loadError = $state<string | null>(null);
	let loadLog = $state.raw<string[]>([]);
	let loadedSummary = $state.raw<LoadedModelSummary | null>(null);
	let loadedObject = $state.raw<THREE.Object3D | null>(null);

	let renderer: THREE.WebGLRenderer | null = null;
	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let controls: OrbitControls | null = null;
	let activeSceneObject: THREE.Object3D | null = null;
	let animationFrameId: number | null = null;
	let activeBlobUrls: string[] = [];

	const candidateFiles = $derived.by(() => {
		const nextCandidates: CandidateModelFile[] = [];
		selectedFiles.forEach((file) => {
			const path = getPathLikeName(file);
			const format = detectModelFormat(path);
			if (!format) return;

			nextCandidates.push({
				id: createFileId(file),
				file,
				format,
				path
			});
		});
		return nextCandidates;
	});

	const selectedCandidate = $derived.by(() => {
		return candidateFiles.find((candidate) => candidate.id === selectedModelId) ?? null;
	});

	const supportingFileCount = $derived(
		selectedCandidate ? Math.max(selectedFiles.length - 1, 0) : selectedFiles.length
	);

	const getPathLikeName = (file: File) => {
		const pathLikeFile = file as PathLikeFile;
		const relativePath = pathLikeFile.morivisRelativePath || pathLikeFile.webkitRelativePath;
		return relativePath || file.name;
	};

	const createFileId = (file: File) => {
		return `${getPathLikeName(file)}::${file.size}::${file.lastModified}`;
	};

	const detectModelFormat = (path: string): MeshFormatType | null => {
		const lowerPath = path.toLowerCase();
		const match = FORMAT_EXTENSIONS.find(({ extensions }) =>
			extensions.some((extension) => lowerPath.endsWith(extension))
		);
		return match?.format ?? null;
	};

	const pushLog = (message: string) => {
		const timestamp = new Date().toLocaleTimeString('ja-JP', { hour12: false });
		loadLog = [`[${timestamp}] ${message}`, ...loadLog].slice(0, 40);
	};

	const revokeBlobUrls = () => {
		activeBlobUrls.forEach((url) => {
			URL.revokeObjectURL(url);
		});
		activeBlobUrls = [];
	};

	const disposeMaterial = (material: THREE.Material, disposedTextures: Set<THREE.Texture>) => {
		Object.values(material).forEach((value) => {
			if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
				value.dispose();
				disposedTextures.add(value);
			}
		});
		material.dispose();
	};

	const disposeObject3D = (object: THREE.Object3D | null) => {
		if (!object) return;

		const disposedGeometries = new Set<THREE.BufferGeometry>();
		const disposedMaterials = new Set<THREE.Material>();
		const disposedTextures = new Set<THREE.Texture>();

		object.traverse((child) => {
			const mesh = child as THREE.Mesh;
			if (mesh.geometry && !disposedGeometries.has(mesh.geometry)) {
				mesh.geometry.dispose();
				disposedGeometries.add(mesh.geometry);
			}

			const materials =
				'material' in mesh ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];

			materials.forEach((material) => {
				if (!material || disposedMaterials.has(material)) return;
				disposeMaterial(material, disposedTextures);
				disposedMaterials.add(material);
			});
		});
	};

	const clearLoadedObject = () => {
		if (activeSceneObject && scene) {
			scene.remove(activeSceneObject);
		}
		disposeObject3D(loadedObject);
		activeSceneObject = null;
		loadedObject = null;
		loadedSummary = null;
	};

	const buildResourceUrls = (files: File[]) => {
		revokeBlobUrls();

		const resourceUrls: Record<string, string> = {};
		files.forEach((file) => {
			const blobUrl = URL.createObjectURL(file);
			activeBlobUrls.push(blobUrl);

			const relativePath = getPathLikeName(file).replace(/\\/g, '/');
			const normalizedRelativePath = relativePath.toLowerCase();
			const fileName = file.name.toLowerCase();

			resourceUrls[fileName] = blobUrl;
			resourceUrls[normalizedRelativePath] = blobUrl;

			const relativeWithoutRoot = normalizedRelativePath.split('/').slice(1).join('/');
			if (relativeWithoutRoot) {
				resourceUrls[relativeWithoutRoot] = blobUrl;
			}
		});

		return resourceUrls;
	};

	const summarizeObject = (
		object: THREE.Object3D,
		format: MeshFormatType,
		path: string,
		animationNames: string[]
	): LoadedModelSummary => {
		const box = new THREE.Box3().setFromObject(object);
		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());

		let nodeCount = 0;
		let meshCount = 0;
		let vertexCount = 0;
		let triangleCount = 0;
		const materialKeys = new Set<string>();

		object.traverse((child) => {
			nodeCount += 1;

			const mesh = child as THREE.Mesh;
			if (!mesh.isMesh) return;

			meshCount += 1;
			const geometry = mesh.geometry as THREE.BufferGeometry | undefined;
			if (geometry) {
				const position = geometry.getAttribute('position');
				if (position) {
					vertexCount += position.count;
				}

				if (geometry.index) {
					triangleCount += geometry.index.count / 3;
				} else if (position) {
					triangleCount += position.count / 3;
				}
			}

			const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
			materials.forEach((material, index) => {
				if (!material) return;
				materialKeys.add(material.uuid || `${material.type}-${index}`);
			});
		});

		const unitScaleFactor = Number(
			(
				object.userData as {
					unitScaleFactor?: number;
				}
			).unitScaleFactor
		);

		return {
			path,
			format,
			nodeCount,
			meshCount,
			materialCount: materialKeys.size,
			vertexCount,
			triangleCount,
			animationNames,
			unitScaleFactor: Number.isFinite(unitScaleFactor) ? unitScaleFactor : null,
			bbox: {
				min: [box.min.x, box.min.y, box.min.z],
				max: [box.max.x, box.max.y, box.max.z],
				center: [center.x, center.y, center.z],
				size: [size.x, size.y, size.z]
			}
		};
	};

	const fitCameraToObject = (object: THREE.Object3D) => {
		if (!camera || !controls) return;

		const box = new THREE.Box3().setFromObject(object);
		if (box.isEmpty()) return;

		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());
		const maxDimension = Math.max(size.x, size.y, size.z, 1);
		const distance = (maxDimension * 1.4) / Math.tan((camera.fov * Math.PI) / 360);

		camera.near = Math.max(maxDimension / 1000, 0.01);
		camera.far = Math.max(distance * 40, 1000);
		camera.position.set(center.x + distance, center.y + distance * 0.7, center.z + distance);
		camera.lookAt(center);
		camera.updateProjectionMatrix();

		controls.target.copy(center);
		controls.maxDistance = distance * 40;
		controls.update();
	};

	const applySelectedFiles = (files: File[]) => {
		selectedFiles = files;
		loadError = null;
		loadLog = [];
		clearLoadedObject();
		revokeBlobUrls();

		const nextCandidates = files.flatMap((file) => {
			const format = detectModelFormat(getPathLikeName(file));
			if (!format) return [];
			return [createFileId(file)];
		});
		selectedModelId = nextCandidates[0] ?? null;
	};

	const handleFileInput = (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		applySelectedFiles(Array.from(input.files ?? []));
	};

	const loadSelectedModel = async () => {
		if (!selectedCandidate) {
			loadError = '読み込むモデルファイルを選択してください。';
			return;
		}

		isLoading = true;
		loadError = null;
		clearLoadedObject();

		pushLog(`${selectedCandidate.format.toUpperCase()} を読み込みます: ${selectedCandidate.path}`);

		try {
			const resourceFiles = selectedFiles.filter(
				(file) => createFileId(file) !== selectedCandidate.id
			);
			const resourceUrls = buildResourceUrls(resourceFiles);
			const { object, animationNames } = await getUploadedModelObject(
				selectedCandidate.file,
				selectedCandidate.format,
				resourceUrls,
				normalizeToLocalOrigin
			);

			object.updateMatrixWorld(true);
			loadedObject = object;
			loadedSummary = summarizeObject(
				object,
				selectedCandidate.format,
				selectedCandidate.path,
				animationNames
			);
			pushLog(
				`読み込み成功: node=${loadedSummary.nodeCount}, mesh=${loadedSummary.meshCount}, material=${loadedSummary.materialCount}`
			);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			loadError = message;
			pushLog(`読み込み失敗: ${message}`);
		} finally {
			isLoading = false;
		}
	};

	const clearAll = () => {
		selectedFiles = [];
		selectedModelId = null;
		loadError = null;
		loadLog = [];
		clearLoadedObject();
		revokeBlobUrls();
	};

	$effect(() => {
		if (!canvas || !viewport) return;

		const nextRenderer = new THREE.WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false
		});
		const nextScene = new THREE.Scene();
		const nextCamera = new THREE.PerspectiveCamera(50, 1, 0.01, 1_000_000);
		const nextControls = new OrbitControls(nextCamera, nextRenderer.domElement);

		renderer = nextRenderer;
		scene = nextScene;
		camera = nextCamera;
		controls = nextControls;

		nextScene.background = new THREE.Color('#08111f');
		nextControls.enableDamping = true;
		nextControls.dampingFactor = 0.08;

		const ambientLight = new THREE.AmbientLight('#dbeafe', 1.4);
		const directionalLight = new THREE.DirectionalLight('#ffffff', 1.8);
		const fillLight = new THREE.DirectionalLight('#93c5fd', 0.8);
		const gridHelper = new THREE.GridHelper(200, 20, '#475569', '#1e293b');
		const axesHelper = new THREE.AxesHelper(50);

		directionalLight.position.set(80, 120, 60);
		fillLight.position.set(-60, 40, -80);

		nextScene.add(ambientLight, directionalLight, fillLight, gridHelper, axesHelper);

		const resize = () => {
			if (!renderer || !camera || !viewport) return;

			const width = viewport.clientWidth || 1;
			const height = viewport.clientHeight || 1;
			renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
			renderer.setSize(width, height, false);
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
		};

		const renderFrame = () => {
			if (!renderer || !scene || !camera || !controls) return;
			controls.update();
			renderer.render(scene, camera);
			animationFrameId = window.requestAnimationFrame(renderFrame);
		};

		resize();
		window.addEventListener('resize', resize);
		renderFrame();

		return () => {
			window.removeEventListener('resize', resize);
			if (animationFrameId !== null) {
				window.cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			nextControls.dispose();
			nextRenderer.dispose();
			renderer = null;
			scene = null;
			camera = null;
			controls = null;
		};
	});

	$effect(() => {
		if (!scene) return;

		if (activeSceneObject && activeSceneObject !== loadedObject) {
			scene.remove(activeSceneObject);
			activeSceneObject = null;
		}

		if (!loadedObject || loadedObject === activeSceneObject) return;

		scene.add(loadedObject);
		activeSceneObject = loadedObject;
		fitCameraToObject(loadedObject);
	});

	$effect(() => {
		return () => {
			clearLoadedObject();
			revokeBlobUrls();
		};
	});
</script>

<svelte:head>
	<title>Three Loader Test</title>
</svelte:head>

<div class="min-h-dvh bg-slate-950 text-slate-100">
	<div class="mx-auto flex max-w-[1800px] flex-col gap-6 p-6 xl:flex-row">
		<section class="flex w-full shrink-0 flex-col gap-4 xl:w-[460px]">
			<DropContainer
				class={`rounded-2xl border border-dashed p-5 transition-colors ${
					isDragOver ? 'border-sky-400 bg-sky-950/30' : 'border-slate-700 bg-slate-900/70'
				}`}
				bind:isDragover={isDragOver}
				onDropFile={applySelectedFiles}
			>
				<label class="block cursor-pointer">
					<span class="block text-sm font-semibold text-slate-200">
						モデル本体と関連ファイルをまとめて選択 / ドロップ
					</span>
					<span class="mt-2 block text-sm text-slate-400">
						ファイルでもフォルダでも投入できます。OBJ の `.mtl`、FBX/DAE/3DS/3DM
						のテクスチャ類も一緒に入れてください。
					</span>
					<input
						type="file"
						multiple
						accept={MODEL_FILE_ACCEPT}
						class="mt-4 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
						onchange={handleFileInput}
					/>
				</label>
			</DropContainer>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
				<div class="flex items-center justify-between gap-3">
					<h2 class="text-lg font-semibold">入力</h2>
					<button
						type="button"
						onclick={clearAll}
						class="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
					>
						クリア
					</button>
				</div>

				<div class="mt-4 flex flex-col gap-4">
					<div>
						<label for="three-loader-main-model" class="mb-2 block text-sm text-slate-300">
							メインモデル
						</label>
						<select
							id="three-loader-main-model"
							bind:value={selectedModelId}
							disabled={candidateFiles.length === 0}
							class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm disabled:opacity-50"
						>
							{#if candidateFiles.length === 0}
								<option value={null}>モデルファイルがありません</option>
							{:else}
								{#each candidateFiles as candidate (candidate.id)}
									<option value={candidate.id}>
										{candidate.path} ({candidate.format})
									</option>
								{/each}
							{/if}
						</select>
					</div>

					<label class="flex items-center gap-3 text-sm text-slate-300">
						<input
							type="checkbox"
							bind:checked={normalizeToLocalOrigin}
							class="h-4 w-4 rounded border-slate-700 bg-slate-950"
						/>
						ローカル原点へ正規化してから読み込む
					</label>

					<button
						type="button"
						onclick={loadSelectedModel}
						disabled={!selectedCandidate || isLoading}
						class="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
					>
						{isLoading ? '読み込み中...' : 'ローダー実行'}
					</button>
				</div>

				<div class="mt-4 rounded-xl bg-slate-950/80 p-4 text-sm">
					<p>選択ファイル数: {selectedFiles.length}</p>
					<p>候補モデル数: {candidateFiles.length}</p>
					<p>関連ファイル数: {supportingFileCount}</p>
				</div>

				{#if selectedFiles.length > 0}
					<div class="mt-4 max-h-[240px] overflow-auto rounded-xl bg-slate-950/80 p-4">
						<ul class="space-y-2 text-xs text-slate-300">
							{#each selectedFiles as file (createFileId(file))}
								<li class="break-all">
									<span class="font-mono">{getPathLikeName(file)}</span>
									<span class="ml-2 text-slate-500">({file.size.toLocaleString()} bytes)</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if loadError}
					<div
						class="mt-4 rounded-xl border border-rose-900 bg-rose-950/60 p-4 text-sm text-rose-200"
					>
						{loadError}
					</div>
				{/if}
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
				<h2 class="text-lg font-semibold">結果</h2>

				{#if loadedSummary}
					<div class="mt-4 space-y-4 text-sm text-slate-200">
						<div class="rounded-xl bg-slate-950/80 p-4">
							<p class="font-semibold">{loadedSummary.path}</p>
							<p class="mt-2">format: {loadedSummary.format}</p>
							<p>node: {loadedSummary.nodeCount}</p>
							<p>mesh: {loadedSummary.meshCount}</p>
							<p>material: {loadedSummary.materialCount}</p>
							<p>vertex: {loadedSummary.vertexCount.toLocaleString()}</p>
							<p>triangle: {Math.round(loadedSummary.triangleCount).toLocaleString()}</p>
							<p>
								unitScaleFactor:
								{loadedSummary.unitScaleFactor == null ? 'なし' : loadedSummary.unitScaleFactor}
							</p>
						</div>

						<div class="rounded-xl bg-slate-950/80 p-4 font-mono text-xs text-slate-300">
							<p>min: {JSON.stringify(loadedSummary.bbox.min)}</p>
							<p class="mt-2">max: {JSON.stringify(loadedSummary.bbox.max)}</p>
							<p class="mt-2">center: {JSON.stringify(loadedSummary.bbox.center)}</p>
							<p class="mt-2">size: {JSON.stringify(loadedSummary.bbox.size)}</p>
						</div>

						<div class="rounded-xl bg-slate-950/80 p-4">
							<h3 class="font-semibold">animationNames</h3>
							{#if loadedSummary.animationNames.length === 0}
								<p class="mt-2 text-slate-500">なし</p>
							{:else}
								<ul class="mt-2 space-y-1 text-xs text-slate-300">
									{#each loadedSummary.animationNames as animationName (`anim-${animationName}`)}
										<li class="font-mono">{animationName}</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{:else}
					<p class="mt-4 text-sm text-slate-500">
						モデルを読み込むと、bbox とノード情報をここに表示します。
					</p>
				{/if}
			</div>

			<div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
				<h2 class="text-lg font-semibold">ログ</h2>
				<div class="mt-4 max-h-[260px] overflow-auto rounded-xl bg-slate-950/80 p-4">
					{#if loadLog.length === 0}
						<p class="text-sm text-slate-500">まだログはありません。</p>
					{:else}
						<ul class="space-y-2 text-xs text-slate-300">
							{#each loadLog as line, index (`${index}-${line}`)}
								<li class="font-mono">{line}</li>
							{/each}
						</ul>
					{/if}
				</div>
			</div>
		</section>

		<section class="flex min-h-[780px] min-w-0 flex-1 flex-col gap-4">
			<div class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
				<div bind:this={viewport} class="relative h-[720px] w-full">
					<canvas bind:this={canvas} class="block h-full w-full"></canvas>
					<div
						class="pointer-events-none absolute left-4 top-4 rounded-lg bg-slate-950/70 px-3 py-2 text-xs text-slate-300"
					>
						OrbitControls: 左ドラッグで回転 / ホイールでズーム / 右ドラッグでパン
					</div>
				</div>
			</div>
		</section>
	</div>
</div>
