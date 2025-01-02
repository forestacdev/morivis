<script setup lang="ts">
	export let label: string | null = null;
	export let value: number;
	export let min: number = 0;
	export let max: number = 1;
	export let step: number = 0.01;
</script>

<div class="flex flex-col gap-2">
	<label class="">{label}</label>
	<input type="range" class="custom-slider" bind:value {min} {max} {step} />
</div>

<style>
	.custom-number {
		width: 50px;
		height: 30px;
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		font-size: 14px;
		color: #000;
	}
</style>
