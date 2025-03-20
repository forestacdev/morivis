<script lang="ts">
	import Draggable from '$routes/debug/Draggable.svelte';
	import GuiControl from '$routes/debug/GuiControl.svelte';
	import JsonEditor from '$routes/debug/JsonEditor.svelte';
	import { mapStore } from '$routes/store/map';
	import { DEBUG_MODE } from '$routes/store';

	let showDebugJsonEditor = $state<{
		value: boolean;
	}>({ value: false });
</script>

{#if $DEBUG_MODE}
	{#if showDebugJsonEditor.value}
		<Draggable left={0} top={0}>
			<JsonEditor map={mapStore.getMap()} />
		</Draggable>
	{/if}

	<GuiControl map={mapStore.getMap()} {showDebugJsonEditor} />
{/if}

<style>
</style>
