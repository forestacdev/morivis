<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	import TextForm from '$routes/map/components/atoms/TextForm.svelte';
	import type { DialogType } from '$routes/map/types';
	import {
		connectCsw,
		searchCswRecords,
		getCswRecord,
		getCswImportUrl,
		type CswService,
		type CswRecord,
		type CswSearchResult
	} from '$routes/map/utils/formats/csw';
	import { normalizeCswMapBounds } from '$routes/map/utils/formats/csw/ui';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		showDialogType: DialogType;
		remoteCswUrl: string | null;
		onimporturl: (url: string, signal: AbortSignal) => Promise<void>;
	}

	let { showDialogType = $bindable(), remoteCswUrl = $bindable(), onimporturl }: Props = $props();
	let url = $state('');
	let query = $state('');
	let useMapBounds = $state(false);
	let service = $state.raw<CswService | null>(null);
	let results = $state.raw<CswSearchResult | null>(null);
	let record = $state.raw<CswRecord | null>(null);
	let selectedId = $state('');
	let selectedLinkIndex = $state(0);
	let position = $state(1);
	let history = $state<number[]>([]);
	let busy = $state(false);
	let detailBusy = $state(false);
	let error = $state('');
	let detailError = $state('');
	let controller: AbortController | null = null;
	let detailController: AbortController | null = null;
	let lastSearch: { query: string; bbox?: [number, number, number, number] } = { query: '' };
	const importLinks = $derived(
		(record?.links ?? [])
			.flatMap((link) => {
				const importUrl = getCswImportUrl(link);
				return importUrl ? [{ ...link, importUrl }] : [];
			})
			.filter(
				(link, index, links) =>
					links.findIndex((other) => other.importUrl === link.importUrl) === index
			)
	);
	const externalLinks = $derived(
		(record?.links ?? []).filter(
			(link, index, links) =>
				/^https?:\/\//i.test(link.url) &&
				links.findIndex((other) => other.url === link.url && other.protocol === link.protocol) ===
					index
		)
	);
	const urlValid = $derived.by(() => {
		try {
			return ['http:', 'https:'].includes(new URL(url.trim()).protocol);
		} catch {
			return false;
		}
	});

	const message = (value: unknown) =>
		value instanceof Error ? value.message : 'カタログを読み込めませんでした。';

	const selectRecord = async (id: string) => {
		detailController?.abort();
		selectedId = id;
		record = results?.records.find((item) => item.id === id) ?? null;
		selectedLinkIndex = 0;
		detailError = '';
		detailBusy = false;
		if (!record || !service?.recordByIdUrl) return;
		const summary = record;
		const request = new AbortController();
		detailController = request;
		detailBusy = true;
		try {
			const detail = await getCswRecord(service, id, request.signal);
			if (!request.signal.aborted) {
				record = {
					...detail,
					abstract: detail.abstract || summary.abstract,
					bbox: detail.bbox ?? summary.bbox,
					links: [...summary.links, ...detail.links]
				};
			}
		} catch (cause) {
			if (!request.signal.aborted) detailError = `詳細の取得に失敗しました。${message(cause)}`;
		} finally {
			if (!request.signal.aborted) detailBusy = false;
		}
	};

	const search = async (startPosition = 1, pageHistory: number[] = [], newSearch = true) => {
		if (!service || busy) return;
		controller?.abort();
		detailController?.abort();
		detailBusy = false;
		const request = new AbortController();
		controller = request;
		busy = true;
		error = '';
		try {
			let searchOptions = lastSearch;
			if (newSearch) {
				const map = mapStore.getMap();
				if (useMapBounds && !map) throw new Error('地図の準備ができていません。');
				const bounds = useMapBounds ? map?.getBounds() : null;
				searchOptions = {
					query: query.trim(),
					...(bounds
						? {
								bbox: normalizeCswMapBounds([
									bounds.getWest(),
									bounds.getSouth(),
									bounds.getEast(),
									bounds.getNorth()
								])
							}
						: {})
				};
			}
			const found = await searchCswRecords(
				service,
				{ ...searchOptions, startPosition, pageSize: 20 },
				request.signal
			);
			if (request.signal.aborted) return;
			lastSearch = searchOptions;
			results = found;
			position = startPosition;
			history = pageHistory;
			void selectRecord(found.records[0]?.id ?? '');
		} catch (cause) {
			if (!request.signal.aborted) error = message(cause);
		} finally {
			if (!request.signal.aborted) busy = false;
		}
	};

	const connect = async () => {
		if (!urlValid || busy) return;
		const request = new AbortController();
		controller = request;
		busy = true;
		error = '';
		try {
			const connected = await connectCsw(url.trim(), request.signal);
			if (request.signal.aborted) return;
			service = connected;
			busy = false;
			await search();
		} catch (cause) {
			if (!request.signal.aborted) error = message(cause);
		} finally {
			if (!request.signal.aborted) busy = false;
		}
	};

	const register = async () => {
		const selected = importLinks[selectedLinkIndex];
		if (!selected || busy || detailBusy) return;
		const request = new AbortController();
		controller = request;
		busy = true;
		error = '';
		try {
			await onimporturl(selected.importUrl, request.signal);
		} catch (cause) {
			if (!request.signal.aborted) error = message(cause);
		} finally {
			if (!request.signal.aborted) busy = false;
		}
	};

	const disconnect = () => {
		controller?.abort();
		detailController?.abort();
		busy = false;
		detailBusy = false;
		service = null;
		results = null;
		record = null;
		error = '';
		detailError = '';
	};

	onMount(() => {
		if (!remoteCswUrl) return;
		url = remoteCswUrl;
		remoteCswUrl = null;
		void connect();
	});
	onDestroy(() => {
		controller?.abort();
		detailController?.abort();
	});
