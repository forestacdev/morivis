<script lang="ts">
	export let label: string;
	export let value: number;
	export let min: number = 0;
	export let max: number = 1;
	export let step: number = 0.01;
</script>

<div class="flex flex-col gap-2">
	<span class="">{label}</span>
	<input type="range" class="" bind:value {min} {max} {step} />
</div>

<style>
</style>
