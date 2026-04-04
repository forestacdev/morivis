<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import { notificationMessage } from '$routes/stores/notification';

	let timeoutId: ReturnType<typeof setTimeout>;
	let bgcolor = $state<string>('');

	notificationMessage.subscribe((value) => {
		if (value && !value.persistent) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				notificationMessage.set(null);
			}, 3000);
		}
		bgcolor =
			value?.type === 'error'
				? 'bg-red-500 text-base'
				: value?.type === 'success'
					? 'bg-[#348163] text-base'
					: value?.type === 'info'
						? 'bg-main text-base'
						: value?.type === 'warning'
							? 'bg-yellow-500 text-base'
							: 'bg-main text-base';
	});

	onMount(() => {
		return () => {
			clearTimeout(timeoutId);
		};
	});
</script>

{#if $notificationMessage?.type === 'add'}
	<div
		transition:fly={{ duration: 300, x: 200 }}
		class="pointer-events-none absolute top-[100px] right-0 z-30 flex items-center gap-2 overflow-hidden rounded-l-lg bg-black pr-6 shadow-md"
	>
		{#if $notificationMessage.entry}
			<div class="relative h-16 w-16 shrink-0 overflow-hidden">
				<LayerIcon layerEntry={$notificationMessage.entry} rounded={false} />
			</div>
		{/if}
		<span>データを追加しました</span>
	</div>
{:else if $notificationMessage}
	<div
		transition:fly={{ duration: 300, x: 200 }}
		class="pointer-events-none absolute top-[100px] right-0 z-30 grid place-items-center rounded-l-lg px-6 py-2 shadow-md {bgcolor}"
	>
		{$notificationMessage.message}
	</div>
{/if}

<style>
</style>