</script>

<div class="shrink-0 pb-4 text-2xl font-bold">CSW カタログ</div>
<div class="c-scroll flex min-h-0 w-full grow flex-col gap-4 overflow-y-auto">
	{#if !service}
		<TextForm bind:value={url} label="CSW URL" />
		<p class="text-sm">CSW 2.0.2のカタログを検索して、配信リンクからデータを読み込みます。</p>
	{:else}
		<p class="font-bold">{service.title || 'CSW カタログ'}</p>
		<form
			class="flex flex-col gap-3"
			onsubmit={(event) => {
				event.preventDefault();
				void search();
			}}
		>
			<TextForm bind:value={query} label="キーワード" />
			<div class="flex items-center justify-between gap-3">
				<label class="flex items-center gap-2 text-sm">
					<input type="checkbox" bind:checked={useMapBounds} disabled={busy} />
					現在の地図範囲で検索
				</label>
				<button type="submit" class="c-btn-confirm px-6 py-2 disabled:opacity-50" disabled={busy}
					>検索</button
				>
			</div>
		</form>
		{#if results}
			<div class="flex items-center justify-between gap-3 text-sm">
				<span
					>{results.matched.toLocaleString()}件{results.records.length
						? `中 ${position}〜${position + results.records.length - 1}件`
						: ''}</span
				>
				<div class="flex gap-2">
					<button
						class="c-btn-sub px-3 py-1 disabled:opacity-50"
						disabled={busy || !history.length}
						onclick={() => search(history[history.length - 1], history.slice(0, -1), false)}
						>前へ</button
					>
					<button
						class="c-btn-sub px-3 py-1 disabled:opacity-50"
						disabled={busy || results.nextRecord <= position}
						onclick={() => search(results?.nextRecord ?? 1, [...history, position], false)}
						>次へ</button
					>
				</div>
			</div>
			{#if results.records.length}
				<div class="flex flex-col gap-1">
					<label for="csw-record">検索結果</label>
					<select
						id="csw-record"
						class="bg-sub w-full rounded p-2"
						value={selectedId}
						disabled={busy}
						onchange={(event) => selectRecord(event.currentTarget.value)}
					>
						{#each results.records as item (item.id)}
							<option value={item.id}>{item.title || item.id}</option>
						{/each}
					</select>
				</div>
			{:else}
				<p>条件に一致するデータはありません。</p>
			{/if}
		{/if}
		{#if record}
			<div class="flex flex-col gap-2 text-sm">
				<p class="font-bold">{record.title}</p>
				{#if record.abstract}<p class="whitespace-pre-wrap break-words">{record.abstract}</p>{/if}
				{#if record.type}<p>種類: {record.type}</p>{/if}
				{#if record.modified}<p>更新日: {record.modified}</p>{/if}
				{#if record.subjects.length}<p>キーワード: {record.subjects.join('、')}</p>{/if}
				{#if record.bbox}<p>範囲（西・南・東・北）: {record.bbox.join(', ')}</p>{/if}
			</div>
			{#if detailBusy}<p role="status" class="text-sm">詳細を取得中…</p>{/if}
			{#if detailError}<p role="alert" class="text-sm text-amber-300">{detailError}</p>{/if}
			{#if importLinks.length}
				<div class="flex flex-col gap-1">
					<label for="csw-distribution">配信リンク</label>
					<select
						id="csw-distribution"
						class="bg-sub w-full rounded p-2"
						bind:value={selectedLinkIndex}
						disabled={busy || detailBusy}
					>
						{#each importLinks as link, index (link.importUrl)}
							<option value={index}>[{link.kind.toUpperCase()}] {link.title || link.url}</option>
						{/each}
					</select>
				</div>
			{:else if !detailBusy}
				<p class="text-sm">地図に追加できる配信リンクはありません。</p>
			{/if}
			{#if externalLinks.length}
				<details class="text-sm">
					<summary class="cursor-pointer">関連リンク</summary>
					<ul class="mt-2 flex flex-col gap-2">
						{#each externalLinks as link (link.url + link.protocol)}
							<li>
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="break-all underline">{link.title || link.url}</a
								>
							</li>
						{/each}
					</ul>
				</details>
			{/if}
		{/if}
	{/if}
	{#if busy}<p role="status" class="text-sm">読み込み中…</p>{/if}
	{#if error}<p role="alert" class="text-sm text-red-300">{error}</p>{/if}
</div>
<div class="flex shrink-0 justify-center gap-4 pt-3">
	{#if service}<button onclick={disconnect} class="c-btn-sub p-4 text-lg">戻る</button>{/if}
	<button
		onclick={() => {
			showDialogType = null;
		}}
		class="c-btn-sub p-4 text-lg">キャンセル</button
	>
	{#if service}
		<button
			onclick={register}
			disabled={busy || detailBusy || !importLinks[selectedLinkIndex]}
			class="c-btn-confirm min-w-[160px] p-4 text-lg disabled:opacity-50">登録</button
		>
	{:else}
		<button
			onclick={connect}
			disabled={busy || !urlValid}
			class="c-btn-confirm min-w-[200px] p-4 text-lg disabled:opacity-50">接続</button
		>
	{/if}
</div>
