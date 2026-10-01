/** 重なるタイルでチャンクを共有し、利用者が全員中断したら取得を止める。 */
export const createChunkCache = <T>(
	limit: number,
	sizeOf: (value: T) => number,
	concurrency = 3
) => {
	const cache = new Map<string, T>();
	const jobs = new Map<
		string,
		{ controller: AbortController; users: number; promise: Promise<T>; }
	>();
	const queue: (() => void)[] = [];
	let bytes = 0, running = 0;
	const pump = () => {
		while (running < concurrency && queue.length) queue.shift()!();
	};
	return {
		get bytes() {
			return bytes;
		},
		get: (
			key: string,
			load: (signal: AbortSignal) => Promise<T>,
			signal: AbortSignal
		): Promise<T> => {
			signal.throwIfAborted();
			const cached = cache.get(key);
			if (cached !== undefined) {
				cache.delete(key);
				cache.set(key, cached);
				return Promise.resolve(cached);
			}
			let job = jobs.get(key);
			if (!job || job.controller.signal.aborted) {
				const controller = new AbortController();
				const promise = new Promise<T>((resolve, reject) => {
					queue.push(() => {
						running++;
						void Promise.resolve().then(() => {
							controller.signal.throwIfAborted();
							return load(controller.signal);
						})
							.then(value => {
								controller.signal.throwIfAborted();
								cache.set(key, value);
								bytes += sizeOf(value);
								while (bytes > limit && cache.size) {
									const oldest = cache.keys().next().value!;
									bytes -= sizeOf(cache.get(oldest)!);
									cache.delete(oldest);
								}
								resolve(value);
							}).catch(reject).finally(() => {
								running--;
								pump();
							});
					});
				});
				job = { controller, users: 0, promise };
				jobs.set(key, job);
				const current = job;
				void promise.finally(() => {
					if (jobs.get(key) === current) jobs.delete(key);
				}).catch(() => {});
				pump();
			}
			const current = job;
			current.users++;
			return new Promise<T>((resolve, reject) => {
				let finished = false;
				const end = () => {
					if (finished) return false;
					finished = true;
					signal.removeEventListener('abort', abort);
					if (--current.users === 0) current.controller.abort();
					return true;
				};
				const abort = () => {
					if (end()) reject(signal.reason);
				};
				signal.addEventListener('abort', abort, { once: true });
				current.promise.then(value => {
					if (end()) resolve(value);
				}, error => {
					if (end()) reject(error);
				});
			});
		},
		deletePrefix: (prefix: string) => {
			for (const [key, value] of cache) {
				if (key.startsWith(prefix)) {
					bytes -= sizeOf(value);
					cache.delete(key);
				}
			}
			for (const [key, job] of jobs) if (key.startsWith(prefix)) job.controller.abort();
		}
	};
};
