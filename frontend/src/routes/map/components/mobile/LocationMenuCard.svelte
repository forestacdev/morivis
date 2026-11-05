<script lang="ts">
	import { Bottomsheet } from '@devantic/diaper';
	import type { Snippet } from 'svelte';

	import CloseIcon from '$lib/components/svgs/icons/material-symbols/CloseRoundedIcon.svelte';

	let { children, onclose }: { children: Snippet; onclose: () => void } = $props();
	let sheetRef = $state<ReturnType<typeof Bottomsheet> | null>(null);
	let open = $state(true);
	let currentSnap = $state(0.5);

	const toggleExpand = () => sheetRef?.snapTo(currentSnap === 0 ? 1 : 0);
</script>

<Bottomsheet
	bind:this={sheetRef}
	bind:open
	snapPoints={[0, 0.5, 1]}
	initialIndex={1}
	nonmodal
	canDragSheet
	flat
	{onclose}
	onsnap={(progress) => (currentSnap = progress)}
	style="background-color: var(--color-main); border-radius: 20px 20px 0 0; padding-top: 5px; z-index: 10; overflow-x: hidden; --diaper-duration: 0.3s; --diaper-shadow-color: rgba(0,0,0,0.25);"
>
	{#snippet header()}
		<button
			class="flex w-full cursor-pointer justify-center py-2"
			onclick={toggleExpand}
			aria-label="カードを展開/折りたたみ"
		>
			<div class="h-1.5 w-13 rounded-full bg-gray-400/50"></div>
		</button>
		<div class="text-base flex w-full items-center justify-between px-4 pb-2">
			<h2 class="text-[22px] font-bold">地点情報</h2>
			<button
				class="bg-base ml-2 cursor-pointer rounded-full p-2 shadow-md"
				onclick={onclose}
				aria-label="地点情報を閉じる"
			>
				<CloseIcon class="text-main h-5 w-5" />
			</button>
		</div>
	{/snippet}
	<div class="px-4 pb-4">{@render children()}</div>
</Bottomsheet>
