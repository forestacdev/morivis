import { resolveStaticAssetPath } from '$routes/map/utils/platform/asset-path';
import proj4 from 'proj4';

const TOKYO_NADGRID_KEY = 'tky2jgd';
const TOKYO_NADGRID_PATH = resolveStaticAssetPath('/vendor/proj/tky2jgd.gsb');

export const TOKYO_NADGRID_PROJ4_VALUE = `+nadgrids=@${TOKYO_NADGRID_KEY},null`;

let tokyoNadgridPromise: Promise<void> | null = null;
let tokyoNadgridLoaded = false;

export const hasTokyoNadgridReference = (prjContent: string): boolean => {
	return /\+nadgrids=(?:[^+\s,]*,)*@?tky2jgd(?:,null)?(?:\s|$)/i.test(prjContent);
};

export const ensureTokyoNadgridLoaded = async (): Promise<void> => {
	if (tokyoNadgridLoaded) {
		return;
	}

	if (!tokyoNadgridPromise) {
		tokyoNadgridPromise = (async () => {
			const response = await fetch(TOKYO_NADGRID_PATH);

			if (!response.ok) {
				throw new Error(`tky2jgd.gsb の読み込みに失敗しました: ${response.status}`);
			}

			const arrayBuffer = await response.arrayBuffer();
			proj4.nadgrid(TOKYO_NADGRID_KEY, arrayBuffer);
			tokyoNadgridLoaded = true;
		})().catch((error) => {
			tokyoNadgridPromise = null;
			throw error;
		});
	}

	await tokyoNadgridPromise;
};

export const ensureProjNadgridsReady = async (prjContent: string): Promise<void> => {
	if (!hasTokyoNadgridReference(prjContent)) {
		return;
	}

	await ensureTokyoNadgridLoaded();
};
