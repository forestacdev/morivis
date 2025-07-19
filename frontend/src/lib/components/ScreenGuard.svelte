<script lang="ts">
	import { isBlocked } from '$routes/stores/ui';

	let container = $state<HTMLElement | null>(null);
</script>

{#if $isBlocked}
	<div bind:this={container} class="z-[9999] h-dvh w-full bg-transparent"></div>
{/if}
