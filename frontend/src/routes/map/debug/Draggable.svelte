<script lang="ts">
	// let left = $state<number>(100);
	// let top = $state<number>(100);
	let { left = 100, top = 100 } = $props();

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

<section class="absolute z-10" style="left: {left}px; top: {top}px;">
	<div onmousedown={onMouseDown} class="cursor-move select-none bg-slate-800 p-2 text-white">
		on move
	</div>
	<slot></slot>
</section>

<svelte:window onmouseup={onMouseUp} onmousemove={onMouseMove} />

<style>
</style>
