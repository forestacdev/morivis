<script lang="ts">
	import gsap from 'gsap';
	import { onMount, unmount } from 'svelte';

	import { showLayerOptionId, isAnimation } from '$map/store';
	let {
		label,
		value = $bindable(),
		min = 0,
		max = 1,
		step = 0.01
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step: number;
	} = $props();

	// TODO: animation
	let rangeElement = $state<HTMLDivElement | null>(null);

	// onMount(() => {
	// 	// isAnimation.set(true);
	// 	if (!rangeElement) return;

	// 	showLayerOptionId.subscribe((id) => {
	// 		gsap.from(rangeElement, {
	// 			textContent: 0,
	// 			duration: 0.5,
	// 			ease: 'power2.out',
	// 			snap: { textContent: 1 },
	// 			stagger: 1,
	// 			onUpdate: (v) => {
	// 				if (rangeElement) {
	// 					console.log(v);
	// 				}
	// 			}
	// 		});
	// 	});
	// });
</script>

<div class="flex flex-col gap-2">
	<span class="">{label}: {value.toFixed(2)}</span>
	<input class="css-range" type="range" bind:value {min} {max} {step} />
	<!-- <div bind:this={rangeElement}>{1900000}</div> -->
</div>

<style>
	/* スライダー */
	.css-range {
		-webkit-appearance: none;
		appearance: none;
		outline: none;
		cursor: pointer;
		width: 95%;
		height: 3px;
	}

	/* スライダー バー */
	.css-range::-webkit-slider-runnable-track {
		background: rgb(1, 44, 7);

		height: 8px;
		border-radius: 8px;
	}

	/* スライダー つまみ */
	.css-range::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		height: 18px;
		width: 18px;
		margin-top: -5px; /* 位置の調整が必要 */
		background-color: #ffffff;
		border-radius: 50%;
		border: 3px solid rgb(0, 0, 0);
		transition: all 0.15s;
	}
	.css-range::-webkit-slider-thumb:hover {
		background-color: #ffffff;
		border: 3px solid #47d400;
	}
	.custom-shadow {
		box-shadow: 0 0 3px 0 rgba(0, 0, 0, 0.2);
	}
</style>
