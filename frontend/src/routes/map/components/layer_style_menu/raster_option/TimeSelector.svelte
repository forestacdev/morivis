<script lang="ts">
	import emblaCarouselSvelte from 'embla-carousel-svelte';

	import Accordion from '../../atoms/Accordion.svelte';

	import type { BaseRasterStyle } from '$routes/map/data/types/raster';

	interface Props {
		style: BaseRasterStyle;
	}

	let { style = $bindable() }: Props = $props();

	let showTimeOption = $state(false);
</script>

{#if style.timeDimension}
	<Accordion label={'時間ステップ'} icon={'mdi:clock-outline'} bind:value={showTimeOption}>
		<div class="flex flex-col gap-2 p-2">
			<select
				bind:value={style.timeDimension.currentIndex}
				class="bg-sub rounded border border-gray-600 p-2 text-white"
			>
				{#each style.timeDimension.values as timeValue, i}
					<option value={i}>{timeValue}</option>
				{/each}
			</select>
			<div class="text-xs text-gray-400">
				{style.timeDimension.values.length}件のステップ
			</div>
		</div>
	</Accordion>
{/if}
