// map-worker.ts
import maplibregl from 'maplibre-gl';

self.onmessage = (event) => {
	const { canvas, width, height, style } = event.data;

	console.log('worker', canvas, width, height, style);

	const map = new maplibregl.Map({
		container: canvas,
		style: style
	});

	// マップが読み込まれたらメインスレッドに通知
	map.once('load', () => {
		self.postMessage({ type: 'load' });
	});
};
