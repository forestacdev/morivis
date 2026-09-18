<script lang="ts">
	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import { mcaFileToGlbInWorker } from '$routes/map/utils/formats/mca/analyze';
	import { toUploadFiles } from '$routes/map/utils/upload-matchers-common';
	import { showNotification } from '$routes/stores/notification';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}
	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	const files = $derived(toUploadFiles(dropFile));
	const file = $derived(files.length === 1 && /\.mca$/i.test(files[0].name) ? files[0] : null);
	let minChunkX = $state<number | undefined>(0);
	let maxChunkX = $state<number | undefined>(31);
	let minChunkZ = $state<number | undefined>(0);
	let maxChunkZ = $state<number | undefined>(31);
	let activeFile = $state.raw<File | null>(null);
	let running = $state(false);
	const busy = $derived(running && activeFile === file);
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
		if (!file || busy) return;
		cancelConversion();
		activeFile = file;
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
		const input = file;
		const controller = new AbortController();
		conversion = controller;
		running = true;
		errorMessage = '';
		progress = '地形データを読み込み中…';
		try {
			const result = await mcaFileToGlbInWorker(
				input,
				{ minChunkX, maxChunkX, minChunkZ, maxChunkZ },
				controller.signal,
				(update) => {
					if (controller.signal.aborted) return;
					progress = `${update.stage === 'read' ? 'チャンクを読み込み中' : '3Dモデルを作成中'}（${update.completed.toLocaleString()} / ${update.total.toLocaleString()}）`;
				}
			);
			if (controller.signal.aborted || input !== file) return;
			dropFile = [
				new File([result.glb], input.name.replace(/\.mca$/i, '.glb'), { type: 'model/gltf-binary' })
			];
			showDialogType = 'model';
			showNotification(
				`${result.chunkCount.toLocaleString()}チャンクを読み込みました。モデルの配置位置と大きさを指定してください。`,
				'success'
			);
		} catch (error) {
			if (!controller.signal.aborted && input === file) {
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
		const observedFile = file;
		return () => {
			if (activeFile === observedFile) conversion?.abort();
		};
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">Minecraftの地形を読み込む</div>
<div class="c-scroll flex grow flex-col gap-4 overflow-y-auto p-2 text-sm">
	<p>
		Java版1.13以降のパレット形式に対応しています。gzip・zlib・非圧縮に対応し、LZ4と外部.mcc参照は対象外です。
	</p>
	<p>
		ワールドのregionフォルダにある.mcaファイルを1つ選んでください。entities・poiフォルダのファイルは対象外です。
	</p>
	<p>
		水やガラスを含むブロックを、色分けした不透明の立方体で表示します。テクスチャ、階段やフェンスなどの形状、エンティティは再現しません。
	</p>
	<label class="flex flex-col gap-2">
		<span>地形リージョン（.mca）</span>
		<input
			type="file"
			accept=".mca"
			onchange={(event) => {
				cancelConversion();
				dropFile = Array.from(event.currentTarget.files ?? []);
			}}
		/>
	</label>
	{#if file}<p class="break-all">{file.name}</p>{/if}
	{#if files.length && !file}<p role="alert" class="text-red-300">
			.mcaファイルを1つだけ選んでください。
		</p>{/if}
	<fieldset class="flex flex-col gap-3" disabled={busy}>
		<legend class="mb-2 font-bold">読み込むチャンク範囲</legend>
		<p>
			ファイル内のチャンク番号（0〜31）で指定します。初期値は全範囲です。大きな地形で読み込めない場合は範囲を狭めてください。
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
	<p>読み込み後、3Dモデルの画面で地図上の配置位置・向き・大きさを指定します。</p>
	{#if errorMessage && activeFile === file}<p role="alert" class="text-red-300">
			{errorMessage}
		</p>{/if}
	{#if busy}<p role="status">{progress}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-4">
	<button onclick={close} class="c-btn-sub p-4 text-lg">キャンセル</button>
	<button
		onclick={() => void read()}
		disabled={!file || busy}
		class="c-btn-confirm min-w-[160px] p-4 text-lg">{busy ? '読み込み中…' : '読み込む'}</button
	>
</div>
