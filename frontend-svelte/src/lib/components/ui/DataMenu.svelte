<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import DataSlot from '$lib/components/ui/datamenu/DataSlot.svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { isSide, showDataMenu } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$lib/store/store';
	export let layerDataEntries: LayerEntry[] = [];

	const tweenMe = (node: Node) => {
		let tl = gsap.timeline();
		const duration = 0.15; // アニメーションの長さを0.5秒に設定

		tl.from(node, {
			duration: duration,
			opacity: 0,
			x: '100%', // 左から右へスライド

			ease: 'power2.out' // スムーズな動きのためのイージング
		});

		return {
			duration: tl.totalDuration() * 1000, // ミリ秒に変換
			tick: (t: number) => {
				tl.progress(t);
			}
		};
	};

	onMount(() => {});
</script>

{#if $showDataMenu}
	<div transition:tweenMe class="custom-scroll h-full w-1/2 overflow-scroll">
		データを選択
		<div class="right-[70px] grid-cols-3 gap-4 bg-black bg-opacity-70 p-4 text-white">
			{#each layerDataEntries.filter((layerEntry) => !$addedLayerIds.includes(layerEntry.id)) as layerEntry (layerEntry.id)}
				<div animate:flip={{ duration: 200 }} class="">
					<DataSlot bind:layerEntry />
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
</style>
