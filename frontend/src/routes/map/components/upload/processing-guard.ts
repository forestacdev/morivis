import { isProcessing } from '$routes/stores/ui';

let activeTasks = 0;

/** 処理単位でガードを保持する。中断後のfinallyや入力差し替えで二重解除しない。 */
export const beginUploadProcessing = (signal: AbortSignal): () => void => {
	if (signal.aborted) return () => {};
	activeTasks += 1;
	isProcessing.set(true);
	let released = false;
	const release = () => {
		if (released) return;
		released = true;
		signal.removeEventListener('abort', release);
		activeTasks -= 1;
		if (activeTasks === 0) isProcessing.set(false);
	};
	signal.addEventListener('abort', release, { once: true });
	return release;
};
