import { devProxyTransform } from '../../platform/proxy';
import { bakeRobloxSurfaces } from './bake';
import { robloxWorldToGlb } from './glb';
import { parseRobloxWorld } from './index';
import { prepareRobloxMaterials } from './pbr';
import { loadRobloxResources } from './resources';

export interface RobloxResult {
	glb: ArrayBuffer;
	partCount: number;
	warnings: string[];
}
export type RobloxResponse = { result: RobloxResult; } | { error: string; };

self.onmessage = async (
	{ data }: MessageEvent<{ file: File; resourceUrl?: string; assetApiUrl?: string; }>
) => {
	try {
		const world = await parseRobloxWorld(await data.file.arrayBuffer());
		const resources = await loadRobloxResources(world, {
			resourceUrl: data.resourceUrl,
			authenticatedAssetUrl: data.assetApiUrl
				|| (import.meta.env.PROD ? undefined : '/api/roblox-auth-assets'),
			resolveUrl: url => import.meta.env.PROD ? url : devProxyTransform(url).url
		});
		await prepareRobloxMaterials(world, resources);
		await bakeRobloxSurfaces(world, resources);
		const glb = robloxWorldToGlb(world, resources);
		self.postMessage(
			{
				result: {
					glb,
					partCount: world.parts.filter(part =>
						!part.meshId || resources.meshes.has(part.meshId)
					).length,
					warnings: world.warnings
				}
			} satisfies RobloxResponse,
			{ transfer: [glb] }
		);
	} catch (error) {
		self.postMessage(
			{
				error: error instanceof Error
					? error.message
					: 'Robloxのワールドを読み込めませんでした。'
			} satisfies RobloxResponse
		);
	}
};
