export interface WorkerErrorResponse {
	error: string;
}

export const hasWorkerError = (response: unknown): response is WorkerErrorResponse =>
	typeof response === 'object'
	&& response !== null
	&& 'error' in response
	&& typeof response.error === 'string';

interface RunSingleShotWorkerOptions<TResponse, TResult> {
	errorPrefix: string;
	mapResponse: (response: TResponse) => TResult;
	transfer?: Transferable[];
}

export const runSingleShotWorker = <TRequest, TResponse, TResult>(
	WorkerConstructor: new() => Worker,
	request: TRequest,
	options: RunSingleShotWorkerOptions<TResponse, TResult>
): Promise<TResult> =>
	new Promise((resolve, reject) => {
		const worker = new WorkerConstructor();

		worker.onmessage = (event: MessageEvent<TResponse | WorkerErrorResponse>) => {
			worker.terminate();

			if (hasWorkerError(event.data)) {
				reject(new Error(event.data.error));
				return;
			}

			resolve(options.mapResponse(event.data));
		};

		worker.onerror = (error) => {
			worker.terminate();
			reject(new Error(`${options.errorPrefix}: ${error.message}`));
		};

		if (options.transfer) {
			worker.postMessage(request, options.transfer);
			return;
		}

		worker.postMessage(request);
	});
