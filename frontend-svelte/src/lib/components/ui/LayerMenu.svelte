<script lang="ts">
	import Icon from '@iconify/svelte';
	import gsap from 'gsap';
	import { onMount } from 'svelte';

	import LayerSlot from '$lib/components/ui/layermenu/LayerSlot.svelte';
	import DataMenu from '$lib/components/ui/DataMenu.svelte';
	import type { LayerEntry } from '$lib/data/types';
	import { isSide } from '$lib/store/store';
	import { flip } from 'svelte/animate';
	import { addedLayerIds } from '$lib/store/store';
	export let layerDataEntries: LayerEntry[] = [];

	let rotatingElement: HTMLElement;

	const moveLayerById = (e: CustomEvent) => {
		const { id, direction } = e.detail;
		// idに対応するアイテムのインデックスを取得
		let index = layerDataEntries.findIndex((item) => item.id === id);

		// インデックスが見つからない場合はそのまま配列を返す
		if (index === -1) return layerDataEntries;

		// 上に移動する場合
		if (direction === 'up' && index > 0) {
			// 前のアイテムと入れ替え
			[layerDataEntries[index - 1], layerDataEntries[index]] = [
				layerDataEntries[index],
				layerDataEntries[index - 1]
			];
		}

		// 下に移動する場合
		if (direction === 'down' && index < layerDataEntries.length - 1) {
			// 次のアイテムと入れ替え
			[layerDataEntries[index + 1], layerDataEntries[index]] = [
				layerDataEntries[index],
				layerDataEntries[index + 1]
			];
		}
	};

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

	onMount(() => {});
</script>

{#if $isSide === 'layer'}
	<div
		transition:tweenMe
		class="custom-scroll bg-color-base absolute left-0 top-0 flex h-full flex-col overflow-y-auto rounded-sm p-4 pl-[100px] text-slate-100"
	>
		<div class="flex gap-4">
			<div class="flex flex-col gap-y-2">
				{#each layerDataEntries.filter( (layerEntry) => $addedLayerIds.includes(layerEntry.id) ) as layerEntry, index (layerEntry.id)}
					<div animate:flip={{ duration: 200 }} class="">
						<LayerSlot bind:layerEntry {index} on:moveLayerById={moveLayerById} />
					</div>
				{/each}
			</div>
			<DataMenu bind:layerDataEntries />
			ssasas
		</div>
	</div>
{/if}

<style>
</style>
