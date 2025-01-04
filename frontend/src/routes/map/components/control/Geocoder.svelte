<script lang="ts">
    import turfBbox from '@turf/bbox';
    import maplibregl from 'maplibre-gl';
    import { fade } from 'svelte/transition';
    import { Icon, XMark, MagnifyingGlass } from 'svelte-hero-icons';

    import { addressSearch } from '$lib/api';
    import { GSI } from '$lib/api/muni';
    import { showNotification } from '$lib/modules/ui';
    import { isSidePane, useEventTrigger } from '$lib/store/store';

    import { searchResultSource } from '../layersmanager';

    import type { LngLatLike, Marker } from 'maplibre-gl';

    type MunicipalityItem = {
        value: string;
        prefecture: string;
    };

    export let map: maplibregl.Map;
    let showMenu = false;
    let marker: Marker;
    let isLoading: boolean = false;
    let isComposing: boolean = false; // 日本語入力中かどうか
    let inputSearchWord = '';
    let featuresData: FeatureData[] = [];
    let prefectures: string[] = []; // 都道府県のプルダウンリスト
    let municipalities: string[] = []; // 市区町村のプルダウンリスト
    const municipalitiesMap: Map<string, MunicipalityItem> = new Map(); // 都道府県に紐づく市区町村の管理
    let selectedPrefecture = ''; // 絞り込み選択された都道府県
    let selectedMunicipality = ''; // 絞り込み選択された市区町村

    const LIMIT = 1000; // 検索結果の表示上限
    type FeatureData = {
        type: 'Feature';
        geometry: {
            type: 'Point';
            coordinates: LngLatLike;
        };
        properties: {
            title: string;
            prefecture: string | null;
            municipality: string | null;
            address: string | null;
        };
    };

    const addMarker = (coordinates: LngLatLike, isJumpingToMarker: boolean = false) => {
        if (marker) {
            marker.remove();
        }
        marker = new maplibregl.Marker({
            color: 'red'
        })
            .setLngLat(coordinates)
            .addTo(map);

        if (isJumpingToMarker) {
            map.jumpTo({ center: coordinates, zoom: 15 });
        }
    };

    // 国土地理院APIの変換表を使って住所コードを住所に変換
    const addressCodeToAddress = (addressCode: string) => {
        const csvString = GSI.MUNI_ARRAY[addressCode as keyof typeof GSI.MUNI_ARRAY];
        if (!csvString) return { prefecture: null, municipality: null, address: null };
        const parts = csvString.split(',');
        return { prefecture: parts[1], municipality: parts[3], address: `${parts[1]}${parts[3]}` };
    };

    // 都道府県に紐づく市区町村のリストに追加
    const addMunicipality = (municipalityItem: MunicipalityItem) => {
        municipalitiesMap.set(
            `${municipalityItem.prefecture}_${municipalityItem.value}`,
            municipalityItem
        );
    };

    // 検索処理
    const searchAddress = async (address: string) => {
        // 文字数の確認
        if (!address || address.length < 2) return;
        address = address.trim();

        isLoading = true;

        try {
            let response = await addressSearch(address);
            if (response.length === 0) {
                showNotification('検索結果が見つかりませんでした', 'success');
                resetSearchResult();
                isLoading = false;
                return;
            }
            response = response.slice(0, LIMIT);

            const prefecturesList = new Set();
            municipalitiesMap.clear(); // 市区町村リストの管理をリセット
            const features = response.map(({ geometry: { coordinates: center }, properties }) => {
                const prop = properties.addressCode
                    ? addressCodeToAddress(properties.addressCode)
                    : { prefecture: null, municipality: null, address: null };

                if (prop.prefecture) prefecturesList.add(prop.prefecture);
                if (prop.municipality) {
                    addMunicipality({ value: prop.municipality, prefecture: prop.prefecture });
                }

                return {
                    type: 'Feature' as const,
                    geometry: {
                        type: 'Point' as const,
                        coordinates: center as LngLatLike
                    },
                    properties: {
                        title: properties.title,
                        ...prop
                    }
                };
            });

            const bbox = turfBbox({ type: 'FeatureCollection', features });
            map.fitBounds(bbox, { padding: 100, duration: 0 });

            resetSearchResult();

            featuresData = features;
            prefectures = Array.from(prefecturesList) as string[];
            municipalities = Array.from(municipalitiesMap.values()).map((item) => item.value);

            showMenu = true;
        } catch (e) {
            console.error(e);
            showNotification('住所検索中に問題が発生しました', 'error');
        } finally {
            isLoading = false;
        }
    };

    // 検索結果のリセット
    const resetSearchResult = () => {
        featuresData = [];
        prefectures = [];
        municipalities = [];
        selectedPrefecture = '';
        selectedMunicipality = '';
        if (marker) {
            marker.remove();
        }
    };

    $: if (!showMenu) {
        resetSearchResult();
        inputSearchWord = '';
        municipalitiesMap.clear(); // 市区町村リストの管理をリセット
    }

    // 検索結果のフィルタリング
    $: filterFeatures = featuresData.filter((feature) => {
        const { prefecture, municipality } = feature.properties;

        // フィルター条件の適用
        const matchPrefecture = !selectedPrefecture || prefecture === selectedPrefecture;
        const matchMunicipality = !selectedMunicipality || municipality === selectedMunicipality;

        return matchPrefecture && matchMunicipality;
    });

    // 都道府県が選択されたときの市区町村のリセット処理
    $: if (selectedPrefecture) {
        // 都道府県に関連する市区町村のリストを取得
        municipalities = [...municipalitiesMap.values()]
            .filter((value) => value.prefecture === selectedPrefecture)
            .map((item) => item.value);

        selectedMunicipality = '';
    } else if (selectedPrefecture === '' && municipalitiesMap.size > 0) {
        // 都道府県が未選択の場合は全市区町村を表示
        municipalities = [...municipalitiesMap.values()].map((item) => item.value);
        selectedMunicipality = '';
    }

    // マーカーのリセット処理
    const resetMarker = () => {
        // 古いマーカー削除
        if (!map) return;

        const source = map?.getSource('search_result') as maplibregl.GeoJSONSource;
        if (source) {
            const geojson = {
                type: 'FeatureCollection',
                features: filterFeatures
            } as maplibregl.GeoJSONSourceOptions['data'];

            source.setData(geojson);
            searchResultSource.data = filterFeatures as any;
        }
    };

    $: if (filterFeatures) {
        resetMarker();
    }

    // 文化財検索が実行されたときは住所検索結果を非表示にする
    useEventTrigger.subscribe((eventName) => {
        if (eventName === 'searchBunkazai') showMenu = false;
    });
