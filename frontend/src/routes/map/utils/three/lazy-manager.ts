import { createLazyResource } from '$routes/map/utils/runtime/lazy-resource';

let groupVisible = true;
const resource = createLazyResource(async () => {
	const { threeJsManager } = await import('./layer-manager');
	threeJsManager.setGroupVisibility(groupVisible);
	return threeJsManager;
});
export const getThreeJsManager = resource.get;
export const loadThreeJsManager = resource.load;
export const setThreeGroupVisibility = (visible: boolean) => {
	groupVisible = visible;
	resource.get()?.setGroupVisibility(visible);
};

export const syncThreeGroupVisibility = () => {
	resource.get()?.setGroupVisibility(groupVisible);
};
