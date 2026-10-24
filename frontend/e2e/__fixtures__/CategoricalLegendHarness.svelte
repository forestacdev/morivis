<script lang="ts">
	import CategoricalLegend from '../../src/routes/map/components/layer_style_menu/raster_option/CategoricalLegend.svelte';
	import { DEFAULT_RASTER_CATEGORICAL_STYLE } from '../../src/routes/map/data/entries/raster/_style';
	import type { RasterCategoricalStyle } from '../../src/routes/map/data/types/raster';

	const image =
		'data:image/svg+xml,' +
		encodeURIComponent(
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#123456"/></svg>'
		);
	const duplicateGroup = {
		name: 'test-group',
		urls: [image, image],
		labels: ['test-label', 'test-label']
	};
	const imageLegend = {
		type: 'image' as const,
		categories: [duplicateGroup, { ...duplicateGroup }]
	};
	let style = $state<RasterCategoricalStyle>({
		...DEFAULT_RASTER_CATEGORICAL_STYLE,
		legend: imageLegend
	});

	const showCategory = () => {
		style.legend = {
			type: 'category',
			name: 'test-category',
			colors: ['#123456', '#123456'],
			labels: ['test-color', 'test-color']
		};
	};
	const replaceImages = () => {
		style.legend = {
			type: 'image',
			categories: [{ name: 'test-updated', urls: [image], labels: ['test-new-label'] }]
		};
	};
</script>

<button onclick={showCategory}>test-category</button>
<button onclick={replaceImages}>test-replace</button>
<button onclick={() => (style.legend = imageLegend)}>test-images</button>
<CategoricalLegend {style} />
