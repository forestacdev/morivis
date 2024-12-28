<script setup lang="ts">
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	export let feature: any;
	import { showlayerOptionId } from '$routes/map/store/store';

	showlayerOptionId.subscribe((value) => {
		if (value) {
			feature = null;
		}
	});

	function tweenMe(node: Node) {
		let tl = gsap.timeline();
		const duration = 0; // アニメーションの長さを0.5秒に設定

		tl.from(node, {
			duration: duration,
			opacity: 0,
			height: 0,
			// 左から右へスライド
			scale: 1.5,
			ease: 'power2.out' // スムーズな動きのためのイージング
		});

		tl.to(node, {
			duration: duration,
			scale: 1,
			ease: 'power2.out'
		});

		return {
			duration: tl.totalDuration() * 1000, // ミリ秒に変換
			tick: (t: number) => {
				tl.progress(t);
			}
		};
	}

	// $: console.log(feature);
</script>

<!-- <div class="flex max-w-md flex-col gap-4 p-3"></div> -->
{#if feature}
	<div
		transition:tweenMe
		class="bg-color-base menu-in custom-scroll flex h-[600px] flex-col gap-4 overflow-y-auto overflow-x-hidden p-3 text-slate-100 transition-all duration-150"
	>
		{#if feature}
			{#if feature.properties['image']}
				<div class="flex gap-2">
					<img src={feature.properties['image']} alt="image" />
				</div>
			{/if}
			{#each Object.keys(feature.properties) as key}
				<div class="flex gap-2">
					<span>{key}</span>
					<span>{feature.properties[key]}</span>
				</div>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.menu-in {
		/* transform: rotateY(-15deg); */
	}
</style>
