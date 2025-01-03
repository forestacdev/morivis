<script lang="ts">
	// let left = $state<number>(100);
	// let top = $state<number>(100);

	let { children, left = 100, top = 100 } = $props();
	let tag = 'slot'; // 動的にタグを指定

	let moving = false;

	const onMouseDown = () => {
		moving = true;
	};

	const onMouseMove = (e: any) => {
		if (moving) {
			left += e.movementX;
			top += e.movementY;
		}
	};

	const onMouseUp = () => {
		moving = false;
	};
</script>

<!-- TODO:エラー -->
<section class="absolute z-10" style="left: {left}px; top: {top}px;">
	<div
		onmousedown={onMouseDown}
		role="button"
		tabindex="0"
		class="bg-base cursor-move select-none p-2 text-white"
	>
		on move
	</div>
	{@render children()}
</section>

<svelte:window onmouseup={onMouseUp} onmousemove={onMouseMove} />

<style>
</style>
