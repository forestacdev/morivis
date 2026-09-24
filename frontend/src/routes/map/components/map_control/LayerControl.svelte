<script lang="ts">
	import Icon from '@iconify/svelte';

	interface Props {
		showLayerPane: boolean;
	}

	let { showLayerPane = $bindable() }: Props = $props();
</script>

<button
	onclick={(event) => {
		// 開閉ボタンのクリックをパネル外のクリックとして扱わせない。
		event.stopPropagation();
		showLayerPane = !showLayerPane;
	}}
	class="pointer-events-auto grid shrink-0 cursor-pointer place-items-center p-2 drop-shadow-lg"
>
	<Icon icon={'gis:layer-alt'} class="h-8 w-8 {showLayerPane ? 'text-accent' : 'text-base'}" />
</button>
