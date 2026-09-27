import ArrowDownIcon from './icons/ui/ArrowDownIcon.svelte';
import ArrowLeftIcon from './icons/ui/ArrowLeftIcon.svelte';
import ArrowRightIcon from './icons/ui/ArrowRightIcon.svelte';
import ArrowUpIcon from './icons/ui/ArrowUpIcon.svelte';
import BackIcon from './icons/ui/BackIcon.svelte';
import CloseIcon from './icons/ui/CloseIcon.svelte';
import DownloadIcon from './icons/ui/DownloadIcon.svelte';
import EyeIcon from './icons/ui/EyeIcon.svelte';
import EyeOffIcon from './icons/ui/EyeOffIcon.svelte';
import LayerLineIcon from './icons/ui/LayerLineIcon.svelte';
import LayerModelIcon from './icons/ui/LayerModelIcon.svelte';
import LayerPointIcon from './icons/ui/LayerPointIcon.svelte';
import LayerPolygonIcon from './icons/ui/LayerPolygonIcon.svelte';
import LayerRasterIcon from './icons/ui/LayerRasterIcon.svelte';
import LockOnIcon from './icons/ui/LockOnIcon.svelte';
import MenuIcon from './icons/ui/MenuIcon.svelte';
import MobileIcon from './icons/ui/MobileIcon.svelte';
import OpenIcon from './icons/ui/OpenIcon.svelte';
import ResetIcon from './icons/ui/ResetIcon.svelte';
import SearchIcon from './icons/ui/SearchIcon.svelte';
import SettingIcon from './icons/ui/SettingIcon.svelte';
import TrashIcon from './icons/ui/TrashIcon.svelte';

export const ICONS = {
	close: CloseIcon,
	menu: MenuIcon,
	search: SearchIcon,
	back: BackIcon,
	eye: EyeIcon,
	eyeOff: EyeOffIcon,
	trash: TrashIcon,
	download: DownloadIcon,
	mobile: MobileIcon,
	lockOn: LockOnIcon,
	reset: ResetIcon,
	arrowUp: ArrowUpIcon,
	arrowDown: ArrowDownIcon,
	arrowLeft: ArrowLeftIcon,
	arrowRight: ArrowRightIcon,
	setting: SettingIcon,
	open: OpenIcon
} as const;

export const LAYER_ICONS = {
	point: LayerPointIcon,
	line: LayerLineIcon,
	polygon: LayerPolygonIcon,
	raster: LayerRasterIcon,
	model: LayerModelIcon
} as const;

export type LayerIconKey = keyof typeof LAYER_ICONS;
export const getLayerIconName = (layerType: LayerIconKey) => LAYER_ICONS[layerType];
export const getVisibilityIconName = (isVisible: boolean | undefined) =>
	isVisible === true ? ICONS.eye : ICONS.eyeOff;
