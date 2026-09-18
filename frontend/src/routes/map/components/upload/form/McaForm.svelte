<script lang="ts">
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { mcaFilesToGlbInWorker } from '$routes/map/utils/formats/mca/analyze';
	import { validateMcaFileSet } from '$routes/map/utils/formats/mca/batch';
	import { createMcaModelFile } from '$routes/map/utils/formats/mca/model-file';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	const fileSetError = $derived.by(() => {
		if (!files.length) return null;
		try {
			validateMcaFileSet(files);
			return null;
		} catch (error) {
			return error instanceof Error ? error.message : '地形リージョンを選び直してください。';
		}
	});
	let minChunkX = $state<number | undefined>(0);
	let maxChunkX = $state<number | undefined>(31);
	let minChunkZ = $state<number | undefined>(0);
	let maxChunkZ = $state<number | undefined>(31);
	let activeFiles = $state.raw<File[] | null>(null);
	let running = $state(false);
	const busy = $derived(running && activeFiles === files);
	let errorMessage = $state('');
	let progress = $state('');
	let conversion: AbortController | null = null;

	const cancelConversion = () => {
		conversion?.abort();
		conversion = null;
		running = false;
	};
	const close = () => {
		cancelConversion();
		dropFile = null;
		showDialogType = null;
	};
	const read = async () => {
		if (!files.length || fileSetError || busy) return;
		cancelConversion();
		activeFiles = files;
		errorMessage = '';
		if (
			minChunkX === undefined ||
			maxChunkX === undefined ||
			minChunkZ === undefined ||
			maxChunkZ === undefined ||
			![minChunkX, maxChunkX, minChunkZ, maxChunkZ].every(
				(value) => Number.isInteger(value) && value >= 0 && value <= 31
			) ||
			minChunkX > maxChunkX ||
			minChunkZ > maxChunkZ
		) {
			errorMessage = 'チャンク番号は0〜31の整数で、開始が終了以下になるように指定してください。';
			return;
		}
		const input = files;
		const controller = new AbortController();
		conversion = controller;
		running = true;
		errorMessage = '';
		progress = '地形データを読み込み中…';
		try {
			const result = await mcaFilesToGlbInWorker(
				input,
				{
					minChunkX,
					maxChunkX,
					minChunkZ,
					maxChunkZ
				},
				controller.signal,
				(update) => {
					if (controller.signal.aborted || input !== files) return;
					const fileProgress = update.fileName
						? `${update.fileIndex ?? 1} / ${update.fileCount ?? input.length}ファイル: ${update.fileName} — `
						: '';
					progress = `${fileProgress}${update.stage === 'read' ? 'チャンクを読み込み中' : '3Dモデルを作成中'}（${update.completed.toLocaleString()} / ${update.total.toLocaleString()}）`;
				}
			);
			if (controller.signal.aborted || input !== files) return;
			dropFile = [
				createMcaModelFile(
					result.glb,
					input.map((file) => file.name)
				)
			];
			showDialogType = 'model';
			showNotification(
				`${input.length}リージョン、${result.chunkCount.toLocaleString()}チャンクを1つのレイヤーに読み込みました。地図上でワールド原点と1ブロックの長さを設定してください。`,
				'success'
			);
		} catch (error) {
			if (!controller.signal.aborted && input === files) {
				errorMessage =
					error instanceof Error ? error.message : 'Minecraftの地形データを読み込めませんでした。';
			}
		} finally {
			if (conversion === controller) {
				conversion = null;
				running = false;
			}
		}
	};
	// 外部ドロップによるファイル差し替えと、ダイアログ破棄時にWorkerを終了する。
	$effect(() => {
		const observedFiles = files;
		return () => {
			if (activeFiles === observedFiles) conversion?.abort();
		};
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">Minecraftの地形を読み込む</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>
		Java版1.13以降のパレット形式に対応しています。gzip・zlib・非圧縮に対応し、LZ4と外部.mcc参照は対象外です。
	</p>
	<p>
		同じワールドのregionフォルダにある.mcaファイルを選んでください。複数選択できます。entities・poiフォルダのファイルは対象外です。
	</p>
	<p>
		水やガラスを含むブロックを、色分けした不透明の立方体で表示します。テクスチャ、階段やフェンスなどの形状、エンティティは再現しません。
	</p>
	<label class="flex flex-col gap-2">
		<span>地形リージョン（.mca）</span>
		<input
			type="file"
			accept=".mca"
			multiple
			disabled={busy}
			onchange={(event) => {
				cancelConversion();
				dropFile = Array.from(event.currentTarget.files ?? []);
			}}
		/>
	</label>
	{#if files.length}
		<p>{files.length}ファイルを選択中</p>
		<ul class="max-h-40 overflow-y-auto break-all">
			{#each files as file (file)}<li>{file.name}</li>{/each}
		</ul>
	{/if}
	{#if fileSetError}<p role="alert" class="text-red-300">{fileSetError}</p>{/if}
	<p>
		すべてのリージョンを元の位置関係を保った1つのレイヤーにまとめます。読み込み後、ワールド原点と1ブロックの長さを一度設定して一括配置します。
	</p>
	<fieldset class="flex flex-col gap-3" disabled={busy}>
		<legend class="mb-2 font-bold">読み込むチャンク範囲</legend>
		<p>
			各ファイル内のチャンク番号（0〜31）で指定し、同じ範囲をすべてのファイルに適用します。初期値は全範囲です。大きな地形で読み込めない場合は範囲を狭めてください。
		</p>
		<div class="grid grid-cols-2 gap-3">
			<label class="flex flex-col gap-1"
				><span>X 開始</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={minChunkX}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>X 終了</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={maxChunkX}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>Z 開始</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={minChunkZ}
				/></label
			>
			<label class="flex flex-col gap-1"
				><span>Z 終了</span><input
					class="c-input w-full"
					type="number"
					min="0"
					max="31"
					step="1"
					bind:value={maxChunkZ}
				/></label
			>
		</div>
	</fieldset>

	{#if errorMessage && activeFiles === files}<p role="alert" class="text-red-300">
			{errorMessage}
		</p>{/if}
	{#if busy}<p role="status">{progress}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={close} class="c-btn-sub p-4 text-lg">キャンセル</button>
	<button
		onclick={() => void read()}
		disabled={!files.length || !!fileSetError || busy}
		class="c-btn-confirm min-w-[160px] p-4 text-lg">{busy ? '読み込み中…' : '読み込む'}</button
	>
</div>
