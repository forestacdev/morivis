<script lang="ts">
	import { onDestroy } from 'svelte';

	import type { MorivisLayerEntry } from '$routes/map/data/types';
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import type { CityGmlLod } from '$routes/map/utils/formats/citygml';
	import { cityGmlFilesToGeoJsonInWorker } from '$routes/map/utils/formats/citygml/analyze';
	import {
		createCityGmlEntry,
		createCityGml2DEntry
	} from '$routes/map/utils/formats/citygml/entry';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDataEntry: MorivisLayerEntry | null;
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let {
		showDataEntry = $bindable(),
		showDialogType = $bindable(),
		dropFile = $bindable()
	}: Props = $props();

	const files = $derived(toUploadFiles(dropFile));
	const defaultName = $derived(
		files.length === 1 ? files[0].name.replace(/\.[^.]+$/, '') : 'CityGML建物'
	);
	const totalSize = $derived(files.reduce((size, file) => size + file.size, 0));
	const fileSize = $derived(
		totalSize >= 1024 * 1024
			? `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
			: `${Math.max(1, Math.ceil(totalSize / 1024))} KB`
	);
	const lodOptions: { value: CityGmlLod; label: string }[] = [
		{ value: 'highest', label: '自動' },
		{ value: 0, label: 'LOD0' },
		{ value: 1, label: 'LOD1' },
		{ value: 2, label: 'LOD2' },
		{ value: 3, label: 'LOD3' },
		{ value: 4, label: 'LOD4' }
	];
	const renderOptions = [
		{ value: '3d', label: '3Dモデル' },
		{ value: '2d', label: '2D' }
	] as const;
	let renderMode = $state<'3d' | '2d'>('3d');
	let name = $state('');
	let lod = $state<CityGmlLod>('highest');
	let busy = $state(false);
	let errorMessage = $state('');
	let conversion: AbortController | null = null;

	onDestroy(() => conversion?.abort());

	const cancel = () => {
		conversion?.abort();
		dropFile = null;
		showDialogType = null;
	};

	const register = async () => {
		if (!files.length || busy) return;
		const controller = new AbortController();
		conversion?.abort();
		conversion = controller;
		const inputFiles = [...files];
		const entryName = name.trim() || defaultName;
		const mode = renderMode;
		busy = true;
		errorMessage = '';
		try {
			const result = await cityGmlFilesToGeoJsonInWorker(inputFiles, lod, controller.signal);
			if (controller.signal.aborted) return;
			const entry =
				mode === '2d'
					? await createCityGml2DEntry(entryName, result)
					: createCityGmlEntry(entryName, result);
			if (controller.signal.aborted) return;
			// 追加ドロップで入力が変わった場合、古い変換結果を登録しない。
			if (
				files.length !== inputFiles.length ||
				files.some((file, index) => file !== inputFiles[index])
			) {
				errorMessage = 'ファイルが変わりました。もう一度読み込んでください。';
				return;
			}
			showDataEntry = entry;
			showDialogType = null;
			dropFile = null;
			const skipped = result.skippedBuildingCount;
			showNotification(
				skipped > 0
					? `CityGMLを読み込みました。指定LODの面がない${skipped}件は除外しました。`
					: 'CityGMLを読み込みました',
				skipped > 0 ? 'warning' : 'success'
			);
		} catch (error) {
			if (!controller.signal.aborted) {
				errorMessage = error instanceof Error ? error.message : String(error);
			}
		} finally {
			if (conversion === controller) busy = false;
		}
	};
</script>

<header class="citygml-heading">
	<h2>CityGML</h2>
	<p>建物の形状を読み込む</p>
</header>

<form
	class="citygml-form"
	onsubmit={(event) => {
		event.preventDefault();
		void register();
	}}
	aria-busy={busy}
>
	<div class="c-scroll citygml-content">
		<div class="file-summary">
			<div class="file-info">
				<span class="file-type">GML</span>
				<div class="file-text">
					<p class="file-name" title={files.length === 1 ? files[0].name : undefined}>
						{files.length === 1
							? files[0].name
							: files.length
								? `${files.length}件のファイル`
								: 'ファイルを選択'}
					</p>
					<p class="file-meta">{files.length ? fileSize : '.gml / .xml / .citygml'}</p>
				</div>
			</div>
			<label class={['file-picker', busy && 'disabled']}>
				{files.length ? '変更' : '選択'}
				<input
					class="sr-only"
					type="file"
					accept=".gml,.xml,.citygml"
					multiple
					disabled={busy}
					aria-label="CityGMLファイルを選択"
					onchange={(event) => {
						dropFile = Array.from(event.currentTarget.files ?? []);
						errorMessage = '';
					}}
				/>
			</label>
		</div>

		<label class="name-field">
			<span>レイヤー名</span>
			<input bind:value={name} placeholder={defaultName} disabled={busy} />
		</label>

		<fieldset disabled={busy} class="option-field">
			<legend>読み込み方式</legend>
			<div class="render-options">
				{#each renderOptions as option (option.value)}
					<label class={['choice-option', renderMode === option.value && 'selected']}>
						<input
							class="sr-only"
							type="radio"
							name="citygml-render-mode"
							value={option.value}
							bind:group={renderMode}
						/>
						{option.label}
					</label>
				{/each}
			</div>
			<p class="option-hint">
				{renderMode === '3d'
					? '高さを保持して、建物を立体表示します。'
					: '高さを除いて、通常のポリゴンレイヤーとして読み込みます。'}
			</p>
		</fieldset>

		<fieldset disabled={busy} class="option-field">
			<legend>読み込むLOD</legend>
			<div class="lod-options">
				{#each lodOptions as option (option.value)}
					<label class={['choice-option', lod === option.value && 'selected']}>
						<input
							class="sr-only"
							type="radio"
							name="citygml-lod"
							value={option.value}
							bind:group={lod}
						/>
						{option.label}
					</label>
				{/each}
			</div>
			<p class="option-hint">
				{lod === 'highest'
					? '建物ごとに、含まれている最も詳細な形状を使います。'
					: `LOD${lod}の形状がある建物を読み込みます。`}
			</p>
		</fieldset>

		<details class="format-notes">
			<summary>対応範囲</summary>
			<p>
				CityGML 1.0 /
				2.0の建物・建物部分が対象です。経緯度と元の標高を使い、テクスチャ・ジオイド補正・外部ファイル参照には対応していません。
			</p>
		</details>
		{#if errorMessage}<p role="alert" class="error-message">{errorMessage}</p>{/if}
	</div>

	<footer class="citygml-actions">
		<span class="processing-status" role="status">{busy ? '建物の形状を変換しています…' : ''}</span>
		<div class="action-buttons">
			<button type="button" class="cancel-button" onclick={cancel}>キャンセル</button>
			<button type="submit" class="c-btn-confirm import-button" disabled={busy || !files.length}>
				{busy ? '読み込み中…' : '読み込む'}
			</button>
		</div>
	</footer>
</form>

<style>
	.citygml-heading {
		padding: 4px 4px 22px;
	}
	.citygml-heading h2 {
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.03em;
	}
	.citygml-heading p {
		margin-top: 4px;
		font-size: 13px;
		opacity: 0.6;
	}
	.citygml-form {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.citygml-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		overflow-y: auto;
		padding: 0 4px 20px;
		font-size: 14px;
	}
	.file-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		border-block: 1px solid #ffffff18;
		padding: 16px 0;
	}
	.file-info {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.file-type {
		flex-shrink: 0;
		border: 1px solid #ffffff30;
		border-radius: 6px;
		padding: 12px 7px;
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.file-text {
		min-width: 0;
	}
	.file-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}
	.file-meta {
		margin-top: 4px;
		font-size: 12px;
		opacity: 0.55;
	}
	.file-picker {
		flex-shrink: 0;
		padding: 8px;
		text-decoration: underline;
		text-underline-offset: 4px;
		cursor: pointer;
	}
	.name-field {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.name-field input {
		width: 100%;
		border: 1px solid #ffffff30;
		border-radius: 6px;
		background: #00000020;
		padding: 11px 12px;
		color: inherit;
	}
	.name-field input::placeholder {
		color: inherit;
		opacity: 0.45;
	}
	.option-field {
		min-width: 0;
	}
	.option-field legend {
		margin-bottom: 12px;
	}
	.render-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 6px;
	}
	.lod-options {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 6px;
	}
	.choice-option {
		cursor: pointer;
		border: 1px solid #ffffff25;
		border-radius: 6px;
		padding: 10px 0;
		text-align: center;
		font-size: 12px;
		transition:
			background 120ms,
			border-color 120ms;
	}
	.choice-option:hover {
		background: #ffffff0c;
	}
	.choice-option.selected {
		border-color: #90cdb5;
		background: #90cdb518;
		color: #b8e5d2;
	}
	.option-hint {
		margin-top: 10px;
		font-size: 12px;
		opacity: 0.6;
	}
	.format-notes {
		font-size: 12px;
		opacity: 0.65;
	}
	.format-notes summary {
		cursor: pointer;
	}
	.format-notes p {
		margin-top: 10px;
		line-height: 1.7;
	}
	.error-message {
		border-left: 2px solid #fca5a5;
		padding-left: 12px;
		color: #fca5a5;
		overflow-wrap: anywhere;
	}
	.citygml-actions {
		border-top: 1px solid #ffffff18;
		padding: 16px 4px 0;
	}
	.processing-status {
		display: block;
		font-size: 12px;
	}
	.processing-status:not(:empty) {
		margin-bottom: 12px;
	}
	.action-buttons {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 12px;
	}
	.cancel-button {
		padding: 10px 12px;
		font-size: 14px;
		opacity: 0.7;
	}
	.import-button {
		min-width: 132px;
		border-radius: 6px;
		padding: 11px 20px;
		font-size: 14px;
		font-weight: 600;
	}
	button,
	input {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	button:disabled,
	input:disabled,
	fieldset:disabled,
	.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	fieldset:disabled .choice-option {
		cursor: not-allowed;
	}
	.file-picker:focus-within,
	.choice-option:focus-within,
	input:focus-visible,
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid #90cdb5;
		outline-offset: 3px;
	}
	@media (max-width: 400px) {
		.lod-options {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
