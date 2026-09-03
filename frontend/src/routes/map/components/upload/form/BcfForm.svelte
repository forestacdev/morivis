<script lang="ts">
	import { untrack } from 'svelte';

	import type { DialogType, UploadFilesInput } from '$routes/map/types';
	import {
		BcfParseError,
		parseBcfFile,
		type BcfDocument,
		type BcfTopic
	} from '$routes/map/utils/formats/bcf';
	import { threeJsManager } from '$routes/map/utils/three/layer-manager';
	import { getFirstUploadFile } from '$routes/map/utils/upload-matchers-common';
	import { openBcfModelView, selectedLayerId } from '$routes/stores';
	import { showNotification } from '$routes/stores/notification';
	import { isProcessing } from '$routes/stores/ui';

	interface Props {
		showDialogType: DialogType;
		dropFile: UploadFilesInput;
	}

	let { showDialogType = $bindable(), dropFile = $bindable() }: Props = $props();
	let document = $state.raw<BcfDocument | null>(null);
	let activeTopicGuid = $state<string | null>(null);
	let isHighlighting = $state(false);
	let snapshotUrls = $state.raw<Record<string, string>>({});

	const bcfFile = $derived(getFirstUploadFile(dropFile));
	const fileKey = $derived(
		bcfFile ? `${bcfFile.name}:${bcfFile.size}:${bcfFile.lastModified}` : null
	);
	const activeTopic = $derived(
		document?.topics.find((topic) => topic.guid === activeTopicGuid) ?? document?.topics[0] ?? null
	);
	let parsedFileKey = $state<string | null>(null);

	const revokeSnapshotUrls = () => {
		Object.values(snapshotUrls).forEach((url) => URL.revokeObjectURL(url));
		snapshotUrls = {};
	};

	const createSnapshotUrls = (parsed: BcfDocument) => {
		revokeSnapshotUrls();
		const urls: Record<string, string> = {};
		parsed.topics.forEach((topic) => {
			topic.viewpoints.forEach((viewpoint, index) => {
				if (viewpoint.snapshot) urls[`${topic.guid}:${index}`] = URL.createObjectURL(viewpoint.snapshot);
			});
		});
		snapshotUrls = urls;
	};

	const highlightTopic = async (topic: BcfTopic): Promise<string[]> => {
		if (topic.selectionIfcGuids.length === 0) {
			showNotification('この課題には選択対象のIFC部材がありません', 'warning');
			return [];
		}

		isHighlighting = true;
		try {
			const entryIds = await threeJsManager.highlightIfcGlobalIds(topic.selectionIfcGuids);
			if (entryIds.length === 0) {
				showNotification('対象のIFC部材が読み込まれていません', 'warning');
				return [];
			}
			selectedLayerId.set(entryIds[0]);
			showNotification(`${topic.selectionIfcGuids.length}件の対象IFC部材をハイライトしました`, 'success');
			return entryIds;
		} catch (error) {
			console.error('BCFのIFC部材ハイライトに失敗しました', error);
			showNotification('BCFの対象IFC部材を特定できませんでした', 'error');
			return [];
		} finally {
			isHighlighting = false;
		}
	};

	const openTopicInModelView = async (topic: BcfTopic) => {
		const camera = topic.viewpoints.find((viewpoint) => viewpoint.camera)?.camera;
		if (!camera) {
			showNotification('この課題には復元可能なBCF視点がありません', 'warning');
			return;
		}
		const entryIds = await highlightTopic(topic);
		if (entryIds.length > 0) openBcfModelView(entryIds, camera);
	};

	const close = () => {
		revokeSnapshotUrls();
		dropFile = null;
		showDialogType = null;
	};

	$effect(() => {
		if (!bcfFile || !fileKey || parsedFileKey === fileKey) return;
		parsedFileKey = fileKey;
		document = null;
		activeTopicGuid = null;
		isProcessing.set(true);
		parseBcfFile(bcfFile)
			.then((parsed) => {
				document = parsed;
				activeTopicGuid = parsed.topics[0]?.guid ?? null;
				createSnapshotUrls(parsed);
				showNotification(`${parsed.topics.length}件のBCF課題を読み込みました`, 'success');
			})
			.catch((error) => {
				showNotification(
					error instanceof BcfParseError ? error.message : 'BCFファイルの読み込みに失敗しました',
					'error'
				);
				console.error('BCFの読み込みに失敗しました', error);
			})
			.finally(() => isProcessing.set(false));
	});

	$effect(() => {
		if (showDialogType !== 'bcf') return;
		untrack(() => {
			if (!dropFile) close();
		});
	});
</script>

