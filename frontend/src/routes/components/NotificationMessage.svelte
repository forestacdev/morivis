<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	import { notificationMessage } from '$routes/store/notification';

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
					? 'bg-accent text-base'
					: value?.type === 'info'
						? 'bg-main text-base'
						: '';
	});

	onMount(() => {
		return () => {
			clearTimeout(timeoutId);
		};
	});
</script>

{#if $notificationMessage}
	<div
		transition:fly={{ duration: 300, y: -200 }}
		class="pointer-events-none absolute left-1/2 z-30 grid -translate-x-1/2 place-items-center rounded-lg p-2 shadow-md max-lg:top-2 max-lg:w-[calc(100%_-_10px)] lg:top-5 {bgcolor}"
	>
		{$notificationMessage.message}
	</div>
{/if}

<style>
</style>
