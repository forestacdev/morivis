export const objectToUrlParams = (obj: Record<string, unknown>): string => {
	const params = new URLSearchParams();
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (Array.isArray(value)) {
				// 値が配列の場合は、キーを複数回繰り返して追加
				value.forEach((item) => {
					params.append(key, String(item));
				});
			} else if (value !== undefined && value !== null) {
				// 値が undefined または null でない場合のみ追加
				params.append(key, String(value));
			}
		}
	}
	return params.toString();
};
