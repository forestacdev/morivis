<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fade } from 'svelte/transition';

	import { showLockOnScreen } from '$routes/store/effect';
</script>

{#if $showLockOnScreen}
	<div
		transition:fade={{ duration: 100 }}
		class="absolute bottom-0 z-30 flex h-full w-full items-center justify-center bg-black/50 pointer-events-none"
	>
		<div class='c-circle'>
            <div class='c-circle-child'>
        </div>
        </div>
	</div>
{/if}

<style>
    .c-circle {
        height: 90%;
        aspect-ratio: 1;
        border-radius: 50%;
        border: 4px solid rgba(255, 0, 0, 0.5);
        filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
       
        display: grid;
        place-items: center;
    
    }

   
</style>
