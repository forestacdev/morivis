<script>
	import { tooltip } from '$routes/stores/tooltip';
</script>

{#if $tooltip.visible}
	<div class="bg-base absolute z-50" style="top: {$tooltip.y + 10}px;left: {$tooltip.x + 10}px;">
		{$tooltip.text}
	</div>
{/if}
