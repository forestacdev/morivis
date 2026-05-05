<script lang="ts">
	import type { StyleImage } from 'maplibre-gl';

	import type { SpritePatternId } from '$routes/map/data/types/vector/pattern';
	import { mapStore } from '$routes/stores/map';

	interface Props {
		pattern: string;
	}
	let { pattern }: Props = $props();

	const createIconImage = (imageData: StyleImage): string | null => {
		try {
			const { width, height, data } = imageData.data;

			if (!width || !height || !data) return null;
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return null;
			const arr = new Uint8ClampedArray(width * height * 4);
			for (let i = 0; i < arr.length; i++) arr[i] = data[i] || 0;
			ctx.putImageData(new ImageData(arr, width, height), 0, 0);
			return canvas.toDataURL('image/png');
		} catch {
			return null;
		}
	};

	let imageSrc = $derived.by(() => {
		const image = mapStore.getImage(pattern as SpritePatternId) as StyleImage;
		return createIconImage(image);
	});

	$inspect(imageSrc);
</script>

<div
	class="pointer-events-none absolute h-full w-full"
	style="background-image: url('{imageSrc}'); background-repeat: repeat; background-size: 8px; opacity: 0.5;"
></div>

<style>
</style>
