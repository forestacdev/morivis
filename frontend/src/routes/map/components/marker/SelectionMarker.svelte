<script lang="ts">
	import type { LngLat } from 'maplibre-gl';
	import { flip } from 'svelte/animate';
	import { fade, slide, fly } from 'svelte/transition';

	import LayerIcon from '$routes/map/components/atoms/LayerIcon.svelte';
	import type { GeoDataEntry } from '$map/data/types';

	let { lngLat }: { lngLat: LngLat } = $props();
</script>

<div class="pointer-events-none relative z-50 grid h-[100px] w-[100px] place-items-center">
	<div class="css-ripple-effect"></div>
	<div class="absolute h-[8px] w-[8px] rounded-full bg-white"></div>
</div>

<style>
	/* クリックできる要素 */

	/* エフェクト要素 */
	.css-ripple-effect {
		/* 値の変更はエフェクト形体・サイズ・スピードに影響する */
		width: 100px;
		height: 100px;
		background: #ffffff;

		/* 必須 */
		position: absolute;
		border-radius: 100%;
		pointer-events: none;
		transform: scale(0);
		opacity: 0;
		animation: ripple 0.75s ease-out;
	}

	/* アニメーションの定義 */
	@keyframes ripple {
		from {
			opacity: 1;
		}
		to {
			transform: scale(1.5);
			opacity: 0;
		}
	}
</style>
