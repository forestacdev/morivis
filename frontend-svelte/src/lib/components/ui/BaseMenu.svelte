<script lang="ts">
	import { BASEMAP_IMAGE_TILE } from '$lib/constants';
	import { fade, slide } from 'svelte/transition';
	export let backgroundIds: string[] = [];
	export let selectedBackgroundId: string = '';
	export let backgroundSources: { [_: string]: BaseMapEntry } = {};
	export let layerDataEntries: CategoryEntry[] = [];
	import { isSide } from '$lib/store/store';
	import { onMount } from 'svelte';
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';

	onMount(() => {});

	let selectedLayerEntry: LayerEntry | null = null;
	let selectedCategoryName: string | null = null;

	let scrollPosition = 0;

	function tweenMe(node: Node) {
		let tl = gsap.timeline();
		const duration = 0.5; // アニメーションの長さを0.5秒に設定

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
	}
</script>

{#if $isSide === 'base'}
	<div
		transition:tweenMe
		class="bg-color-base absolute h-screen w-full flex-col rounded p-4 text-slate-100 shadow-2xl"
	>
		<!-- <div class="block flex-shrink-0 p-4 text-lg font-semibold leading-6">ベースマップ</div> -->

		<div
			class="custom-scroll grid-row-8 ml-[100px] grid h-full max-w-[900px] grid-cols-3 gap-4 overflow-scroll p-2"
		>
			{#each backgroundIds as name, index (name)}
				<label
					class="relative h-[200px] w-[200px] cursor-pointer select-none items-center justify-start rounded-md bg-cover bg-center p-2 transition-all duration-200 {selectedBackgroundId ===
					name
						? 'custom-shadow'
						: 'custom-filter'}"
					style="background-image: url({backgroundSources[name].tiles[0]
						.replace('{z}', BASEMAP_IMAGE_TILE.Z.toString())
						.replace('{x}', BASEMAP_IMAGE_TILE.X.toString())
						.replace('{y}', BASEMAP_IMAGE_TILE.Y.toString())})"
				>
					<input
						type="radio"
						bind:group={selectedBackgroundId}
						value={name}
						class="invisible"
					/>{index}
					<span
						class=" {selectedBackgroundId === name
							? 'custom-text-shadow-active'
							: 'custom-text-shadow'}">{name}</span
					>
				</label>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* グロー効果 */
	.custom-shadow {
		--color: #0e8b00a3;
		box-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-filter {
		filter: brightness(0.8);
	}
	.custom-text-shadow {
		--color: #323232a3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}

	.custom-text-shadow-active {
		--color: #00780ea3;
		text-shadow:
			1px 1px 10px var(--color),
			-1px -1px 10px var(--color),
			-1px 1px 10px var(--color),
			1px -1px 10px var(--color),
			0px 1px 10px var(--color),
			0 -1px 10px var(--color),
			-1px 0 10px var(--color),
			1px 0 10px var(--color);
	}
</style>
