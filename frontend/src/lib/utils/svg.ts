export const createSVGPattern = (colors, size = 20) => {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('width', size);
	svg.setAttribute('height', size);

	colors.forEach((color, index) => {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', 0);
		rect.setAttribute('y', (index * size) / colors.length);
		rect.setAttribute('width', size);
		rect.setAttribute('height', size / colors.length);
		rect.setAttribute('fill', color);
		svg.appendChild(rect);
	});

	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.outerHTML)}`;
};

export const svgToPng = async (svgString, width, height) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'Anonymous'; // クロスオリジンリソースを扱うための設定
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				ctx.drawImage(img, 0, 0, width, height);

				// PNGデータURLを返す
				resolve(canvas.toDataURL('image/png'));
			} catch (error) {
				reject(`Failed to convert SVG to PNG: ${error.message}`);
			}
		};
		img.onerror = () => reject('Failed to load SVG image.');
		img.src = svgString;
	});
};
