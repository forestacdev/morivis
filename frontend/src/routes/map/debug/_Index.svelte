<script lang="ts">
	import Draggable from '$map/debug/Draggable.svelte';
	import GuiControl from '$map/debug/GuiControl.svelte';
	import JsonEditor from '$map/debug/JsonEditor.svelte';
	import { mapStore } from '$map/store/map';
	import { DEBUG_MODE } from '$routes/map/store';

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
