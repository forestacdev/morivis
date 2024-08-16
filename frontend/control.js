//★コントロールボタン(画面右側のボタン)

//ボタン定義
class Control_DEM {
    onAdd(map) {
    const seton =
        '<b>2D</b>';
    const setoff =
        '<b>3D</b>';

    this.map = map;
    const homeButton = document.createElement("button");
    homeButton.innerHTML = seton;
    homeButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        homeButton.innerHTML = seton;

        const dem = map.getTerrain();
        const demcheck = Object.values(dem)[1];

        if (demcheck === 1) {
            homeButton.innerHTML = setoff;
            map.setTerrain({ source: "mapbox-dem", exaggeration: 0 });
            map.easeTo({ pitch: 0 });
            massage_2D();
        } else {
            map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
            map.easeTo({ pitch: 50 });
            massage_3D();
        }
    });

        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.container.appendChild(homeButton);

        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}

class Control_spinR {
    onAdd(map) {
        this.map = map;

        const homeButton = document.createElement("button");
        homeButton.innerHTML =
            '<img src="https://img.icons8.com/material-rounded/26/000000/rotate-right.png"/>';
        homeButton.addEventListener("click", (e) => {
            // map.setBearing(i -= 15);

            const bearingright = Math.round(map.getBearing()) - 15;

            map.rotateTo(bearingright, { duration: 300 });
        });

        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.container.appendChild(homeButton);

        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}

//左回転ボタンset
class Control_spinL {
    onAdd(map) {
        this.map = map;

        const homeButton = document.createElement("button");
        homeButton.innerHTML =
            '<img src="https://img.icons8.com/material-sharp/26/000000/rotate-left.png"/>';
        homeButton.addEventListener("click", (e) => {
            const bearingleft = Math.round(map.getBearing()) + 15;
            map.rotateTo(bearingleft, { duration: 300 });

        });

        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.container.appendChild(homeButton);

        return this.container;
        }

        onRemove() {
            this.container.parentNode.removeChild(this.container);
            this.map = undefined;
            }
}

//360°ボタンset
class Control_360 {
    onAdd(map) {
    const seton =
        '<b>解除</b>';
    const setoff =
        '<b>360°</b>';

    this.map = map;
    const homeButton = document.createElement("button");
    homeButton.innerHTML = setoff;
    homeButton.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        homeButton.innerHTML = seton;

        if (map.getLayer("360度写真")) {
            homeButton.innerHTML = setoff;
            map.removeLayer("background");
            map.removeLayer("360度写真");
            
        } else {

            
        map.flyTo({ 
            center: [136.92143098183698, 35.55232856623586],
            zoom: 15.8,
            bearing: 105,
            pitch: 40,
            duration: 3000,
                    });

        map.addLayer({
            id: "background",
            type: "background",
            layout: {
            visibility: "visible",
            },
            paint: {
            "background-color": "#000000",
            "background-opacity": 0.4,
            },
        });

        map.addLayer({
            id: "360度写真",
            type: "circle",
            source: "THETA360",
            "source-layer": "THETA360",
            paint: {
                "circle-color": "#05CB63",
                "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    13,
                    1,
                    15,
                    8,
                    20.014,
                    30,
                ],
                "circle-opacity": 0.7,
            },
        });
            massage_360();
        }
    });

        this.container = document.createElement("div");
        this.container.className = "mapboxgl-ctrl mapboxgl-ctrl-group";
        this.container.appendChild(homeButton);

        return this.container;
    }

    onRemove() {
        this.container.parentNode.removeChild(this.container);
        this.map = undefined;
    }
}

//地図情報
map.addControl(new mapboxgl.AttributionControl(), "bottom-right");

//コンパス
map.addControl(new mapboxgl.NavigationControl());

//右回転ボタン
map.addControl(new Control_spinR(), "top-right");

//左回転ボタン
map.addControl(new Control_spinL(), "top-right");

//3Dボタン
map.addControl(new Control_DEM(), "top-right");

//360°
map.addControl(new Control_360, "top-right");

// 現在地
map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showAccuracyCircle: false,
        showUserHeading: true,
    })
);

//スケール
const Scale = new mapboxgl.ScaleControl({
    maxWidth: 200,
    unit: "metric",
});

//ピッチコントロール
document.getElementById('Scale').appendChild(Scale.onAdd(map));

map.on('pitch', () => {
    const sliderValueO = document.getElementById('slider_Pitch_value');
    const nowPitch = map.getPitch();
    document.getElementById( "slider_Pitch_opacity" ).value = Math.trunc(nowPitch);
    sliderValueO.textContent = Math.trunc(nowPitch) + "°";
    });

    slider_Pitch_opacity.addEventListener('input', (e) => {
        const sliderValue = document.getElementById('slider_Pitch_value');
        map.easeTo({ pitch: e.target.value });
        sliderValue.textContent = e.target.value + "°";
    });