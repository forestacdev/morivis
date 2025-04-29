<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';
	let { key, value } = $props();

	let isHover = $state<boolean>(false);

	// クリップボードにコピー
	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		alert(`クリップボードに ${text} をコピーしました`);
	};
</script>

<div class="flex flex-col items-start justify-center">
	<span class="text-base font-semibold">{key}</span>
	<button
		onclick={() => copyToClipboard(value)}
		onmouseover={() => (isHover = true)}
		onmouseleave={() => (isHover = false)}
		onfocus={() => (isHover = true)}
		onblur={() => (isHover = false)}
		class="text-accent flex w-full items-center justify-between rounded-md p-2 pl-4 text-left transition-colors duration-150 lg:hover:bg-gray-700"
		><span>{value}</span>
		{#if isHover}
			<div transition:fade={{ duration: 100 }} class="grid place-items-center">
				<Icon icon="majesticons:clipboard-line" class="mr-2 h-6 w-6 shrink-0 text-base" />
			</div>
		{/if}</button
	>
</div>
