<script lang="ts">
	import Accordion from '$routes/map/components/atoms/Accordion.svelte';
	import type { MeshEntry, MeshStyle } from '$routes/map/data/types/model';
	import { mapStore } from '$routes/stores/map';
	import { pmxMorphCatalogs } from '$routes/stores/pmx-morphs';

	let { layerEntry = $bindable() }: { layerEntry: MeshEntry<MeshStyle> } = $props();
	let open = $state(false);
	let search = $state('');
	const catalog = $derived($pmxMorphCatalogs[layerEntry.id]);
	const options = $derived(catalog?.options ?? []);
	const filtered = $derived(
		options.filter((option) =>
			option.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
		)
	);
	const weights = $derived(layerEntry.state?.pmxMorphWeights ?? {});
	const hasOverrides = $derived(Object.keys(weights).length > 0);

	const setWeight = (index: number, value: number | undefined) => {
		const next = { ...weights };
		if (value === undefined) delete next[index];
		else next[index] = Math.max(0, Math.min(1, value));
		layerEntry.state = { ...layerEntry.state, pmxMorphWeights: next };
	};
	const reset = () => {
		layerEntry.state = { ...layerEntry.state, pmxMorphWeights: {} };
	};
	$effect(() => {
		// 保存済みの値の復元や、別のメニューからの変更も描画に反映する。
		JSON.stringify(weights);
		mapStore.setPmxMorphState(layerEntry);
	});
</script>

<Accordion label="表情" icon="mdi:emoticon-outline" bind:value={open}>
	{#if !catalog}
		<p class="text-sm text-base" role="status">モデルの読み込み後に表情を表示します。</p>
	{:else if options.length === 0}
		<p class="text-sm text-base">調整できる表情モーフがありません。</p>
	{:else}
		<div class="flex flex-col gap-3 text-base">
			<button type="button" class="c-btn-sub w-full" disabled={!hasOverrides} onclick={reset}
				>表情をリセット</button
			>
			<input
				type="search"
				class="c-input w-full"
				aria-label="表情名で絞り込み"
				placeholder="表情名で絞り込み"
				bind:value={search}
			/>
			<div class="c-scroll flex max-h-80 flex-col gap-4 overflow-y-auto p-1">
				{#each filtered as option (option.index)}
					<div class="flex flex-col gap-1">
						<label class="flex flex-col gap-2">
							<span class="flex justify-between gap-2 text-sm"
								><span class="break-all">{option.name}</span><span class="shrink-0"
									>{weights[option.index] === undefined
										? '自動'
										: `${Math.round(weights[option.index] * 100)}%`}</span
								></span
							>
							<input
								type="range"
								class="w-full"
								style:accent-color="var(--color-main-accent)"
								min="0"
								max="100"
								step="1"
								aria-label={option.name}
								value={Math.round((weights[option.index] ?? 0) * 100)}
								oninput={(event) =>
									setWeight(option.index, Number(event.currentTarget.value) / 100)}
							/>
						</label>
						{#if weights[option.index] !== undefined}
							<button
								type="button"
								class="self-end text-xs underline"
								aria-label={`${option.name}を自動に戻す`}
								onclick={() => setWeight(option.index, undefined)}>自動に戻す</button
							>
						{/if}
					</div>
				{:else}<p class="text-sm">一致する表情がありません。</p>{/each}
			</div>
		</div>
	{/if}
	{#if catalog?.unsupportedCount}
		<p class="pt-3 text-xs">材質・UVなど、この操作に対応していないモーフは表示していません。</p>
	{/if}
</Accordion>
