<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showNotification } from '$routes/stores/notification';
	let { key, value } = $props();

	let isHover = $state<boolean>(false);

	// クリップボードにコピー
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		showNotification(`クリップボードに ${text} をコピーしました`, 'info');
	};
</script>

<div class="flex flex-col items-start justify-center">
	<div class="flex items-center justify-center gap-1">
		<Icon icon="iconamoon:attention-circle-fill" class="h-5 w-5 shrink-0 text-base" />
		<span class="text-base font-semibold">{key}</span>
	</div>
	<div class="w-full p-2 pl-6">
		<button
			onclick={() => copyToClipboard(value)}
			onmouseover={() => (isHover = true)}
			onmouseleave={() => (isHover = false)}
			onfocus={() => (isHover = true)}
			onblur={() => (isHover = false)}
			class="text-accent relative flex w-full cursor-pointer items-center justify-between rounded-md bg-black p-2 pl-4 text-left transition-colors duration-150"
			><span>{value}</span>
			{#if isHover}
				<div transition:fade={{ duration: 100 }} class="absolute right-0 grid place-items-center">
					<Icon icon="majesticons:clipboard-line" class="mr-2 h-6 w-6 shrink-0 text-base" />
				</div>
			{/if}</button
		>
	</div>
</div>
