<script lang="ts">
	import { isBlocked } from '$routes/stores/ui';
</script>

{#if $isBlocked}
	<div class="absolute top-0 left-0 z-[9999] h-dvh w-full"></div>
{/if}
