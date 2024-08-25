export const imageToflatArray = async (imageUrl: string) => {
	const img = new Image();
	img.crossOrigin = 'Anonymous';
	img.src = imageUrl;

	await new Promise((resolve) => {
		img.onload = resolve;
	});

	const canvas = document.createElement('canvas');
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx.drawImage(img, 0, 0);

	const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	return imageData.data;
};
