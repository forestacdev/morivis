<script lang="ts">
	import { tick } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { getRemoteFileName, resolveUploadUrlInput, validateUploadUrlInput } from './upload-url';

	import DropContainer from '$routes/map/components/DropContainer.svelte';
	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import {
		SUPPORTED_FILE_ACCEPT,
		SUPPORTED_FILE_GROUPS,
		type DialogType,
		type UploadFiles
	} from '$routes/map/types';
	import { fetchWithDevProxy } from '$routes/map/utils/platform/request';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		dropFile: UploadFiles;
		showDialogType: DialogType;
		remoteGeoZarrUrl: string | null;
		remotePmtilesUrl: string | null;
		remoteRasterUrl: string | null;
		remoteVectorUrl: string | null;
		remoteTiles3dUrl: string | null;
		remoteWmtsUrl: string | null;
		remoteFeatureServiceUrl: string | null;
		pendingTileUrl: string | null;
	}

	let {
		showDataEntry = $bindable(),
		dropFile = $bindable(),
		showDialogType = $bindable(),
		remoteGeoZarrUrl = $bindable(),
		remotePmtilesUrl = $bindable(),
		remoteRasterUrl = $bindable(),
		remoteVectorUrl = $bindable(),
		remoteTiles3dUrl = $bindable(),
		remoteWmtsUrl = $bindable(),
		remoteFeatureServiceUrl = $bindable(),
		pendingTileUrl = $bindable()
	}: Props = $props();

	let inputUrl = $state('');
	let isLoadingUrl = $state(false);
	let hasTouchedUrlInput = $state(false);
	let showFormListDialog = $state(false);
	let formListFileAccept = $state(SUPPORTED_FILE_ACCEPT);
	let formListFileInput = $state<HTMLInputElement | null>(null);

	const trimmedInputUrl = $derived(inputUrl.trim());
	const urlInputError = $derived.by(() => {
		if (!hasTouchedUrlInput) return '';
		return validateUploadUrlInput(trimmedInputUrl);
	});
	const isUrlInputValid = $derived(trimmedInputUrl.length > 0 && !urlInputError);

	const inputRemoteFile = async () => {
		hasTouchedUrlInput = true;

		// URLの種別判定は upload-url.ts に集約し、ここでは結果に応じて state を更新する。
		const resolved = await resolveUploadUrlInput(trimmedInputUrl);

		if (resolved.type === 'error') {
			showNotification(resolved.message, 'error');
			return;
		}

		if (resolved.type === 'dialog') {
			// 既知のURL種別に当たった場合は、対応フォームへ必要な値を渡して終了する。
			showDialogType = resolved.dialogType;
			if (resolved.target === 'remoteRasterUrl') remoteRasterUrl = resolved.value;
			if (resolved.target === 'remoteVectorUrl') remoteVectorUrl = resolved.value;
			if (resolved.target === 'pendingTileUrl') pendingTileUrl = resolved.value;
			if (resolved.target === 'remoteTiles3dUrl') remoteTiles3dUrl = resolved.value;
			if (resolved.target === 'remotePmtilesUrl') remotePmtilesUrl = resolved.value;
			if (resolved.target === 'remoteWmtsUrl') remoteWmtsUrl = resolved.value;
			if (resolved.target === 'remoteFeatureServiceUrl') remoteFeatureServiceUrl = resolved.value;
			inputUrl = '';
			hasTouchedUrlInput = false;
			return;
		}

		isLoadingUrl = true;
		isProcessing.set(true);
		try {
			// upload-url.ts が remote-file を返した場合だけ、ここで実ファイルを取得する。
			const response = await fetchWithDevProxy(resolved.requestUrl);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const remoteFileName = getRemoteFileName(resolved.requestUrl, response);
			if (!remoteFileName) {
				showNotification('URLから対応拡張子を判定できません', 'error');
				return;
			}

			const blob = await response.blob();
			dropFile = [new File([blob], remoteFileName, { type: blob.type })];
			inputUrl = '';
			hasTouchedUrlInput = false;
		} catch (error) {
			console.error('Failed to load remote file:', error);
			showNotification(
				'URLの読み込みに失敗しました。URLが正しいか、配信元がCORSを許可しているか確認してください',
				'error'
			);
		} finally {
			isLoadingUrl = false;
			isProcessing.set(false);
		}
	};

	const inputFile = async (e: Event) => {
		const files = (e.target as HTMLInputElement).files;
		if (!files || files.length === 0) return;

		await handleDroppedFiles(Array.from(files));
	};

	const handleDroppedFiles = async (files: File[]) => {
		if (!files || files.length === 0) return;

		// 単一ZIPファイルの場合は展開
		if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
			try {
				const extracted = await extractZipFiles(files[0]);
				if (extracted.length > 0) {
					dropFile = extracted;
					return;
				}
			} catch {
				// 展開失敗時は通常フローへ
			}
		}

		dropFile = files;
	};

	const showUploadDialog = (type: DialogType) => {
		showFormListDialog = false;
		showDialogType = type;
	};

	const urlDialogGroups: {
		title: string;
		dialogs: { type: DialogType; label: string; description: string }[];
	}[] = [
		{
			title: 'URL・サービス',
			dialogs: [
				{
					type: 'raster',
					label: 'XYZタイル',
					description:
						'画像タイルのURLテンプレートです。背景地図やオルソ画像を表示するときに使います。'
				},
				{
					type: 'vector',
					label: 'ベクタータイル',
					description:
						'ベクタータイルのURLテンプレートです。属性を持つタイルデータを表示するときに使います。'
				},
				{
					type: 'wmts',
					label: 'WMS/WMTS',
					description:
						'地図配信サービスのURLです。公開されている配信レイヤーを追加するときに使います。'
				},
				{
					type: 'wcs',
					label: 'WCS',
					description:
						'カバレッジ配信サービスのURLです。ラスターデータを範囲指定で取得するときに使います。'
				},
				{
					type: 'featureservice',
					label: 'WFS / OGC API',
					description:
						'地物配信サービスのURLです。WFS と OGC API - Features のどちらも同じフォームから開けます。'
				},
				{
					type: 'arcgis',
					label: 'ArcGIS',
					description:
						'ArcGIS REST サービスのURLです。ArcGIS Server や Online のレイヤーを追加するときに使います。'
				},
				{
					type: 'pmtiles',
					label: 'PMTiles',
					description:
						'PMTiles ファイルのURLです。単一ファイルで配信されるタイルデータを開くときに使います。'
				},
				{
					type: '3dtiles',
					label: '3D Tiles',
					description:
						'3D Tiles の tileset.json のURLです。3次元の地物やモデルを表示するときに使います。'
				},
				{
					type: 'stac',
					label: 'STAC / COG',
					description:
						'STAC API や COG のURLです。衛星画像やラスターデータを参照するときに使います。'
				}
			]
		}
	];

	const fileDialogGroups: {
		title: string;
		groups: { label: string; description: string; extensions: string[]; accept: string }[];
	}[] = [
		{
			title: 'ファイル選択',
			groups: SUPPORTED_FILE_GROUPS.filter(
				(group) => group.label !== 'GeoJSON' && group.label !== 'WKT'
			).map((group) => ({
				label: group.label,
				description: group.description,
				extensions: group.extensions,
				accept: group.extensions.join(',')
			}))
		}
	];

	const directFileDialogGroups: {
		title: string;
		dialogs: { type: DialogType; label: string; description: string }[];
	}[] = [
		{
			title: 'テキスト入力',
			dialogs: [
				{
					type: 'geojson',
					label: 'GeoJSON入力',
					description: 'GeoJSONファイルの読み込みや、GeoJSONテキストの直接入力を行うフォームです。'
				},
				{
					type: 'wkt',
					label: 'WKT入力',
					description: 'WKTファイルの読み込みや、WKTテキストの直接入力を行うフォームです。'
				}
			]
		},
		{
			title: 'ファイルフォーム',
			dialogs: [
				{
					type: 'shp',
					label: 'Shapefile',
					description:
						'Shapefile の登録フォームです。.shp .dbf .shx などの構成ファイルをまとめて指定するときに使います。'
				},
				{
					type: 'demxml',
					label: '基盤地図情報 DEM XML',
					description:
						'基盤地図情報の標高 XML を読み込むフォームです。複数 XML をまとめてドロップするときにも使えます。'
				}
			]
		}
	];

	const openFilteredFilePicker = async (accept: string) => {
		formListFileAccept = accept;
		await tick();
		formListFileInput?.click();
	};
	let isDragover = $state(false);
	const setRelativePath = (file: File, relativePath: string) => {
		Object.defineProperty(file, 'morivisRelativePath', {
			value: relativePath,
			configurable: true
		});
		return file;
	};

	/** ZIPファイルを展開してFile配列にする */
	const extractZipFiles = async (zipFile: File): Promise<File[]> => {
		const JSZip = (await import('jszip')).default;
		const zip = await JSZip.loadAsync(zipFile);
		const files: File[] = [];
		const entries: [string, import('jszip').JSZipObject][] = [];
		zip.forEach((path, entry) => {
			if (!entry.dir) entries.push([path, entry]);
		});
		for (const [path, entry] of entries) {
			const blob = await entry.async('blob');
			const fileName = path.split('/').pop() ?? path;
			files.push(setRelativePath(new File([blob], fileName, { type: blob.type }), path));
		}
		return files;
	};
