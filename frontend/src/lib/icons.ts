export const ICONS = {
	close: 'material-symbols:close-rounded',
	menu: 'ic:round-menu',
	search: 'stash:search-solid',
	back: 'ep:back',
	eye: 'akar-icons:eye',
	eyeOff: 'akar-icons:eye-slashed',
	trash: 'bx:trash',
	download: 'material-symbols:download-rounded',
	mobile: 'circum:mobile-3',
	lockOn: 'streamline-ultimate:cursor-target-1',
	reset: 'material-symbols:restart-alt-rounded',
	arrowUp: 'iconamoon:arrow-up-2-duotone',
	arrowDown: 'iconamoon:arrow-down-2-duotone',
	arrowLeft: 'iconamoon:arrow-left-2-duotone',
	arrowRight: 'iconamoon:arrow-right-2-duotone'
} as const;

export const LAYER_ICONS = {
	point: 'ic:baseline-mode-standby',
	line: 'ic:baseline-polymer',
	polygon: 'ic:baseline-pentagon',
	raster: 'mdi:raster',
	model: 'iconoir:3d-select-solid'
} as const;

export type LayerIconKey = keyof typeof LAYER_ICONS;

export const getLayerIconName = (layerType: LayerIconKey) => LAYER_ICONS[layerType];

export const getVisibilityIconName = (isVisible: boolean | undefined) =>
	isVisible === true ? ICONS.eye : ICONS.eyeOff;
