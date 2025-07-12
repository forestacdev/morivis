export const svgToPng = async (svgString: string, width: number, height: number) => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			try {
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject('Failed to get canvas context.');
					return;
				}
				ctx.drawImage(img, 0, 0, width, height);

				// PNGデータURLを返す
				resolve(canvas.toDataURL('image/png'));
			} catch (error) {
				if (error instanceof Error) {
					reject(`Failed to convert SVG to PNG: ${error.message}`);
				}
			}
		};
		img.onerror = () => reject('Failed to load SVG image.');
		img.src = svgString;
	});
};