</script>

<div class="flex h-full grow flex-col gap-4 p-4 text-white">
	<DropContainer
		bind:isDragover
		onDropFile={handleDroppedFiles}
		class="flex h-full w-full grow flex-col items-center justify-center gap-16 rounded-lg border-2 decoration-amber-200 transition-all {isDragover
			? 'border-white bg-black'
			: 'border-dashed bg-black/70'}"
	>
		<div class="grid place-items-center gap-6">
			<span class="text-3xl">ここにファイルをドロップしてください </span>

			<label
				class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 text-black transition-colors hover:text-white"
			>
				<span>またはファイルを選択</span>
				<input
					type="file"
					multiple
					accept={SUPPORTED_FILE_ACCEPT}
					class="hidden"
					onchange={(e) => inputFile(e)}
				/>
			</label>
			<input
				bind:this={formListFileInput}
				type="file"
				multiple
				accept={formListFileAccept}
				class="hidden"
				onchange={(e) => inputFile(e)}
			/>
			<div class="flex w-full max-w-[720px] flex-col gap-1 px-4">
				<div class="flex w-full flex-col gap-3 sm:flex-row">
					<div class="flex w-full flex-col gap-2">
						<input
							type="url"
							bind:value={inputUrl}
							placeholder="URLから読み込む"
							class="bg-base text-main placeholder:text-main/60 focus:ring-accent/40 w-full rounded-full px-5 py-3 focus:ring-2 focus:outline-none {urlInputError
								? 'ring-2 ring-red-500/70'
								: ''}"
							oninput={() => {
								hasTouchedUrlInput = true;
							}}
							onblur={() => {
								hasTouchedUrlInput = true;
							}}
							onkeydown={async (e) => {
								if (e.key === 'Enter' && !isLoadingUrl && isUrlInputValid) {
									await inputRemoteFile();
								}
							}}
						/>
					</div>
				</div>
				<div>
					{#if urlInputError}
						<span transition:slide class="text-xs text-red-400">{urlInputError}</span>
					{:else}
						<span class="text-xs text-gray-500">
							※配信元がCORSを許可しているファイルURLを入力してください
						</span>
					{/if}
				</div>
				{#if !(isLoadingUrl || !isUrlInputValid)}
					<div class="flex w-full justify-center">
						<button
							transition:slide={{ axis: 'y' }}
							onclick={inputRemoteFile}
							disabled={isLoadingUrl || !isUrlInputValid}
							class="bg-base hover:bg-accent w-[100px] min-w-[140px] rounded-full px-6 py-3 text-wrap text-black transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
						>
							{isLoadingUrl ? '読込中...' : 'URLを開く'}
						</button>
					</div>
				{/if}
			</div>
			<div class="flex flex-wrap items-center justify-center gap-4 px-4">
				<button
					onclick={() => {
						showFormListDialog = true;
					}}
					class="bg-base hover:bg-accent grid cursor-pointer place-items-center rounded-full p-4 px-6 text-black transition-colors hover:text-white"
				>
					フォーム一覧
				</button>
			</div>
			<div class="marquee-container overflow-hidden">
				<div class="marquee-track flex w-max gap-2 select-none">
					{#each Array.from({ length: 2 }) as _, index (index)}
						{#each SUPPORTED_FILE_GROUPS as group (group.label)}
							<span class="bg-sub rounded-full p-1 px-3 text-xs whitespace-nowrap text-gray-300">
								{group.label}
							</span>
						{/each}
					{/each}
				</div>
			</div>
		</div>
	</DropContainer>
</div>

{#if showFormListDialog}
	<div
		transition:fade={{ duration: 200 }}
		class="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
	>
		<div class="bg-main flex max-h-[80dvh] w-full max-w-[880px] flex-col gap-4 rounded-xl p-5">
			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-col gap-1">
					<span class="text-xl font-bold text-white">フォーム一覧</span>
					<span class="text-sm text-gray-400">
						URL指定系とファイル系のフォームをここから直接開けます
					</span>
				</div>
				<button
					onclick={() => {
						showFormListDialog = false;
					}}
					class="bg-base hover:bg-accent cursor-pointer rounded-full px-4 py-2 text-black transition-colors select-none hover:text-white"
				>
					閉じる
				</button>
			</div>

			<div class="c-scroll flex flex-col gap-5 overflow-y-auto pr-1">
				{#each urlDialogGroups as group (group.title)}
					<div class="flex flex-col gap-3">
						<span class="text-sm font-bold text-gray-300">{group.title}</span>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each group.dialogs as dialog (dialog.type)}
								<button
									onclick={() => showUploadDialog(dialog.type)}
									class="bg-base hover:bg-accent group flex min-h-[112px] cursor-pointer flex-col gap-2 rounded-lg px-4 py-3 text-left text-sm text-black transition-colors select-none hover:text-white"
								>
									<span class="font-semibold">{dialog.label}</span>
									<span class="text-xs leading-5 text-black/70 group-hover:text-white/80">
										{dialog.description}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
				{#each directFileDialogGroups as group (group.title)}
					<div class="flex flex-col gap-3">
						<span class="text-sm font-bold text-gray-300">{group.title}</span>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each group.dialogs as dialog (dialog.type)}
								<button
									onclick={() => showUploadDialog(dialog.type)}
									class="bg-base hover:bg-accent group flex min-h-[112px] cursor-pointer flex-col gap-2 rounded-lg px-4 py-3 text-left text-sm text-black transition-colors select-none hover:text-white"
								>
									<span class="font-semibold">{dialog.label}</span>
									<span class="text-xs leading-5 text-black/70 group-hover:text-white/80">
										{dialog.description}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
				{#each fileDialogGroups as group (group.title)}
					<div class="flex flex-col gap-3">
						<span class="text-sm font-bold text-gray-300">{group.title}</span>
						<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
							{#each group.groups as fileGroup (fileGroup.label)}
								<button
									onclick={async () => {
										showFormListDialog = false;
										await openFilteredFilePicker(fileGroup.accept);
									}}
									class="bg-base hover:bg-accent group flex min-h-[132px] cursor-pointer flex-col gap-2 rounded-lg px-4 py-3 text-left text-sm text-black transition-colors select-none hover:text-white"
								>
									<span class="font-semibold">{fileGroup.label}</span>
									<span class="text-xs leading-5 text-black/70 group-hover:text-white/80">
										{fileGroup.description}
									</span>
									<span class="text-[11px] leading-4 text-black/55 group-hover:text-white/65">
										対応拡張子: {fileGroup.extensions.join(' ')}
									</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.marquee-container {
		max-width: 100%;
		mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
	}

	.marquee-track {
		animation: marquee 50s linear infinite;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}
</style>
