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
	<input type="range" class="" bind:value {min} {max} {step} />
	<!-- <div bind:this={rangeElement}>{1900000}</div> -->
</div>

<style>
</style>
