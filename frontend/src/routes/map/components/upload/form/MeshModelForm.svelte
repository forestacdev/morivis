<script lang="ts">
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createGlbEntry } from '$routes/map/data/entries/model';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import { mapStore } from '$routes/stores/map';

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

	const glbFile = $derived.by(() => {
		if (!dropFile) return null;
		if (dropFile instanceof FileList) {
			return Array.from(dropFile).find((f) => /\.(glb|obj)$/i.test(f.name)) ?? null;
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

	/** MTL内のテクスチャパスをBlobURLに書き換える */
	const processMtl = async (mtl: File, textures: File[]): Promise<string> => {
		let mtlText = await mtl.text();
		const texMap = new Map<string, string>();
		for (const tex of textures) {
			texMap.set(tex.name.toLowerCase(), URL.createObjectURL(tex));
		}
		mtlText = mtlText.replace(
			/^(map_Kd|map_Ka|map_Ks|map_Ns|map_d|bump|disp|decal|refl)\s+(.+)$/gim,
			(_match, key, path) => {
				const fileName = path.trim().split(/[\\/]/).pop()?.toLowerCase() ?? '';
				const blobUrl = texMap.get(fileName);
				return blobUrl ? `${key} ${blobUrl}` : `${key} ${path}`;
			}
		);
		return URL.createObjectURL(new Blob([mtlText], { type: 'text/plain' }));
	};

	// ファイルドロップ時: 自動的にプレビューエントリに登録
	$effect(() => {
		if (glbFile) {
			const blobUrl = URL.createObjectURL(glbFile);
			const name = glbFile.name.replace(/\.[^.]+$/, '');
			const isObj = glbFile.name.toLowerCase().endsWith('.obj');

			const register = async () => {
				let resolvedMtlUrl: string | undefined;
				if (mtlFile) {
					resolvedMtlUrl = await processMtl(mtlFile, textureFiles);
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
					isObj ? 'obj' : 'gltf',
					resolvedMtlUrl
				);

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
		const entry = createGlbEntry(forms.name, forms.url.trim(), {
			lng: center?.lng ?? 0,
			lat: center?.lat ?? 0,
			altitude: 0
		});
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
		<TextForm bind:value={forms.url} label="3Dモデル URL (GLB / OBJ)" error={errors.url} />
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
