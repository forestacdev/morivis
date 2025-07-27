<script lang="ts">
	import Attribution from '$routes/map/components/footer/Attribution.svelte';
	import type { GeoDataEntry } from '$routes/map/data/types';
	import { mapStore } from '$routes/stores/map';
	import { isPc } from '$routes/map/utils/ui';

	let {
		layerEntries
	}: {
		layerEntries: GeoDataEntry[];
	} = $props();
</script>

<!-- <div class="pointer-events-none absolute bottom-0 left-0 h-[90px] w-full">
	<Attribution />
</div> -->

<style>
	.c-fog {
		--base-color: #000000; /* ベースカラーの定義 */
		background-image: linear-gradient(
			to top,
			color-mix(in srgb, var(--base-color) 90%, transparent),
			/* e6 は 90% */ color-mix(in srgb, var(--base-color) 89%, transparent) 8%,
			/* e3 は約 89% */ color-mix(in srgb, var(--base-color) 86%, transparent) 15.4%,
			/* db は約 86% */ color-mix(in srgb, var(--base-color) 80%, transparent) 22.3%,
			/* ce は約 80% */ color-mix(in srgb, var(--base-color) 74%, transparent) 28.7%,
			/* be は約 74% */ color-mix(in srgb, var(--base-color) 67%, transparent) 34.8%,
			/* ab は約 67% */ color-mix(in srgb, var(--base-color) 59%, transparent) 40.7%,
			/* 96 は約 59% */ color-mix(in srgb, var(--base-color) 50%, transparent),
			/* 80 は 50% */ color-mix(in srgb, var(--base-color) 41%, transparent) 52.1%,
			/* 69 は約 41% */ color-mix(in srgb, var(--base-color) 33%, transparent) 57.9%,
			/* 53 は約 33% */ color-mix(in srgb, var(--base-color) 24%, transparent) 63.9%,
			/* 3d は約 24% */ color-mix(in srgb, var(--base-color) 16%, transparent) 70.1%,
			/* 2a は約 16% */ color-mix(in srgb, var(--base-color) 10%, transparent) 76.7%,
			/* 1a は約 10% */ color-mix(in srgb, var(--base-color) 5%, transparent) 83.9%,
			/* 0c は約 5% */ color-mix(in srgb, var(--base-color) 2%, transparent) 91.6%,
			/* 04 は約 2% */ color-mix(in srgb, var(--base-color) 0%, transparent)
		);
	}
</style>
