<script lang="ts">
	import Icon from '@iconify/svelte';
	import { indexOf } from 'es-toolkit/compat';
	import gsap from 'gsap';
	import type { DataDrivenPropertyValueSpecification, ColorSpecification } from 'maplibre-gl';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	import { isSide, showDataMenu } from '$map/store';
	import { mapStore } from '$map/store/map';

	const toggleMenu = (key) => {
		if (key === $isSide) {
			isSide.set(null);
		} else {
			isSide.set(key);
		}
	};

	const toggleDataMenu = () => {
		showDataMenu.set(!$showDataMenu);
	};

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

{#if !$isSide}
	<div class="bg-main absolute z-10 flex h-full w-[80px] flex-col gap-2 p-2">
		<button class="bg-gray-200 p-2 text-left" onclick={() => toggleMenu('base')}>
			<Icon icon="ic:round-menu" class="h-8 w-8" />
		</button>

		<button class="w-full bg-gray-200 p-2 text-left" onclick={() => toggleMenu('layer')}>
			<Icon icon="ic:round-layers" class="h-8 w-8" />
		</button>
		<button class="w-full bg-gray-200 p-2 text-left" onclick={toggleDataMenu}>
			<Icon icon="material-symbols:data-saver-on-rounded" class="h-8 w-8" />
		</button>
	</div>
{/if}

<style>
</style>
