<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
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

	const getPathLikeName = (file: File) => {
		const relativePath = (file as File & { morivisRelativePath?: string }).morivisRelativePath;
		return (relativePath ?? file.name).toLowerCase();
	};

	const glbFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(glb|obj|3ds)$/i.test(getPathLikeName(f))) ?? null;
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

	// ファイルドロップ時: 自動的にプレビューエントリに登録
	$effect(() => {
		if (glbFile) {
			const blobUrl = URL.createObjectURL(glbFile);
			const name = glbFile.name.replace(/\.[^.]+$/, '');
			const isObj = glbFile.name.toLowerCase().endsWith('.obj');
			const is3ds = glbFile.name.toLowerCase().endsWith('.3ds');

			const register = async () => {
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
						lng: center?.lng ?? 0,
						lat: center?.lat ?? 0,
						altitude: 0
					},
					isObj ? 'obj' : is3ds ? '3ds' : 'gltf',
					resolvedMtlUrl,
					isObj || is3ds ? resourceUrls : undefined
				);

				try {
					const uploadedModelMeta = await computeUploadedModelMeta({
						file: glbFile,
						format: isObj ? 'obj' : is3ds ? '3ds' : 'gltf',
						style: entry.style,
						resourceUrls
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
						entry.style.transform.baseScale = uploadedModelMeta.scaleMultiplier;
						showNotification('小さいモデルのため拡大して表示します', 'info');
					}
					entry.metaData.bounds = uploadedModelMeta.bounds;
					entry.metaData.xyzImageTile = uploadedModelMeta.xyzImageTile;
				} catch (error) {
					console.warn('3Dモデルの範囲を取得できませんでした', error);
				}

				if (entry) {
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
		showDialogType = null;
		dropFile = null;
	};
</script>

{#if !glbFile}
	<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
		<span class="text-2xl font-bold">3Dモデルの登録</span>
	</div>

	<div
		class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
	>
		<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
		<TextForm bind:value={forms.url} label="3Dモデル URL (GLB / OBJ / 3DS)" error={errors.url} />
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
