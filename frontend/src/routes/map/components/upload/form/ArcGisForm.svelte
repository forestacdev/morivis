<script lang="ts">
	import { slide } from 'svelte/transition';
	import * as yup from 'yup';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import { createRasterEntry } from '$routes/map/data/entries/raster';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import type { DialogType } from '$routes/map/types';
	import {
		fetchArcGisMapServerInfo,
		type ArcGisMapServerInfo
	} from '$routes/map/utils/file/arcgis';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: GeoDataEntry | null;
		showDialogType: DialogType;
	}

	let { showDataEntry = $bindable(), showDialogType = $bindable() }: Props = $props();

	const urlValidation = yup.object().shape({
		url: yup
			.string()
			.required('URLを入力してください。')
			.test('url-format', 'URLの形式が正しくありません', (value) => {
				if (!value) return false;
				return value.startsWith('http://') || value.startsWith('https://');
			})
	});

	type UrlFormSchema = yup.InferType<typeof urlValidation>;

	let forms = $state<UrlFormSchema>({ url: '' });
	let isUrlDisabled = $state<boolean>(true);
	let urlErrors = $state<Partial<Record<keyof UrlFormSchema, string>>>({});
	let serverInfo = $state<ArcGisMapServerInfo | null>(null);

	$effect(() => {
		urlValidation
			.validate(forms, { abortEarly: false })
			.then(() => {
				isUrlDisabled = false;
				urlErrors = {};
			})
			.catch((error) => {
				isUrlDisabled = true;
				const newErrors: Record<string, string> = {};
				if (error.inner && Array.isArray(error.inner)) {
					error.inner.forEach((err: yup.ValidationError) => {
						if (err.path) {
							newErrors[err.path] = err.message;
						}
					});
				}
				urlErrors = newErrors;
			});
	});

	const fetchInfo = async () => {
		isProcessing.set(true);
		serverInfo = null;

		try {
			const url = forms.url.trim();
			const info = await fetchArcGisMapServerInfo(url);
			serverInfo = info;
		} catch (e) {
			showNotification('ArcGIS MapServerの情報取得に失敗しました', 'error');
			console.error(e);
		} finally {
			isProcessing.set(false);
		}
	};

	const registration = () => {
		if (!serverInfo) return;

		const entry = createRasterEntry(serverInfo.name, serverInfo.tileUrl, {
			tileSize: serverInfo.tileSize,
			minZoom: serverInfo.minZoom,
			maxZoom: serverInfo.maxZoom,
			bounds: serverInfo.bounds
		});

		console.log('Created entry:', entry); // 追加: 作成されたエントリーをログに出力

		showDataEntry = entry;
		showDialogType = null;
		showNotification('レイヤーを登録しました', 'success');
	};

	const cancel = () => {
		showDialogType = null;
	};
</script>

<div class="flex shrink-0 items-center justify-between overflow-auto pb-4">
	<span class="text-2xl font-bold">ArcGIS Tiled Map Serviceの登録</span>
</div>

<div
	class="c-scroll flex h-full w-full grow flex-col items-center gap-3 overflow-x-hidden overflow-y-auto"
>
	<div class="flex w-full items-center gap-2 p-2">
		<div class="grow">
			<TextForm bind:value={forms.url} label="MapServer URL" error={urlErrors.url} />
		</div>
	</div>

	{#if serverInfo}
		<div transition:slide class="w-full px-2 text-sm text-gray-300">
			<div class="font-bold">{serverInfo.name}</div>
			<div class="mt-1 text-xs text-gray-400">
				<div>ズーム: {serverInfo.minZoom} - {serverInfo.maxZoom}</div>
				<div>タイルサイズ: {serverInfo.tileSize}px</div>
				{#if serverInfo.description}
					<div class="mt-1">{serverInfo.description}</div>
				{/if}
				<div class="mt-1 break-all">URL: {serverInfo.tileUrl}</div>
			</div>
		</div>
	{/if}
</div>

<div class="flex shrink-0 justify-center gap-4 overflow-auto pt-2">
	<button onclick={cancel} class="c-btn-sub cursor-pointer p-4 text-lg"> キャンセル </button>
	<button
		onclick={fetchInfo}
		disabled={isUrlDisabled || $isProcessing}
		class="c-btn-confirm min-w-[150px] cursor-pointer p-4 text-lg {isUrlDisabled || $isProcessing
			? 'cursor-not-allowed px-8 opacity-50'
			: ''}"
	>
		{serverInfo ? '再取得' : '情報を取得'}
	</button>
	{#if serverInfo}
		<button
			onclick={registration}
			disabled={$isProcessing}
			class="c-btn-confirm min-w-[200px] cursor-pointer p-4 text-lg {$isProcessing
				? 'cursor-not-allowed opacity-50'
				: ''}"
		>
			決定
		</button>
	{/if}
</div>