<div class="flex min-h-0 grow flex-col">
	<header class="mb-3 flex shrink-0 items-center justify-between gap-3">
		<div>
			<h2 class="text-lg font-bold">BCF課題</h2>
			<p class="text-xs text-base/60">
				{document ? `BCF ${document.version ?? '不明'} / ${document.topics.length}件` : '読み込み中'}
			</p>
		</div>
		<button class="c-btn-cancel rounded-lg px-3 py-2 text-sm" onclick={close}>閉じる</button>
	</header>

	{#if document && activeTopic}
		<div class="grid min-h-0 grow grid-cols-[9rem_minmax(0,1fr)] gap-3">
			<nav class="c-scroll flex min-h-0 flex-col gap-2 overflow-y-auto pr-1" aria-label="BCF課題一覧">
				{#each document.topics as topic (topic.guid)}
					<button
						class={[
							'rounded-lg border p-3 text-left text-sm transition-colors',
							topic.guid === activeTopic.guid
								? 'border-accent bg-accent/20'
								: 'border-sub bg-sub/40 hover:border-accent/60'
						]}
						onclick={() => (activeTopicGuid = topic.guid)}
					>
						<span class="line-clamp-3 font-medium">{topic.title}</span>
						{#if topic.status}<span class="mt-2 block text-xs text-base/60">{topic.status}</span>{/if}
					</button>

					{#if activeTopic.viewpoints.some((viewpoint) => viewpoint.camera)}
						<button
							class="c-btn-cancel w-full rounded-lg p-3 text-sm disabled:opacity-50"
							disabled={isHighlighting || activeTopic.selectionIfcGuids.length === 0}
							onclick={() => openTopicInModelView(activeTopic)}
						>
							BCF視点でモデルビューを開く
						</button>
					{/if}
				{/each}
			</nav>

			<section class="c-scroll min-h-0 overflow-y-auto pr-1">
				<div class="flex flex-col gap-4 pb-4">
					<div>
						<h3 class="text-xl font-bold">{activeTopic.title}</h3>
						<div class="mt-2 flex flex-wrap gap-2 text-xs">
							{#if activeTopic.status}<span class="rounded bg-sub px-2 py-1">状態: {activeTopic.status}</span>{/if}
							{#if activeTopic.type}<span class="rounded bg-sub px-2 py-1">種別: {activeTopic.type}</span>{/if}
							{#if activeTopic.priority}<span class="rounded bg-sub px-2 py-1">優先度: {activeTopic.priority}</span>{/if}
						</div>
					</div>

					{#if activeTopic.description}
						<p class="whitespace-pre-wrap text-sm text-base/80">{activeTopic.description}</p>
					{/if}

					<button
						class="c-btn-confirm w-full rounded-lg p-3 text-sm disabled:opacity-50"
						disabled={isHighlighting || activeTopic.selectionIfcGuids.length === 0}
						onclick={() => highlightTopic(activeTopic)}
					>
						{isHighlighting
							? '対象部材を検索中'
							: `対象部材をまとめてハイライト (${activeTopic.selectionIfcGuids.length}件)`}
					</button>

					{#each activeTopic.viewpoints as viewpoint, index (`${activeTopic.guid}:${viewpoint.guid ?? index}`)}
						{#if snapshotUrls[`${activeTopic.guid}:${index}`]}
							<figure class="overflow-hidden rounded-lg border border-sub bg-black/10">
								<img src={snapshotUrls[`${activeTopic.guid}:${index}`]} alt={`${activeTopic.title} のBCFスナップショット`} class="h-auto w-full" />
								{#if viewpoint.camera}
									<figcaption class="px-3 py-2 text-xs text-base/60">
										{viewpoint.camera.type === 'orthographic' ? '平行投影' : '透視投影'}の視点
									</figcaption>
								{/if}
							</figure>
						{/if}
					{/each}

					{#if activeTopic.comments.length > 0}
						<div class="flex flex-col gap-2">
							<h4 class="text-sm font-medium">コメント</h4>
							{#each activeTopic.comments as comment, index (`${activeTopic.guid}:${comment.guid ?? index}`)}
								<article class="rounded-lg bg-sub/40 p-3 text-sm">
									{#if comment.author || comment.date}<p class="mb-1 text-xs text-base/60">{comment.author ?? '不明'} {comment.date ?? ''}</p>{/if}
									<p class="whitespace-pre-wrap">{comment.text}</p>
								</article>
							{/each}
						</div>
					{/if}

					{#if activeTopic.visibilityExceptionIfcGuids.length > 0}
						<details class="rounded-lg bg-sub/40 p-3 text-xs text-base/70">
							<summary class="cursor-pointer">表示条件の例外: {activeTopic.visibilityExceptionIfcGuids.length}件</summary>
							<p class="mt-2">BCFの視点で表示状態を補足する部材です。対象部材のハイライトには含めません。</p>
						</details>
					{/if}
				</div>
			</section>
		</div>
	{:else}
		<p class="py-8 text-center text-sm text-base/70">BCF課題を読み込んでいます</p>
	{/if}
</div>
