<script lang="ts">
	export type ClusterProperties = {
		attendees: number;
		cluster: true;
		cluster_id: number;
		point_count: number;
		point_count_abbreviated: number;
	};

	export interface IClickableMarker extends Marker {
		onClick: (handleClick: () => void) => this;
		_handleClick?: () => void;
		_onMapClick: (e: MapMouseEvent & { originalEvent: Event }) => void;
	}

	class ClickableMarker extends maplibregl.Marker implements IClickableMarker {
		public _handleClick?: () => void;

		onClick(handleClick: () => void): this {
			this._handleClick = handleClick;
			return this;
		}

		_onMapClick(e: MapMouseEvent & { originalEvent: Event }) {
			const targetElement = e.originalEvent.target as HTMLElement; // Assuming target is always an HTMLElement
			const element = this.getElement();

			if (this._handleClick && (targetElement === element || element.contains(targetElement))) {
				this._handleClick();
			}
		}
	}

	mapStore.onSetStyle((e) => {});

	mapStore.onLoad((e) => {
		const map = mapStore.getMap();
		if (!map) return;
		// マーカーにクリックイベントを追加するカスタムクラス

		const markers: { [key: string]: Marker } = {};
		const popups: { [key: string]: Popup } = {};
		let markersOnScreen: { [key: string]: Marker } = {};
		let popupsOnScreen: { [key: string]: Popup } = {};

		const updateMarkers = () => {
			if (map === null) return;
			let newMarkers: { [key: string]: Marker } = {};
			let newPopups: { [key: string]: Popup } = {};
			const features: any = map.querySourceFeatures('street_view_sources');

			for (let i = 0; i < features.length; i++) {
				const coords = features[i].geometry.coordinates;
				const props: any = features[i].properties;
				let id: number;
				if (props.cluster) {
					id = props.cluster_id;
				} else {
					id = props.id;
				}
				let marker = markers[id];

				if (!marker) {
					// マーカーの見た目作成
					const el = createHtml(props);
					if (!(el instanceof HTMLElement)) {
						return;
					}
					marker = markers[id] = new ClickableMarker({
						element: el,
						pitchAlignment: 'map'
					}).setLngLat(coords);
				}
				newMarkers[id] = marker;

				if (!markersOnScreen[id]) {
					// クリックイベント
					(marker as ClickableMarker).onClick(() => {
						if (props.cluster) {
							// const source = map?.getSource('fac_building_source') as GeoJSONSource;
							// source.getClusterExpansionZoom(id, (err, zoom) => {
							// 	if (err) return;
							// 	map?.easeTo({
							// 		center: coords,
							// 		zoom: zoom,
							// 		duration: 700
							// 	});
							// });
						} else {
							window.open(props.url, '_blank', 'noopener noreferrer');
						}
					});
					marker.addTo(map);
					const options = {
						duration: 0.7,
						separator: ''
					};
					const result = parseInt(marker.getElement().dataset.number ?? '0');

					let fontSize;
					if (result <= 9) {
						fontSize = 2;
					} else if (result >= 10 && result < 100) {
						fontSize = 2.5;
					} else if (result >= 100 && result < 1000) {
						fontSize = 3;
					} else {
						fontSize = 3.5;
					}
					marker.getElement().style.fontSize = `${fontSize}rem`;
				}
				if (props.cluster) continue;
				let popup = popups[id];
				if (!popup) {
					popup = popups[id] = new maplibregl.Popup({
						offset: 30,
						closeOnClick: false,
						closeButton: false,
						maxWidth: 'none',
						anchor: 'bottom'
					})
						.setLngLat(coords)
						.setHTML(`<h1>sssss</h1>`)
						.addTo(map);

					const element = popup.getElement();
					if (element && element.lastElementChild) {
						element.lastElementChild.className = 'aaa';
					}
				}
				newPopups[id] = popup;
				if (!popupsOnScreen[id]) {
					popup.addTo(map);
				}
			}

			for (let id in markersOnScreen) {
				if (!newMarkers[id]) markersOnScreen[id].remove();
			}
			markersOnScreen = newMarkers;

			for (let id in popupsOnScreen) {
				if (!newPopups[id]) popupsOnScreen[id].remove();
			}
			popupsOnScreen = newPopups;
		};

		map.on('render', () => {
			if (map === null) return;
			if (!map.isSourceLoaded('street_view_sources')) return;
			updateMarkers();
		});

		map.on('data', (e: MapSourceDataEvent) => {
			if (map === null) return;

			if (e.sourceId !== 'street_view_sources' || !e.isSourceLoaded) return;

			map.on('move', updateMarkers);
			map.on('moveend', updateMarkers);
			updateMarkers();
		});

		const createHtml = (props: ClusterProperties) => {
			if (map === null) return;
			// let style: string;
			// if (!props.cluster) {
			// 	style = `backgrpund-color: #000; color: #fff;`;
			// } else {
			// 	style = `backgrpund-color: #000; color: #fff;`;
			// }

			const html = `<div>aaaaa</div>`;

			const el = document.createElement('div');
			el.innerHTML = html;

			return el.firstChild;
		};
	});
</script>
