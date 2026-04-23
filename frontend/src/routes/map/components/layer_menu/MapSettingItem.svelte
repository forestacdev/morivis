<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';

	import { checkMobile, checkPc } from '$routes/map/utils/platform/viewport';
	import { selectedLayerId, isStyleEdit } from '$routes/stores';
	import { activeLayerIdsStore, reorderStatus } from '$routes/stores/layers';
	import { mapStore, type MapState } from '$routes/stores/map';
	import { isActiveMobileMenu, showDataMenu } from '$routes/stores/ui';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	let layerItemElement: HTMLDivElement;

	let isHovered = $state(false);
</script>

<div
	bind:this={layerItemElement}
	class="relative flex h-[50px] w-full items-center
		transition-colors"
	role="button"
	tabindex="0"
	aria-label="レイヤー"
>
	<!-- 縦棒 -->
	{#if !$isStyleEdit && !$showDataMenu}
		<div
			transition:slide={{ duration: 200, axis: 'x' }}
			class="relative flex h-full w-[50px] shrink-0 items-center justify-center"
		>
			<div class="bg-base/60 absolute top-0 h-full w-[2px]"></div>
			<div
				class="bg-base/60 absolute top-1/2 left-1/2 h-[1px] w-[10px] -translate-y-1/2 transition-[width] duration-150"
			></div>
		</div>
	{/if}

	<!-- レイヤーアイテム本体 -->
	<div
		class="transform-[width, transform, translate, scale, rotate, height border-color] relative flex w-full translate-z-0 justify-center p-2 select-none"
	>
		{@render children()}

		<!-- レイヤータイプ (データカタログ) -->
	</div>
</div>
