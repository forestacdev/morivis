<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	import SvgTest from '$lib/svg/アカデミー施設/森のコテージ.svg';

	import LayerSlot from '$routes/map/ui/layermenu/LayerSlot.svelte';
	import DataMenu from '$routes/map/ui/DataMenu.svelte';
	import type { LayerEntry } from '$routes/map/data/types';
	import { isSide, showDataMenu } from '$routes/map/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$routes/map/store/store';
	export let layerDataEntries: LayerEntry[] = [];
	export let clickedLayerId: string;

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
		class="left-0 top-0 flex h-full flex-col rounded-sm bg-[#69A158] p-4 pb-[150px] pl-[100px] pt-[50px] text-slate-100"
	>
		<button on:click={toggleDataMenu}>データ追加</button>
		<div class="flex h-full w-full gap-4">
			<div class="custom-scroll flex flex-col gap-y-2 overflow-y-auto overflow-x-hidden">
				<div class="mt-4">レイヤーデータ</div>
				{#each layerDataEntries
					.filter((layerEntry) => $addedLayerIds.includes(layerEntry.id))
					.filter((layerEntry) => layerEntry.dataType === 'vector' || layerEntry.dataType === 'geojson')
					.sort((a, b) => $addedLayerIds.indexOf(a.id) - $addedLayerIds.indexOf(b.id)) as layerEntry, index (layerEntry.id)}
					<div animate:flip={{ duration: 200 }} class="">
						<LayerSlot bind:layerEntry {clickedLayerId} {index} />
					</div>
				{/each}
				<div class="mt-4">背景地図データ</div>
				{#each layerDataEntries
					.filter((layerEntry) => $addedLayerIds.includes(layerEntry.id))
					.filter((layerEntry) => layerEntry.dataType === 'raster' && !layerEntry.isOverVector)
					.sort((a, b) => $addedLayerIds.indexOf(a.id) - $addedLayerIds.indexOf(b.id)) as layerEntry, index (layerEntry.id)}
					<div animate:flip={{ duration: 200 }} class="">
						<LayerSlot bind:layerEntry {clickedLayerId} {index} />
					</div>
				{/each}
			</div>
			<!-- <DataMenu bind:layerDataEntries /> -->
		</div>
		<div class="custom-text">LAYER</div>
	</div>
{/if}

<style>
	.custom-text {
		position: absolute;
		transform: rotate(20deg);
		bottom: 10px;
		left: 10px;
		font-size: 4.5rem;
		font-weight: 700;
		color: #000;
	}
</style>
