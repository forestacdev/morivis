/** 初回利用まで読み込まず、同時要求は共有する。通信失敗後は再試行できる。 */
export const createLazyResource = <T>(load: () => Promise<T>) => {
	let value: T | undefined;
	let pending: Promise<T> | undefined;
	return {
		get: () => value,
		load: (): Promise<T> => pending ??= load().then(result => {
			value = result;
			return result;
		}).catch(error => {
			pending = undefined;
			throw error;
		})
	};
};
