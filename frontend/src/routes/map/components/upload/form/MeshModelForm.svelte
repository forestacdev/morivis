<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		type IfcPlacementMetadata,
		readIfcPlacementMetadata,
		resolveIfcPlacementWithEpsg
	} from '$routes/map/utils/three/ifc-metadata';
	import {
		getEpsgInfoArray,
		getName,
		type EpsgCode
	} from '$routes/map/utils/proj/dict';
	import { computeUploadedModelMeta } from '$routes/map/utils/three/model-bounds';
	import { mapStore } from '$routes/stores/map';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
		dropFile: File | FileList | null;
	}

	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	interface ModelPlacement {
		name?: string;
		lng: number;
		lat: number;
		altitude: number;
		scale?: number;
	}

	const getPathLikeName = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return (relativePath ?? file.name).toLowerCase();
	};

	const getModelPlacement = (file: File): ModelPlacement | undefined => {
		return (file as File & { morivisModelPlacement?: ModelPlacement }).morivisModelPlacement;
	};

	const glbFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(glb|obj|3ds|dae|3dm|fbx|drc|3mf|amf|ifc)$/i.test(getPathLikeName(f))) ?? null;
		}
		return dropFile;
	});

	const mtlFile = $derived.by(() => {
		if (!dropFile || !(dropFile instanceof FileList)) return null;
		return Array.from(dropFile).find((f) => /\.mtl$/i.test(f.name)) ?? null;
	});

	const textureFiles = $derived.by(() => {
		if (!dropFile || !(dropFile instanceof FileList)) return [];
		return Array.from(dropFile).filter((f) => /\.(png|jpe?g|bmp|tga|gif|webp)$/i.test(f.name));
	});

	const getRelativePath = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return relativePath?.replace(/\\/g, '/');
	};

	const buildResourceUrls = (files: File[]) => {
		const resourceUrls: Record<string, string> = {};
		files.forEach((file) => {
			const blobUrl = URL.createObjectURL(file);
			const relativePath = getRelativePath(file);
			const lowerFileName = file.name.toLowerCase();
			resourceUrls[lowerFileName] = blobUrl;

			if (!relativePath) return;

			const normalizedRelativePath = relativePath.toLowerCase();
			resourceUrls[normalizedRelativePath] = blobUrl;

			const relativeWithoutRoot = normalizedRelativePath.split('/').slice(1).join('/');
			if (relativeWithoutRoot) {
				resourceUrls[relativeWithoutRoot] = blobUrl;
			}
		});
		return resourceUrls;
	};

	const ifcEpsgOptions = getEpsgInfoArray({ exclude4326: true, exclude3857: true });
	let pendingIfcPlacement = $state<IfcPlacementMetadata | null>(null);
	let selectedIfcEpsg = $state<EpsgCode | null>(null);
	let confirmedIfcEpsg = $state<EpsgCode | null>(null);
	let ifcEpsgFilter = $state('');
	const filteredIfcEpsgOptions = $derived.by(() => {
		const keyword = ifcEpsgFilter.trim().toLowerCase();
		if (!keyword) return ifcEpsgOptions;
		return ifcEpsgOptions.filter((info) => {
			return (
				info.code.toLowerCase().includes(keyword) ||
				info.name_ja.toLowerCase().includes(keyword) ||
				(info.prefecture ?? '').toLowerCase().includes(keyword)
			);
		});
	});

	const resetIfcEpsgSelection = () => {
		pendingIfcPlacement = null;
		selectedIfcEpsg = null;
		confirmedIfcEpsg = null;
		ifcEpsgFilter = '';
	};

	// ファイルドロップ時: 自動的にプレビューエントリに登録
	$effect(() => {
		if (glbFile) {
			const blobUrl = URL.createObjectURL(glbFile);
			const modelPlacement = getModelPlacement(glbFile);
			const name = modelPlacement?.name?.trim() || glbFile.name.replace(/\.[^.]+$/, '');
			const isObj = glbFile.name.toLowerCase().endsWith('.obj');
			const is3ds = glbFile.name.toLowerCase().endsWith('.3ds');
			const isDae = glbFile.name.toLowerCase().endsWith('.dae');
			const is3dm = glbFile.name.toLowerCase().endsWith('.3dm');
			const isFbx = glbFile.name.toLowerCase().endsWith('.fbx');
			const isDrc = glbFile.name.toLowerCase().endsWith('.drc');
			const is3mf = glbFile.name.toLowerCase().endsWith('.3mf');
			const isAmf = glbFile.name.toLowerCase().endsWith('.amf');
			const isIfc = glbFile.name.toLowerCase().endsWith('.ifc');

			const register = async () => {
				let ifcPlacement = isIfc ? pendingIfcPlacement : undefined;
				if (isIfc && !ifcPlacement) {
					ifcPlacement = await readIfcPlacementMetadata(glbFile);
				}
				if (isIfc && ifcPlacement?.requiresEpsg) {
					pendingIfcPlacement = ifcPlacement;
					console.log('[IFC] requires EPSG selection', {
						fileName: glbFile.name,
						ifcPlacement
					});
					if (!confirmedIfcEpsg) {
						return;
					}
					ifcPlacement = resolveIfcPlacementWithEpsg(ifcPlacement, confirmedIfcEpsg);
					if (ifcPlacement.requiresEpsg) {
						showNotification('EPSGコードからIFCの配置を解決できませんでした', 'error');
						return;
					}
				}
				let resolvedMtlUrl: string | undefined;
				let resourceUrls: Record<string, string> | undefined;
				if (textureFiles.length > 0) {
					resourceUrls = buildResourceUrls(textureFiles);
				}
				if (mtlFile) {
					resolvedMtlUrl = URL.createObjectURL(mtlFile);
				}

				// 現在の地図中心を配置位置にする
				const center = mapStore.getCenter();
				const entry = createGlbEntry(
					name,
					blobUrl,
					{
						lng: ifcPlacement?.lng ?? modelPlacement?.lng ?? center?.lng ?? 0,
						lat: ifcPlacement?.lat ?? modelPlacement?.lat ?? center?.lat ?? 0,
						altitude: ifcPlacement?.altitude ?? modelPlacement?.altitude ?? 0,
						scale: modelPlacement?.scale
					},
					isObj
						? 'obj'
						: is3ds
							? '3ds'
							: isDae
								? 'dae'
								: is3dm
									? '3dm'
									: isFbx
										? 'fbx'
										: isDrc
											? 'drc'
											: is3mf
												? '3mf'
												: isAmf
													? 'amf'
												: isIfc
													? 'ifc'
													: 'gltf',
					resolvedMtlUrl,
					isObj || is3ds || isDae || is3dm || isFbx ? resourceUrls : undefined,
					isIfc ? { normalizeToLocalOrigin: !!ifcPlacement?.requiresEpsg } : undefined
				);
				if (isIfc) {
					console.log('[IFC] registration entry', {
						fileName: glbFile.name,
						ifcPlacement,
						transform: entry.style.transform,
						normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin
					});
				}
				if (ifcPlacement?.unitScale && ifcPlacement.unitScale !== 1) {
					entry.style.transform.baseScale = ifcPlacement.unitScale;
				}
				if (ifcPlacement?.baseRotationZ != null) {
					entry.style.transform.baseRotationZ = ifcPlacement.baseRotationZ;
				}

				try {
					const uploadedModelMeta = await computeUploadedModelMeta({
						file: glbFile,
						format: isObj
							? 'obj'
							: is3ds
								? '3ds'
								: isDae
									? 'dae'
									: is3dm
										? '3dm'
										: isFbx
											? 'fbx'
											: isDrc
												? 'drc'
												: is3mf
													? '3mf'
													: isAmf
														? 'amf'
														: isIfc
															? 'ifc'
															: 'gltf',
						style: entry.style,
						resourceUrls,
						normalizeToLocalOrigin: entry.format.normalizeToLocalOrigin
					});
					if (uploadedModelMeta.hasSkinnedMesh) {
						entry.style.shadingOptions = {
							enabled: false
						};
						if (entry.style.shading) {
							entry.style.shading.enabled = false;
						}
					}
					if (uploadedModelMeta.animationNames.length > 0) {
						entry.properties = {
							...entry.properties,
							animation: {
								clips: uploadedModelMeta.animationNames.map((name) => ({ name }))
							}
						};
						entry.state = {
							...entry.state,
							animation: {
								currentClipIndex: 0,
								playing: false,
								speed: 1
							}
						};
					}
					if (uploadedModelMeta.scaleMultiplier !== 1) {
							entry.style.transform.baseScale =
								(entry.style.transform.baseScale ?? 1) * uploadedModelMeta.scaleMultiplier;
						showNotification('小さいモデルのため拡大して表示します', 'info');
					}
					entry.metaData.bounds = uploadedModelMeta.bounds;
					entry.metaData.xyzImageTile = uploadedModelMeta.xyzImageTile;
					if (isIfc) {
						console.log('[IFC] uploaded model meta', {
							fileName: glbFile.name,
							uploadedModelMeta
						});
					}
				} catch (error) {
					console.warn('3Dモデルの範囲を取得できませんでした', error);
				}

				if (entry) {
					resetIfcEpsgSelection();
					showDataEntry = entry;
					showDialogType = null;
					dropFile = null;
				}
			};

			register();
		}
	});

	// URL入力用
	const validation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		url: yup
			.string()
			.required('3DモデルのURLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return false;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	let forms = $state({ name: '', url: '' });
	let isDisabled = $state(true);
	let errors = $state<Partial<Record<string, string>>>({});

	$effect(() => {
		validation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isDisabled = false;
				errors = {};
			})
			.catch((error) => {
				isDisabled = true;
				const newErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) newErrors[err.path] = err.message;
					});
				}
				errors = newErrors;
			});
	});

	const registrationFromUrl = () => {
		const center = mapStore.getCenter();
		const normalizedUrl = forms.url.trim().toLowerCase();
		const format = normalizedUrl.endsWith('.obj')
			? 'obj'
			: normalizedUrl.endsWith('.3ds')
				? '3ds'
				: normalizedUrl.endsWith('.dae')
					? 'dae'
					: normalizedUrl.endsWith('.3dm')
						? '3dm'
						: normalizedUrl.endsWith('.fbx')
							? 'fbx'
							: normalizedUrl.endsWith('.drc')
								? 'drc'
								: normalizedUrl.endsWith('.3mf')
									? '3mf'
									: normalizedUrl.endsWith('.amf')
										? 'amf'
										: normalizedUrl.endsWith('.ifc')
											? 'ifc'
								: 'gltf';
		const entry = createGlbEntry(
			forms.name,
			forms.url.trim(),
			{
				lng: center?.lng ?? 0,
				lat: center?.lat ?? 0,
				altitude: 0
			},
			format
		);
		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		resetIfcEpsgSelection();
		showDialogType = null;
		dropFile = null;
	};
