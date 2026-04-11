import { icons as akarIcons } from '@iconify-json/akar-icons';
import { icons as bxIcons } from '@iconify-json/bx';
import { icons as circumIcons } from '@iconify-json/circum';
import { icons as epIcons } from '@iconify-json/ep';
import { icons as icIcons } from '@iconify-json/ic';
import { icons as iconamoonIcons } from '@iconify-json/iconamoon';
import { icons as iconoirIcons } from '@iconify-json/iconoir';
import { icons as materialSymbolsIcons } from '@iconify-json/material-symbols';
import { icons as mdiIcons } from '@iconify-json/mdi';
import { icons as stashIcons } from '@iconify-json/stash';
import { icons as streamlineUltimateIcons } from '@iconify-json/streamline-ultimate';
import { icons as uilIcons } from '@iconify-json/uil';
import { getIconData } from '@iconify/utils';

type IconSet = Parameters<typeof getIconData>[0];

const getRequiredIcon = (iconSet: IconSet, iconName: string) => {
	const icon = getIconData(iconSet, iconName);

	if (!icon) {
		throw new Error(`Icon not found: ${iconName}`);
	}

	return icon;
};

export const ICONS = {
	close: getRequiredIcon(materialSymbolsIcons, 'close-rounded'),
	menu: getRequiredIcon(icIcons, 'round-menu'),
	search: getRequiredIcon(stashIcons, 'search-solid'),
	back: getRequiredIcon(epIcons, 'back'),
	eye: getRequiredIcon(akarIcons, 'eye'),
	eyeOff: getRequiredIcon(akarIcons, 'eye-slashed'),
	trash: getRequiredIcon(bxIcons, 'trash'),
	download: getRequiredIcon(materialSymbolsIcons, 'download-rounded'),
	mobile: getRequiredIcon(circumIcons, 'mobile-3'),
	lockOn: getRequiredIcon(streamlineUltimateIcons, 'cursor-target-1'),
	reset: getRequiredIcon(materialSymbolsIcons, 'restart-alt-rounded'),
	arrowUp: getRequiredIcon(iconamoonIcons, 'arrow-up-2-duotone'),
	arrowDown: getRequiredIcon(iconamoonIcons, 'arrow-down-2-duotone'),
	arrowLeft: getRequiredIcon(iconamoonIcons, 'arrow-left-2-duotone'),
	arrowRight: getRequiredIcon(iconamoonIcons, 'arrow-right-2-duotone'),
	setting: getRequiredIcon(uilIcons, 'setting')
} as const;

export const LAYER_ICONS = {
	point: getRequiredIcon(icIcons, 'baseline-mode-standby'),
	line: getRequiredIcon(icIcons, 'baseline-polymer'),
	polygon: getRequiredIcon(icIcons, 'baseline-pentagon'),
	raster: getRequiredIcon(mdiIcons, 'raster'),
	model: getRequiredIcon(iconoirIcons, '3d-select-solid')
} as const;

export type LayerIconKey = keyof typeof LAYER_ICONS;

export const getLayerIconName = (layerType: LayerIconKey) => LAYER_ICONS[layerType];

export const getVisibilityIconName = (isVisible: boolean | undefined) =>
	isVisible === true ? ICONS.eye : ICONS.eyeOff;
