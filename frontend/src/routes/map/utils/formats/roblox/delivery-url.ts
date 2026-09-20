/** 配信APIが返すURL用。ワールド内の任意URLを取得する許可には使わない。 */
export const isRobloxDeliveryUrl = (value: string): boolean => {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && !url.username && !url.password && !url.port
			&& (url.hostname === 'contentdelivery.roblox.com'
				|| url.hostname.endsWith('.rbxcdn.com'));
	} catch {
		return false;
	}
};
