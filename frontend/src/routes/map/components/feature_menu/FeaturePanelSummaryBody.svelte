<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { ICONS } from '$lib/icons';
	import type { FeaturePanelSummary } from '$routes/map/types';

	interface Props {
		summary: FeaturePanelSummary;
	}

	let { summary }: Props = $props();
	let description = $derived(summary.description?.text.trim() ?? '');
	let protectionForestName = $derived(summary.protectionForestName?.trim() ?? '');
	let protectionForestDescription = $derived(summary.protectionForestDescription?.trim() ?? '');
	const formatDensity = (density: number | { min: number; max: number }) => {
		if (typeof density === 'number') return density.toFixed(3);
		return `${density.min.toFixed(3)} - ${density.max.toFixed(3)}`;
	};
</script>

<div in:fade={{ duration: 100 }} class="lg:pl-2">
	<div class="flex h-full w-full flex-col gap-2 lg:pr-2">
		{#if summary.point}
			<div class="flex flex-col gap-2 rounded-lg bg-black p-2">
				<div class="flex w-full justify-start gap-2">
					<Icon icon="lucide:map-pin" class="h-6 w-6 shrink-0 text-base" />
					<span class="text-accent"
						>{summary.point[1].toFixed(6)}, {summary.point[0].toFixed(6)}</span
					>
				</div>
			</div>
		{/if}

		<!-- {#if summary.description?.linkUrl}
			<div class="flex w-full items-center justify-center">
				<a
					class="c-btn-confirm mt-4 flex items-center justify-start gap-2 rounded-full p-2 px-4 select-none"
					href={summary.description.linkUrl}
					target="_blank"
					rel="noopener noreferrer"
					><Icon icon={ICONS.open} class="h-6 w-6" />
					<span>{summary.description.linkLabel ?? '詳細を見る'}</span></a
				>
			</div>
		{/if} -->

		{#if description}
			<div class="my-2">
				<span class="text-justify text-base whitespace-pre-line">{description}</span>
				{#if summary.description?.credit || summary.description?.licenseName || summary.description?.linkUrl}
					<div class="mt-1 text-xs text-gray-400">
						{#if summary.description?.credit}
							<span>{summary.description.credit}</span>
						{/if}
						{#if summary.description?.licenseName}
							{#if summary.description?.credit}
								<span class="mx-1">/</span>
							{/if}
							{#if summary.description?.licenseUrl}
								<a
									href={summary.description.licenseUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-accent hover:underline"
								>
									{summary.description.licenseName}
								</a>
							{:else}
								<span>{summary.description.licenseName}</span>
							{/if}
						{/if}
						{#if summary.description?.linkUrl}
							<a
								href={summary.description.linkUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent ml-1 hover:underline"
							>
								{summary.description.linkLabel ?? '詳細を見る'}
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- リンネ式階層分類体系 -->
		{#if summary.taxonomy && summary.taxonomy.length > 0}
			<div class="bg-sub flex flex-col gap-2 rounded-lg p-3 py-2">
				<span class="text-base">分類</span>
				<div class="flex flex-col gap-1 text-sm">
					{#each summary.taxonomy as item (item.label)}
						<div class="flex items-center gap-2">
							<div
								class="bg-base grid aspect-square w-[22px] place-items-center rounded-full text-black"
							>
								<span>{item.label}</span>
							</div>
							<div class="text-base break-all">{item.value}</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- TODO 保安林の説明があってるか確認 -->
		{#if protectionForestDescription}
			<div class="bg-sub mt-2 flex flex-col gap-2 rounded-lg p-3">
				<span class="text-base">{'保安林の種類'}</span>
				<div class="flex items-center justify-center p-2">
					<span class="bg-base self-start rounded-full px-4 py-2 text-gray-900"
						>{protectionForestName}</span
					>
				</div>
				<span class="text-justify text-base whitespace-pre-line">
					{protectionForestDescription}
				</span>
			</div>
		{/if}

		<!-- 木材の情報 -->
		{#if summary.timberSpecies}
			<div class="bg-sub mt-2 flex flex-col gap-2 rounded-lg p-3 py-2">
				<span class="text-base">木材</span>
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-center gap-4">
						<div
							class="flex h-[250px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-black"
						>
							<img
								in:fade={{ duration: 200 }}
								src={summary.timberSpecies.url}
								alt="木材の画像"
								class="object-cover"
							/>
						</div>
					</div>
					{#if summary.timberSpecies.summary}
						<div class="text-base leading-relaxed">{summary.timberSpecies.summary}</div>
					{/if}
					{#if summary.timberSpecies.airDryDensity || summary.timberSpecies.woodStructure || summary.timberSpecies.hardness}
						<div class="grid gap-2 text-sm text-gray-900 lg:grid-cols-3">
							{#if summary.timberSpecies.airDryDensity}
								<div class="rounded border">
									<div class="bg-base p-1">気乾比重</div>
									<div class="p-2 text-center text-base">
										{formatDensity(summary.timberSpecies.airDryDensity)}
									</div>
								</div>
							{/if}
							{#if summary.timberSpecies.woodStructure}
								<div class="rounded border">
									<div class="bg-base p-1">材の構造</div>
									<div class="p-2 text-center text-base">{summary.timberSpecies.woodStructure}</div>
								</div>
							{/if}
							{#if summary.timberSpecies.hardness}
								<div class="rounded border">
									<div class="bg-base p-1">硬さ</div>
									<div class="p-2 text-center text-base">{summary.timberSpecies.hardness}</div>
								</div>
							{/if}
						</div>
					{/if}

					{#if summary.timberSpecies.characteristics && summary.timberSpecies.characteristics.length > 0}
						<div class="flex flex-col gap-2">
							<div class="text-base text-sm">特徴</div>
							<div class="flex flex-wrap gap-2">
								{#each summary.timberSpecies.characteristics as item (item)}
									<span class="bg-base rounded-full px-3 py-1 text-sm">{item}</span>
								{/each}
							</div>
						</div>
					{/if}
					{#if summary.timberSpecies.uses && summary.timberSpecies.uses.length > 0}
						<div class="flex flex-col gap-2">
							<div class="text-base text-sm">用途</div>
							<div class="flex flex-wrap gap-2">
								{#each summary.timberSpecies.uses as item (item)}
									<span class="bg-base rounded-full px-3 py-1 text-sm">{item}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
