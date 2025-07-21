<script lang="ts">
	import { isBlocked } from '$routes/stores/ui';
</script>

{#if $isBlocked}
	<div class="absolute left-0 top-0 z-[9999] h-dvh w-full"></div>
{/if}
