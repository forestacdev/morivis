<script lang="ts">
	import Icon from '@iconify/svelte';
	import { fly } from 'svelte/transition';

	import Checkbox from '$routes/map/components/layer_menu/Checkbox.svelte';
	import PlaneGridSettings from '$routes/map/components/PlaneGridSettings.svelte';
	import { baseMapList } from '$routes/map/utils/layers/base_map';
	import {
		selectedBaseMap,
		showLabelLayer,
		showHillshadeLayer,
		showXYZTileLayer,
		showRegionalMeshLayer,
		showH3Layer,
		showPlaneGridLayer,
		showContourLayer,
		showLineLayer,
		showStreetViewLayer
	} from '$routes/stores/layers';
	import { isTerrain3d, isGlobe } from '$routes/stores/map';

	let containerRef = $state<HTMLElement>();

	$effect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (showMenu && containerRef && !containerRef.contains(event.target as Node)) {
				showMenu = false;
			}
		};

		if (showMenu) {
			document.addEventListener('click', handleClickOutside);
		}

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	interface Props {
		showMenu: boolean;
	}

	let { showMenu = $bindable() }: Props = $props();

	let layersList = $derived<
		{
			label: string;
			value: boolean;
			setValue: (value: boolean) => void;
			disabled?: boolean;
			icon: string;
		}[]
	>([
		{
			label: '地名・POI',
			icon: 'material-symbols:location-on-rounded',
			value: $showLabelLayer,
			setValue: showLabelLayer.set,
			disabled: $selectedBaseMap === 'osm'
		},
		{
			label: '道路・線路・境界',
			icon: 'material-symbols:route',
			value: $showLineLayer,
			setValue: showLineLayer.set,
			disabled: $selectedBaseMap === 'osm'
		},
		{
			label: '陰影',
			icon: 'material-symbols:contrast',
			value: $showHillshadeLayer,
			setValue: showHillshadeLayer.set,
			disabled: $selectedBaseMap === 'satellite'
		},
		{
			label: '3D地形',
			icon: 'material-symbols:landscape-rounded',
			value: $isTerrain3d,
			setValue: isTerrain3d.set
		},
		{
			label: '地球儀表示',
			icon: 'material-symbols:public',
			value: $isGlobe,
			setValue: isGlobe.set
		},

		// {
		// 	label: 'ストリートビュー',
		// 	icon: 'material-symbols:streetview',
		// 	value: $showStreetViewLayer,
		// 	setValue: showStreetViewLayer.set
		// },
		{
			label: '等高線・標高',
			icon: 'mdi:terrain',
			value: $showContourLayer,
			setValue: showContourLayer.set
		},
		{
			label: '地域メッシュ',
			icon: 'material-symbols:grid-4x4',
			value: $showRegionalMeshLayer,
			setValue: showRegionalMeshLayer.set
		},
		{
			label: 'タイル座標',
			icon: 'material-symbols:grid-on',
			value: $showXYZTileLayer,
			setValue: showXYZTileLayer.set
		},

		{
			label: 'H3',
			icon: 'mdi:hexagon-multiple-outline',
			value: $showH3Layer,
			setValue: showH3Layer.set
		}
		// {
		// 	label: '平面直角座標',
		// 	icon: 'mdi:axis-arrow',
		// 	value: $showPlaneGridLayer,
		// 	setValue: showPlaneGridLayer.set
		// },
	]);
</script>

{#if showMenu}
	<div
		bind:this={containerRef}
		transition:fly={{ duration: 200, y: -50, opacity: 0 }}
		class="bg-main absolute z-30 flex max-w-[400px] flex-col gap-3 rounded-lg right-4 p-3 text-base shadow-lg"
	>
		<div class="flex flex-col gap-2">
			<div class="flex w-full justify-between">
				<span>ベースマップ</span>
				<button onclick={() => (showMenu = false)} class="cursor-pointer text-base">
					<Icon icon="material-symbols:close-rounded" class="h-6 w-6" />
				</button>
			</div>
			<div class="grid w-full grid-cols-3 items-center justify-center gap-x-2">
				{#each baseMapList as baseMap}
					<button
						onclick={() => {
							if ($selectedBaseMap === baseMap.type) return;
							$selectedBaseMap = baseMap.type;
						}}
						class="flex cursor-pointer flex-col items-center justify-start gap-2 rounded-md border-2 p-2 transition-colors duration-150 select-none {$selectedBaseMap ===
						baseMap.type
							? 'border-accent'
							: 'border-transparent'}"
					>
						<img
							src={baseMap.src}
							alt={baseMap.label}
							class="c-no-drag-icon h-16 w-16 rounded-lg"
						/>
						<span class="text-xs"> {baseMap.label}</span>
					</button>
				{/each}
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<div class="flex w-full justify-between">
				<span>レイヤ</span>
			</div>

			<div class="grid w-full grid-cols-3 items-center justify-center gap-y-4 gap-x-2">
				{#each layersList as layer (layer.label)}
					<div class={layer.disabled ? 'opacity-50 pointer-events-none' : ''}>
						<label
							for={layer.label}
							class="cursor-pointer grid place-items-center border-2 rounded-lg p-2 transition-colors duration-150 {layer.value
								? 'border-accent'
								: 'border-base'}"
						>
							<Icon
								icon={layer.icon}
								class="h-8 w-8 transition-colors duration-150  {layer.value
									? 'text-accent'
									: 'text-base'}"
							/>
							<span class="select-none text-xs">{layer.label}</span>
							<input
								type="checkbox"
								id={layer.label}
								bind:checked={() => layer.value, layer.setValue}
								disabled={layer.disabled}
								class="hidden"
							/>
						</label>
					</div>
				{/each}
			</div>
			{#if $showPlaneGridLayer}
				<PlaneGridSettings />
			{/if}
		</div>
	</div>
{/if}
