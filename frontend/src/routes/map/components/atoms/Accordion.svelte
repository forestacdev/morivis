<script lang="ts">
	import { slide } from 'svelte/transition';
	const handleClick = () => (value = !value);
	let { label, value = $bindable() }: { label: string; value: boolean | undefined } = $props();
</script>

<!-- <label class="flex flex-grow cursor-pointer gap-2">
	<span class="">{label}</span>
	<input type="checkbox" class="custom-checkbox" bind:checked={value} />
</label> -->

<div class="accordion">
	<label class="flex flex-grow cursor-pointer gap-2">
		<span class="">{label}</span>
		<input type="checkbox" class="custom-checkbox" bind:checked={value} />
	</label>

	{#if value}
		<div class="details" transition:slide>
			<slot name="details"></slot>
		</div>
	{/if}
</div>

<style>
	div.accordion {
		margin: 1rem 0;
	}

	div.header {
		display: flex;
		width: 100%;
	}

	div.header .text {
		flex: 1;
		margin-right: 5px;
	}

	div.details {
		background-color: #cecece;
		padding: 1rem;
	}
</style>
