const ICON_BASE_WIDTH = 60;
const ICON_ASPECT_RATIO = 70 / 60;
const ICON_SCALE = 1.7;

const ICON_CANVAS_WIDTH = Math.round(ICON_BASE_WIDTH * ICON_SCALE);
const ICON_CANVAS_HEIGHT = Math.round(ICON_CANVAS_WIDTH * ICON_ASPECT_RATIO);
const PHOTO_RADIUS = 40;
const PHOTO_CENTER_X = ICON_CANVAS_WIDTH / 2;
const PHOTO_CENTER_Y = 44;

const iconCanvas = new OffscreenCanvas(ICON_CANVAS_WIDTH, ICON_CANVAS_HEIGHT);
const context = iconCanvas.getContext('2d');

let frameImagePromise: Promise<ImageBitmap> | null = null;

const createFrameImage = async () => {
	const frameCanvas = new OffscreenCanvas(ICON_CANVAS_WIDTH, ICON_CANVAS_HEIGHT);
	const frameContext = frameCanvas.getContext('2d');

	if (!frameContext) {
		throw new Error('Failed to create frame canvas context');
	}

	frameContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);

	// drop shadow
	frameContext.save();
	frameContext.fillStyle = '#ffffff';
	frameContext.shadowColor = 'rgba(0, 0, 0, 0.18)';
	frameContext.shadowBlur = 8;
	frameContext.shadowOffsetY = 4;
	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS + 2, 0, Math.PI * 2);
	frameContext.fill();
	frameContext.beginPath();
	frameContext.moveTo(PHOTO_CENTER_X, 95);
	frameContext.lineTo(PHOTO_CENTER_X - 24, 72);
	frameContext.lineTo(PHOTO_CENTER_X + 24, 72);
	frameContext.closePath();
	frameContext.fill();
	frameContext.restore();

	// white pin frame
	frameContext.fillStyle = '#ffffff';
	frameContext.beginPath();
	frameContext.moveTo(PHOTO_CENTER_X, 95);
	frameContext.lineTo(PHOTO_CENTER_X - 24, 72);
	frameContext.lineTo(PHOTO_CENTER_X + 24, 72);
	frameContext.closePath();
	frameContext.fill();

	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS + 2, 0, Math.PI * 2);
	frameContext.fill();

	frameContext.save();
	frameContext.globalCompositeOperation = 'destination-out';
	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS - 1, 0, Math.PI * 2);
	frameContext.fill();
	frameContext.restore();

	// circle border
	frameContext.strokeStyle = '#ffffff';
	frameContext.lineWidth = 4;
	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS + 1, 0, Math.PI * 2);
	frameContext.stroke();

	return await createImageBitmap(frameCanvas);
};

const loadFrameImage = async () => {
	if (!frameImagePromise) {
		frameImagePromise = createFrameImage();
	}

	return frameImagePromise;
};

const drawCoverImage = (image: ImageBitmap) => {
	const sourceAspect = image.width / image.height;
	const targetDiameter = PHOTO_RADIUS * 2;
	const targetAspect = 1;

	let sourceWidth = image.width;
	let sourceHeight = image.height;
	let sourceX = 0;
	let sourceY = 0;

	if (sourceAspect > targetAspect) {
		sourceWidth = image.height * targetAspect;
		sourceX = (image.width - sourceWidth) / 2;
	} else {
		sourceHeight = image.width / targetAspect;
		sourceY = (image.height - sourceHeight) / 2;
	}

	context?.drawImage(
		image,
		sourceX,
		sourceY,
		sourceWidth,
		sourceHeight,
		PHOTO_CENTER_X - PHOTO_RADIUS,
		PHOTO_CENTER_Y - PHOTO_RADIUS,
		targetDiameter,
		targetDiameter
	);
};

self.onmessage = async (e) => {
	const { id, image } = e.data;
	try {
		if (!context) {
			console.error('Canvas 2D not supported');
			return;
		}

		const frameImage = await loadFrameImage();

			context.clearRect(0, 0, iconCanvas.width, iconCanvas.height);
		context.save();
		context.beginPath();
		context.arc(PHOTO_CENTER_X, PHOTO_CENTER_Y, PHOTO_RADIUS, 0, Math.PI * 2);
		context.closePath();
		context.clip();
		drawCoverImage(image);
		context.restore();
			context.drawImage(frameImage, 0, 0, iconCanvas.width, iconCanvas.height);

			self.postMessage({ id, imageBitmap: iconCanvas.transferToImageBitmap() });
	} catch (e) {
		console.error(e);
	}
};
