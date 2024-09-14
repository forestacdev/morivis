<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import SvgTest from '$lib/svg/アカデミー施設/森のコテージ.svg';

	import LayerSlot from '$lib/components/ui/layermenu/LayerSlot.svelte';
	import DataMenu from '$lib/components/ui/DataMenu.svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { isSide, showDataMenu } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$lib/store/store';
	export let layerDataEntries: LayerEntry[] = [];

	let rotatingElement: HTMLElement;

	const tweenMe = (node: Node) => {
		let tl = gsap.timeline();
		const duration = 0.15; // アニメーションの長さを0.5秒に設定

		tl.from(node, {
			duration: duration,
			opacity: 0,
			x: '-100%', // 左から右へスライド
			ease: 'power2.out' // スムーズな動きのためのイージング
		});
		// tl.to(node, {
		// 	duration: duration,
		// 	rotation: 30, // 30度回転
		// 	transformOrigin: '0% 100%', // 左下を軸に回転
		// 	ease: 'power2.out' // アニメーションのイージング
		// 	// ここで、移動中の途中で回転が入る
		// }); // 最初

		return {
			duration: tl.totalDuration() * 1000, // ミリ秒に変換
			tick: (t: number) => {
				tl.progress(t);
			}
		};
	};

	const toggleDataMenu = () => {
		$showDataMenu = !$showDataMenu;
	};

	onMount(() => {});
</script>

{#if $isSide === 'layer'}
	<div
		transition:tweenMe
		class="custom bg-color-base absolute left-0 top-0 flex h-full flex-col rounded-sm bg-cover bg-no-repeat p-4 pl-[100px] text-slate-100"
	>
		<button on:click={toggleDataMenu}>データ追加</button>
		<div class="flex h-full gap-4">
			<div class="custom-scroll flex flex-col gap-y-2 overflow-y-auto">
				{#each layerDataEntries
					.filter((layerEntry) => $addedLayerIds.includes(layerEntry.id))
					.sort((a, b) => $addedLayerIds.indexOf(a.id) - $addedLayerIds.indexOf(b.id)) as layerEntry, index (layerEntry.id)}
					<div animate:flip={{ duration: 200 }} class="">
						<LayerSlot bind:layerEntry {index} />
					</div>
				{/each}
			</div>
			<!-- <DataMenu bind:layerDataEntries /> -->
		</div>
	</div>
{/if}

<style>
	.custom {
		/* transform: skewX(-5deg); */
	}
</style>