</script>

{#if glbFile && pendingIfcPlacement?.requiresEpsg}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">IFCの座標系選択</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<p class="w-full text-sm text-gray-300">
			IFCに地理座標系名が入っていません。使用するEPSGコードを選択してください。
		</p>
		<TextForm bind:value={ifcEpsgFilter} label="EPSG検索" />
		<div class="c-scroll flex w-full grow flex-col gap-2 overflow-y-auto pr-1">
			{#each filteredIfcEpsgOptions as info (info.code)}
				<label
					class="border-sub lg:hover:border-accent flex w-full cursor-pointer items-center justify-start rounded-md border p-3 transition-colors duration-200 {info.code ===
					selectedIfcEpsg
						? 'bg-accent'
						: 'text-white'}"
				>
					<input type="radio" bind:group={selectedIfcEpsg} value={info.code} class="hidden" />
					<div class="flex flex-col">
						<span>{info.name_ja}</span>
						<span class="text-sm text-gray-300">EPSG:{info.code} {info.prefecture ?? ''}</span>
					</div>
				</label>
			{/each}
		</div>
		{#if selectedIfcEpsg}
			<p class="w-full text-sm text-gray-300">選択中: EPSG:{selectedIfcEpsg} {getName(selectedIfcEpsg)}</p>
		{/if}
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		<button
			onclick={() => {
				if (!selectedIfcEpsg) return;
				confirmedIfcEpsg = selectedIfcEpsg;
			}}
			disabled={!selectedIfcEpsg}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {!selectedIfcEpsg
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			決定
		</button>
	</div>
{:else if !glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">3Dモデルの登録</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
		<TextForm bind:value={forms.url} label="3Dモデル URL (GLB / OBJ / 3DS / DAE / 3DM / FBX / DRC / 3MF / AMF / IFC)" error={errors.url} />
	</div>

	<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
		<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg">キャンセル</button>
		<button
			onclick={registrationFromUrl}
			disabled={isDisabled}
			class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer'}"
		>
			決定
		</button>
	</div>
{/if}