</script>

<div
    class="absolute top-2 max-lg:left-[80px] shadow-md transition-all duration-150 rounded-full overflow-hidden {$isSidePane
        ? 'lg:left-2'
        : 'lg:left-8 '}"
>
    <input
        type="text"
        class="py-2 px-4 rounded-md focus:outline-none"
        bind:value={inputSearchWord}
        on:compositionstart={() => (isComposing = true)}
        on:compositionend={() => (isComposing = false)}
        on:keydown={(e) => {
            if (e.key === 'Enter' && !isComposing) {
                searchAddress(inputSearchWord);
            }
        }}
        placeholder="住所検索"
    />

    <div class="grid place-self-center absolute right-1 top-2 pr-2">
        {#if isLoading}
            <div
                class="animate-spin h-6 w-6 border-2 border-gray-400 rounded-full border-t-transparent"
            ></div>
        {:else}
            <button
                on:click={() => searchAddress(inputSearchWord)}
                disabled={inputSearchWord.trim().length < 2}
                class={inputSearchWord.trim().length > 1
                    ? 'pointer-events-auto cursor-pointer'
                    : 'pointer-events-none'}
            >
                <Icon
                    src={MagnifyingGlass}
                    class="h-6 w-6 {inputSearchWord.trim().length > 1
                        ? ' text-[#1DB5C8]'
                        : 'text-gray-400'}"
                />
            </button>
        {/if}
    </div>
</div>

{#if showMenu}
    <div
        transition:fade={{ duration: 150 }}
        class="absolute flex flex-col top-[60px] left-2 w-[400px] h-3/5 bg-white rounded-md shadow-lg overflow-hidden"
    >
        <div class="bg-[#1DB5C8] p-2 h-[3rem] flex-shrink-0 max-lg:hidden">
            <div class="w-full flex justify-center h-full">
                <span class="w-full text-lg flex items-center text-white"
                    >検索結果 {featuresData.length > 1000
                        ? '1000'
                        : featuresData.length}件中{filterFeatures.length > 1000
                        ? '1000'
                        : filterFeatures.length}件表示</span
                >
                <button on:click={() => (showMenu = false)}
                    ><Icon src={XMark} class="h-8 w-8 text-white" /></button
                >
            </div>
        </div>
        <div class="flex gap-2 w-full p-2">
            <select
                bind:value={selectedPrefecture}
                class="rounded-full bg-white border-2 border-gray-400 flex justify-center items-center py-[3px] text-sm w-auto px-2 cursor-pointer transition-all duration-150 lg:hover:bg-gray-100 focus:outline-none"
            >
                <option value="">都道府県</option>
                {#each prefectures as prefecture}
                    <option value={prefecture}>{prefecture}</option>
                {/each}
            </select>

            <select
                bind:value={selectedMunicipality}
                class="rounded-full bg-white border-2 border-gray-400 flex justify-center items-center py-[3px] text-sm w-auto px-2 cursor-pointer transition-all duration-150 lg:hover:bg-gray-100 focus:outline-none"
            >
                <option value="">市区町村</option>
                {#each municipalities as municipality}
                    <option value={municipality}>{municipality}</option>
                {/each}
            </select>
        </div>
        <div class="flex flex-col h-full overflow-y-auto custom-scroll p-2">
            {#if featuresData}
                {#each filterFeatures as feature}
                    <button
                        on:click={() => addMarker(feature.geometry.coordinates, true)}
                        on:mouseover={() => addMarker(feature.geometry.coordinates)}
                        on:mouseleave={() => marker?.remove()}
                        on:focus={() => addMarker(feature.geometry.coordinates)}
                        class="p-2 flax flex-col text-left gap-2 lg:hover:!text-[#1DB5C8]"
                    >
                        <div>{feature.properties['title']}</div>
                        <div class="text-sm text-gray-600">
                            {feature.properties.address ?? feature.properties['title']}
                        </div>
                    </button>
                {/each}
            {/if}
        </div>
    </div>
{/if}

<style>
    :global(.maplibregl-marker.search-result-marker) {
        cursor: pointer;
    }
</style>
