// Himawariの衛星画像の取得
export const getHimawariSatimgTimes = async () => {
	try {
		const response = await fetch(
			'https://www.jma.go.jp/bosai/himawari/data/satimg/targetTimes_fd.json'
		);
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const json = await response.json();
		return json;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch Himawari satellite image times: ${error.message}`);
		} else {
			throw new Error('Unknown error occurred while fetching Himawari satellite image times');
		}
	}
};

export const getHimawariImageUrl = async (basetime: number) => {
	const url = `https://www.jma.go.jp/bosai/himawari/data/satimg/${basetime}/fd/${basetime}/B13/TBB/{z}/{x}/{y}.jpg`;
	return url;
};
