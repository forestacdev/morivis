<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import DataSlot from '$routes/map/ui/datamenu/DataSlot.svelte';
	import type { LayerEntry } from '$routes/map/data/types';
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
	<div transition:tweenMe class="bg-red absolute z-20 h-full w-full p-8 pb-20">
		<div class="flex h-full flex-col bg-[#C27142]">
			<div class="flex-shrink-0 p-4 text-white">データを選択</div>
			<div
				class="custom-scroll grid h-full flex-grow gap-4 overflow-y-scroll p-4 text-white md:grid-cols-2"
			>
				{#each layerDataEntries as layerEntry (layerEntry.id)}
					<div animate:flip={{ duration: 200 }} class="">
						<DataSlot bind:layerEntry />
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
</style>
