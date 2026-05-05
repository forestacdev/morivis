<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	export interface PulldownSelectItem {
		key: string;
		name: string;
		icon?: string;
	}

	interface Props {
		items: PulldownSelectItem[];
		selectedKey: string;
		children?: Snippet;
	}

	let { items, selectedKey = $bindable(), children }: Props = $props();
	let showPullDown = $state<boolean>(false);
	let containerRef = $state<HTMLElement>();
	let scrollContainerRef = $state<HTMLDivElement>();
	let showScrollContinueButton = $state<boolean>(false);

	let selectedItem = $derived(items.find((item) => item.key === selectedKey));

	const updateScrollContinueButton = () => {
		if (!scrollContainerRef || items.length <= 7) {
			showScrollContinueButton = false;
			return;
		}

		const remainingScroll =
			scrollContainerRef.scrollHeight -
			scrollContainerRef.scrollTop -
			scrollContainerRef.clientHeight;

		showScrollContinueButton = remainingScroll > 4;
	};

	const scrollToNextBlock = () => {
		if (!scrollContainerRef) return;

		const firstItem = scrollContainerRef.querySelector('label');
		const itemHeight = firstItem instanceof HTMLElement ? firstItem.offsetHeight + 4 : 44;

		scrollContainerRef.scrollBy({
			top: itemHeight,
			behavior: 'smooth'
		});
	};

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

	$effect(() => {
		if (!showPullDown) {
			showScrollContinueButton = false;
			return;
		}

		updateScrollContinueButton();
	});
</script>

{#if selectedItem}
	<div bind:this={containerRef} class="relative py-2 select-none">
		<button
			onclick={() => (showPullDown = !showPullDown)}
			class="border-sub flex w-full cursor-pointer items-center justify-between rounded-full border bg-black p-2 text-white transition-colors duration-150 lg:hover:bg-white lg:hover:text-black"
		>
			<div class="flex min-w-0 items-center gap-2 pl-1">
				{#if selectedItem.icon}
					<Icon icon={selectedItem.icon} width={20} class="shrink-0" />
				{/if}
				<span class="truncate">{selectedItem.name}</span>
			</div>
			<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7 shrink-0" />
		</button>
		{#if showPullDown}
			<div
				transition:fly={{ duration: 200, y: -20 }}
				class="pointer-events-none absolute top-[60px] z-10 flex w-full flex-col gap-2"
			>
				<div
					bind:this={scrollContainerRef}
					onscroll={updateScrollContinueButton}
					class="c-scroll-hidden bg-sub pointer-events-auto z-10 flex max-h-[265px] w-full flex-col gap-1 overflow-hidden overflow-y-auto rounded-[21.5px] px-0.5 py-0.5 shadow-md"
				>
					{#each items as item (item.key)}
						<label
							class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-full p-2 transition-colors duration-50 {item.key ===
							selectedKey
								? 'bg-base text-main'
								: 'hover:bg-base hover:text-main text-white'}"
						>
							<input
								type="radio"
								bind:group={selectedKey}
								value={item.key}
								class="hidden"
								onclick={() => (showPullDown = false)}
								onchange={() => (showPullDown = false)}
							/>
							<div class="flex min-w-0 items-center gap-2 pl-1">
								{#if item.icon}
									<Icon icon={item.icon} width={20} class="shrink-0" />
								{/if}
								<span class="truncate select-none">{item.name}</span>
							</div>
						</label>
					{/each}
				</div>
				{#if showScrollContinueButton}
					<div class="flex w-full items-center justify-center">
						<button
							class="border-sub bg-sub pointer-events-auto cursor-pointer rounded-full border px-3 text-sm text-white transition-colors duration-150 lg:hover:bg-white lg:hover:text-black"
							onclick={scrollToNextBlock}
						>
							<Icon icon="iconamoon:arrow-down-2-duotone" class="h-7 w-7 shrink-0" />
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="flex grow flex-col gap-2 overflow-visible pt-2">
			{@render children()}
		</div>
	{/if}
{/if}

