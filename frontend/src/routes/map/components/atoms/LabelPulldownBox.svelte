<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import type { LabelsExpressions, Labels } from '$routes/map/data/types/vector/style';

	interface Props {
		labels: Labels;
		icon: string;
	}
	let { labels = $bindable(), icon }: Props = $props();
	let showPullDown = $state<boolean>(false);

	// セットされた式の設定
	let setLabel = $derived.by(() => {
		const target = labels.expressions.find((label) => label.key === labels.key);
		if (!target) return;
		return target;
	});

	// 式のリスト
	let labelsList = $derived.by(() => {
		return labels.expressions;
	});

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showPullDown && containerRef && !containerRef.contains(event.target as Node)) {
				showPullDown = false;
			}
		};

		if (showPullDown) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

{#if setLabel}
	<div bind:this={containerRef} class="relative py-2">
		<button
			onclick={() => (showPullDown = !showPullDown)}
			class="c-select flex w-full justify-between"
		>
			<div class="flex items-center gap-2">
				<Icon {icon} width={20} />

				<span> {labelsList.find((label) => label.key === setLabel.key)?.name}</span>
			</div>
			<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7" />
		</button>
		{#if showPullDown}
			<div
				transition:fly={{ duration: 200, y: -20 }}
				class="bg-sub absolute left-0 top-[60px] z-10 w-full divide-y divide-gray-400 overflow-hidden rounded-lg shadow-md"
			>
				{#each labelsList as labelItem (labelItem.key)}
					<label
						class="flex w-full cursor-pointer items-center justify-between gap-2 p-2 transition-colors duration-100 {labelItem.key ===
						labels.key
							? 'bg-base text-main'
							: 'hover:text-accent text-white'}"
					>
						<input
							type="radio"
							bind:group={labels.key}
							value={labelItem.key}
							class="hidden"
							onchange={() => (showPullDown = false)}
						/>
						<div class="flex items-center gap-2">
							<Icon icon={'ci:font'} width={20} />
							<span class="select-none">{labelItem.name}</span>
						</div>
					</label>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<style>
</style>
