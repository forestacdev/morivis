<script lang="ts">
    import maplibregl from 'maplibre-gl';
    import { onMount } from 'svelte';

    import ShareMenu from '$lib/components/Main/Map/Control/ShareMenu.svelte';

    import type { Map, TerrainSpecification } from 'maplibre-gl';

    export let map: Map;
    let controlContainer: HTMLDivElement;
    let showShareMenu: boolean = false;

    // 3D地形コントロール（カスタム）
    class CustomTerrainControl extends maplibregl.TerrainControl {
        constructor(options: TerrainSpecification) {
            super(options);
        }

        onAdd(map: Map) {
            const container = super.onAdd(map);
            this._terrainButton.addEventListener('click', this.customClickHandler);
            return container;
        }

        // ３D表示の時に地図を傾ける
        customClickHandler = () => {
            this._map.getTerrain()
                ? this._map.easeTo({ pitch: 60 })
                : this._map.easeTo({ pitch: 0 });
        };
    }

    // 共有コントロール（カスタム）
    class CustomShareControl {
        private _map: maplibregl.Map | undefined;
        private _container: HTMLDivElement | null;
        private _shareButton: HTMLButtonElement | null;

        constructor() {
            this._container = null;
            this._shareButton = null;
        }

        onAdd(map: maplibregl.Map): HTMLElement {
            this._map = map;
            this._container = document.createElement('div');
            this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

            this._shareButton = document.createElement('button');
            this._shareButton.className = 'maplibregl-ctrl-share';

            const span = document.createElement('span');
            span.className = 'maplibregl-ctrl-icon';
            this._shareButton.appendChild(span);

            this._container.appendChild(this._shareButton);

            this._shareButton.onclick = () => {
                this._toggleShareMenu();
            };

            this._map.on('movestart', () => {
                showShareMenu = false;
                if (this._shareButton) {
                    this._shareButton.classList.remove('maplibregl-ctrl-share-active');
                }
            });

            return this._container;
        }

        onRemove(): void {
            if (this._container && this._container.parentNode) {
                this._container.parentNode.removeChild(this._container);
            }
            this._map = undefined;
        }

        // 共有メニューの表示切り替え
        _toggleShareMenu = () => {
            showShareMenu = !showShareMenu;
            if (this._shareButton) {
                this._shareButton.classList.toggle('maplibregl-ctrl-share-active');
            }
        };
    }

    // 共有コントロールをマップに追加
    const shareControl = new CustomShareControl();

    onMount(() => {
        if (map) {
            // ナビゲーションコントロール ズーム
            const zoomControl = new maplibregl.NavigationControl({
                showCompass: false
            });
            controlContainer.appendChild(zoomControl.onAdd(map));

            // ナビゲーションコントロール コンパス
            const connpassControl = new maplibregl.NavigationControl({
                visualizePitch: true,
                showZoom: false
            });
            controlContainer.appendChild(connpassControl.onAdd(map));

            // 3D地形コントロール
            const terrainControl = new CustomTerrainControl({
                source: 'terrain',
                exaggeration: 1
            }).onAdd(map);
            controlContainer.appendChild(terrainControl);

            // 現在位置表示コントロール
            const geolocateControl = new maplibregl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true
                },
                fitBoundsOptions: { maxZoom: 12 },
                trackUserLocation: true,
                showUserLocation: true
            });
            controlContainer.appendChild(geolocateControl.onAdd(map));

            controlContainer.appendChild(shareControl.onAdd(map));
        }
    });
</script>

<div class="absolute right-4 top-8 flex flex-col gap-4" bind:this={controlContainer}></div>

<ShareMenu bind:showShareMenu {map} />

<style>
    /* 各コントロールのスタイル */
    :global(.maplibregl-ctrl-group) {
        scale: 1.3;
        box-shadow: none !important;
        border-radius: 50% !important;
        filter: drop-shadow(0 0 0.25rem rgba(0, 0, 0, 0.25));
        overflow: hidden;
    }

    /* ズームコントロールのスタイル */
    :global(.maplibregl-ctrl-group:has(button[class^='maplibregl-ctrl-zoom-'])) {
        border-radius: 0 !important;
        background-color: transparent !important;
        margin-bottom: 5px;
        margin-top: -10px;
    }
    :global(.maplibregl-ctrl-zoom-in):hover,
    :global(.maplibregl-ctrl-zoom-out):hover {
        background-color: #f0f0f0 !important;
    }

    /* ズームインコントロールのスタイル */
    :global(.maplibregl-ctrl-zoom-in) {
        border-radius: 50% 50% 0 0 !important;
        background-color: #fff !important;
    }
    :global(.maplibregl-ctrl-zoom-in > span) {
        background-image: url('$lib/icons/MapControl/zoomin_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 15px !important;
    }

    /* ズームアウトコントロールのスタイル */
    :global(.maplibregl-ctrl-zoom-out) {
        border-radius: 0 0 50% 50% !important;
        background-color: #fff !important;
    }
    :global(.maplibregl-ctrl-zoom-out > span) {
        background-image: url('$lib/icons/MapControl/zoomout_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 15px !important;
    }

    /* 3D地形コントロールのスタイル */
    :global(.maplibregl-ctrl-terrain > span) {
        background-image: url('$lib/icons/MapControl/3d_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 16px !important;
    }
    :global(.maplibregl-ctrl-terrain-enabled > span) {
        background-image: url('$lib/icons/MapControl/3d_active_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 16px !important;
    }

    /* コンパスコントロールのスタイル */
    :global(.maplibregl-ctrl-compass > span) {
        background-image: url('$lib/icons/MapControl/connpass_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 6px !important;
    }

    /* 現在地コントロールのスタイル */
    :global(.maplibregl-ctrl-geolocate > span) {
        background-image: url('$lib/icons/MapControl/geolocation_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 30px !important;
    }
    :global(.maplibregl-ctrl-geolocate-waiting > span) {
        background-image: url('$lib/icons/MapControl/geolocation_active_icon.svg') !important;
    }
    :global(.maplibregl-ctrl-geolocate-active > span) {
        background-image: url('$lib/icons/MapControl/geolocation_active_icon.svg') !important;
    }

    /* 共有コントロールのスタイル */
    :global(.maplibregl-ctrl-share > span) {
        background-image: url('$lib/icons/MapControl/share_icon.svg') !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 19px !important;
    }

    :global(.maplibregl-ctrl-share-active > span) {
        background-image: url('$lib/icons/MapControl/share_active_icon.svg') !important;
    }
</style>
