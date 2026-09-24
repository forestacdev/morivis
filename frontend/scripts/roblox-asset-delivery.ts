import { isRobloxDeliveryUrl } from '../src/routes/map/utils/formats/roblox/delivery-url';

export class RobloxAssetDeliveryError extends Error {
	constructor(message: string, public status = 502) {
		super(message);
	}
}

/** Node専用。秘密鍵をWorker・クライアントの依存に含めない。 */
export const fetchRobloxAsset = async (
	id: string,
	apiKey: string,
	fetcher: typeof fetch = fetch
) => {
	if (!/^[1-9]\d{0,19}$/.test(id)) throw new Error('不正なAssetId');
	if (!apiKey) throw new Error('ROBLOX_API_KEYが未設定です');
	const response = await fetcher(`https://apis.roblox.com/asset-delivery-api/v1/assetId/${id}`, {
		headers: { 'x-api-key': apiKey },
		redirect: 'error',
		signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) {
		throw new RobloxAssetDeliveryError(`Roblox API: HTTP ${response.status}`, response.status);
	}
	const metadata = await response.json() as {
		location?: string;
		locations?: { location: string; }[];
	};
	const location = metadata.location ?? metadata.locations?.[0]?.location;
	if (!location) throw new RobloxAssetDeliveryError('Roblox APIに素材の配信先がありません');
	if (!isRobloxDeliveryUrl(location)) {
		throw new RobloxAssetDeliveryError('Roblox素材の配信先が不正、または未対応です');
	}
	// CDNへAPIキーを転送しない。転送先を変えるリダイレクトも受け付けない。
	const asset = await fetcher(new URL(location), {
		redirect: 'error',
		signal: AbortSignal.timeout(15000)
	});
	if (!asset.ok) {
		throw new RobloxAssetDeliveryError(`Roblox CDN: HTTP ${asset.status}`, asset.status);
	}
	let bytes = new Uint8Array(await asset.arrayBuffer());
	if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
		const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
		bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	}
	return bytes;
};
