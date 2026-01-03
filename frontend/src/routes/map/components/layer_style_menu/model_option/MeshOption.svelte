<script lang="ts">
	import type { MeshStyleEntry } from '$routes/map/data/types/model';
	import Switch from '$routes/map/components/atoms/Switch.svelte';
	import ColorPicker from '$routes/map/components/atoms/ColorPicker.svelte';

	interface Props {
		layerEntry: MeshStyleEntry;
		showColorOption: boolean;
	}

	let { layerEntry = $bindable(), showColorOption = $bindable() }: Props = $props();
</script>

<!-- <ColorPicker label="メッシュカラー" bind:value={layerEntry.style.color} /> -->
<div class="mt-8">
	<Switch label="ワイヤーフレーム表示" bind:value={layerEntry.style.wireframe} />
</div>

<style>
</style>
