const ICON_BASE_WIDTH = 60;
const ICON_ASPECT_RATIO = 70 / 60;
const ICON_SCALE = 1.7;
const TAIL_TOP_WIDTH = 30;
const TAIL_HEIGHT = 23;
const TAIL_TIP_RADIUS = 3;
const TOP_TRIM = 8;

const ICON_CANVAS_WIDTH = Math.round(ICON_BASE_WIDTH * ICON_SCALE);
const ICON_CANVAS_HEIGHT = Math.round(ICON_CANVAS_WIDTH * ICON_ASPECT_RATIO) - TOP_TRIM;
const PHOTO_RADIUS = 40;
const PHOTO_CENTER_X = ICON_CANVAS_WIDTH / 2;
const TAIL_TIP_Y = ICON_CANVAS_HEIGHT;
const PHOTO_CENTER_Y = 60 - TOP_TRIM;
const TAIL_OVERLAP = 10;
const TAIL_TOP_Y = PHOTO_CENTER_Y + PHOTO_RADIUS - TAIL_OVERLAP;
const DEBUG_RED_BACKGROUND = false;

const iconCanvas = new OffscreenCanvas(ICON_CANVAS_WIDTH, ICON_CANVAS_HEIGHT);
const context = iconCanvas.getContext('2d');

let frameImagePromise: Promise<ImageBitmap> | null = null;

type WarmupWorkerMessage = {
	type: 'warmup';
};

type RenderWorkerMessage = {
	type: 'render';
	id: string;
	image: ImageBitmap;
};

const createFrameImage = async () => {
	const frameCanvas = new OffscreenCanvas(ICON_CANVAS_WIDTH, ICON_CANVAS_HEIGHT);
	const frameContext = frameCanvas.getContext('2d');

	if (!frameContext) {
		throw new Error('Failed to create frame canvas context');
	}

	frameContext.clearRect(0, 0, frameCanvas.width, frameCanvas.height);

	if (DEBUG_RED_BACKGROUND) {
		frameContext.fillStyle = '#ff0000';
		frameContext.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
	}

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
	frameContext.moveTo(PHOTO_CENTER_X, TAIL_TIP_Y);
	frameContext.lineTo(PHOTO_CENTER_X - TAIL_TOP_WIDTH, TAIL_TOP_Y);
	frameContext.lineTo(PHOTO_CENTER_X + TAIL_TOP_WIDTH, TAIL_TOP_Y);
	frameContext.closePath();
	frameContext.fill();
	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, TAIL_TIP_Y - TAIL_TIP_RADIUS, TAIL_TIP_RADIUS, 0, Math.PI * 2);
	frameContext.fill();
	frameContext.restore();

	// white pin frame
	frameContext.fillStyle = '#ffffff';
	frameContext.beginPath();
	frameContext.moveTo(PHOTO_CENTER_X, TAIL_TIP_Y);
	frameContext.lineTo(PHOTO_CENTER_X - TAIL_TOP_WIDTH, TAIL_TOP_Y);
	frameContext.lineTo(PHOTO_CENTER_X + TAIL_TOP_WIDTH, TAIL_TOP_Y);
	frameContext.closePath();
	frameContext.fill();
	frameContext.beginPath();
	frameContext.arc(PHOTO_CENTER_X, TAIL_TIP_Y - TAIL_TIP_RADIUS, TAIL_TIP_RADIUS, 0, Math.PI * 2);
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
		frameImagePromise = createFrameImage().catch((error) => {
			frameImagePromise = null;
			throw error;
		});
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

self.onmessage = async (e: MessageEvent<WarmupWorkerMessage | RenderWorkerMessage>) => {
	try {
		if (!context) {
			console.error('Canvas 2D not supported');
			return;
		}

		if (e.data.type === 'warmup') {
			await loadFrameImage();
			self.postMessage({ type: 'warmup-complete' });
			return;
		}

		const { id, image } = e.data;
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

		const imageBitmap = iconCanvas.transferToImageBitmap();
		self.postMessage({ type: 'render-complete', id, imageBitmap }, { transfer: [imageBitmap] });
	} catch (error) {
		console.error(error);
		if (e.data.type === 'warmup') {
			self.postMessage({
				type: 'warmup-error',
				error: error instanceof Error ? error.message : String(error)
			});
			return;
		}

		self.postMessage({
			type: 'render-error',
			id: e.data.id,
			error: error instanceof Error ? error.message : String(error)
		});
	}
};
