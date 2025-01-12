<script lang="ts">
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import { showLayerOptionId, isEdit, mapMode } from '$map/store';

	onMount(() => {
		// 初期のMapbox式を受け取り、オブジェクト形式に変換する
		// isSide.set('base');
	});
</script>

{#if $mapMode === 'style'}
	<div
		transition:fly={{ duration: 300, x: -100, opacity: 0 }}
		class="bg-main absolute z-10 flex h-full w-[300px] flex-col gap-2 p-2"
	>
		<div class="flex items-center justify-between">
			<span>レイヤー</span>
			<button onclick={() => mapMode.set('view')} class="bg-base rounded-full p-2">
				<Icon icon="material-symbols:close-rounded" class="text-main w-4] h-4" />
			</button>
		</div>
	</div>
{/if}

<style>
</style>
