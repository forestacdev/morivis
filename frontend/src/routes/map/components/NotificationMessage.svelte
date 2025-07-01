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

{#if $notificationMessage}
	<div
		transition:fly={{ duration: 300, x: 200 }}
		class="pointer-events-none absolute right-0 top-[90px] z-30 grid place-items-center rounded-l-full px-6 py-2 shadow-md {bgcolor}"
	>
		{$notificationMessage.message}
	</div>
{/if}

<style>
</style>
