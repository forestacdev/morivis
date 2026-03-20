<script lang="ts">
	import * as yup from 'yup';
	import { slide } from 'svelte/transition';
	import HorizontalSelectBox from '$routes/map/components/atoms/HorizontalSelectBox.svelte';
	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry, createDemRasterEntry } from '$routes/map/data/entries/raster';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DemDataTypeKey } from '$routes/map/data/types/raster';
	import type { DialogType } from '$routes/map/types';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const rasterValidation = yup.object().shape({
		name: yup.string().required('データ名を入力してください。'),
		tileUrl: yup.string().required('タイルのURLを入力してください。')
	});

	type RasterFormSchema = yup.InferType<typeof rasterValidation>;

	let forms = $state<RasterFormSchema>({
		name: '',
		tileUrl: ''
	});

	let tileType = $state<'raster' | 'dem'>('raster');
	let demType = $state<DemDataTypeKey>('gsi');

	let isDisabled = $state<boolean>(true);
	let errors = $state<Partial<Record<keyof RasterFormSchema, string>>>({});

	$effect(() => {
		rasterValidation
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
						if (err.path) {
							newErrors[err.path] = err.message;
						}
					});
				}
				errors = newErrors;
			});
	});

	const registration = () => {
		const url = forms.tileUrl.trim();

		const entry =
			tileType === 'dem'
				? createDemRasterEntry(forms.name, url, { demType })
				: createRasterEntry(forms.name, url);

		if (entry) {
			showDataEntry = entry;
			showDialogType = null;
		}
	};

	const cancel = () => {
		showDialogType = null;
	};

	const DEM_TYPE_OPTIONS: { key: DemDataTypeKey; name: string }[] = [
		{ key: 'gsi', name: '国土地理院' },
		{ key: 'mapbox', name: 'Terrain-RGB' },
		{ key: 'terrarium', name: 'Terrarium' }
	];
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">XYZタイルの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-2 overflow-x-hidden overflow-y-auto"
>
	<TextForm bind:value={forms.name} label="データ名" error={errors.name} />
	<TextForm bind:value={forms.tileUrl} label="タイルURL" error={errors.tileUrl} />

	<div class="w-full p-2">
		<HorizontalSelectBox
			label="タイルタイプ"
			bind:group={tileType}
			options={[
				{ key: 'raster', name: '画像タイル' },
				{ key: 'dem', name: '標高タイル' }
			]}
		/>
	</div>
	{#if tileType === 'dem'}
		<div transition:slide class="w-full p-2">
			<HorizontalSelectBox
				label="エンコーディング形式"
				bind:group={demType}
				options={DEM_TYPE_OPTIONS}
			/>
		</div>
	{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={registration}
		disabled={isDisabled}
		class="c-btn-confirm min-w-[200px] p-4 text-lg {isDisabled
			? 'cursor-not-allowed opacity-50'
			: 'cursor-pointer'}"
	>
		決定
	</button>
</div>
