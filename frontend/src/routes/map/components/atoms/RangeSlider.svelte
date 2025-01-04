<script lang="ts">
	import gsap from 'gsap';
	import { onMount, unmount } from 'svelte';
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

	let rangeElement = $state<HTMLInputElement | null>(null);

	onMount(() => {
		// スライダーを0から現在の値までアニメーション
		const initialValue = value;
		value = min; // 一旦値をリセット
		gsap.to(rangeElement, {
			duration: 0.3, // アニメーション時間
			value: initialValue, // 目標値を設定
			ease: 'power2.out', // イージング
			onUpdate: () => {
				// 手動でスライダーの表示を更新
				value = parseFloat(rangeElement?.value || '0');
			}
		});
	});

	// unmount(() => {
	// 	range = null;
	// });
</script>

<div class="flex flex-col gap-2">
	<span class="">{label}: {value.toFixed(2)}</span>
	<input type="range" class="" bind:value {min} {max} {step} bind:this={rangeElement} />
</div>

<style>
</style>
