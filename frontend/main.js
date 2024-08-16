//ロード画面長さ
$('#splash').delay(4000).fadeOut(2000);
$('#splash_logo').delay(6000).fadeOut(2000);

//起動後にアップ

if (matchMedia('only screen and (max-width: 640px)').matches) {
    window.setTimeout(function () {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 0 });
        map.fitBounds(
            [
                [136.91917, 35.54692], // southwestern corner of the bounds
                [136.926816, 35.555121], // northeastern corner of the bounds
            ],
            {
                padding: 20,
                pitch: 0,
                duration: 3000,
            },
        );
    }, 6000);
} else {
    //PCの時の処理
    window.setTimeout(function () {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
        map.fitBounds(
            [
                [136.915292, 35.547079], // southwestern corner of the bounds
                [136.926577, 35.556588], // northeastern corner of the bounds
            ],
            {
                pitch: 50,
                bearing: 105,
                duration: 3000,
            },
        );

        new mapboxgl.Popup({
            focusAfterOpen: false,
        })
            .setLngLat([136.92297, 35.551341])
            .setHTML('<h2 style="text-align:center">アカデミー演習林33ha　</h2>')
            .addTo(map);
    }, 6000);
}

//★★★アクセストークン★★★
mapboxgl.accessToken = 'pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A';

//マップの表示範囲制限
const bounds = [
    [135.120849, 33.93533],
    [139.031982, 37.694841],
];

//回転用変数
var i = 0;

//マップの表示
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/ensyuringis/ckzt6ulkx003214qu9cfzwp3f',
    center: [136.92300400916308, 35.5509525769706], // 初期中心の座標
    zoom: 14.5, // 初期ズームレベル
    maxBounds: bounds,
    attributionControl: false,
    bearing: i,
});

// マップの読み込み完了後にロード
map.on('load', () => {
    //DEMデータ読み込み
    map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
    });

    //スカイレイヤー(空)読み込み
    map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 0.0],
            'sky-atmosphere-sun-intensity': 15,
        },
    });

    //全国最新写真(シームレス)
    map.addSource('saisinsyasin_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //電子国土基本図（オルソ画像）
    map.addSource('oruso_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //空中写真(1979年頃)
    map.addSource('kutyu_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //基本図(マップボックスアカウントのマップデータから)
    map.addSource('kihonzu_Base', {
        type: 'raster',
        tiles: [
            'https://api.mapbox.com/styles/v1/ensyuringis/ckzppbbaf001k14ldljs4a65x/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A',
        ],
        tileSize: 256,
    });

    //地理院タイル標準
    map.addSource('hyouzyun_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //地理院タイル淡色
    map.addSource('tansyoku_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //地理院タイル白地図
    map.addSource('hakutizu_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //色別標高図
    map.addSource('sikibetu_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // 陰影起伏図
    map.addSource('ineikizyou_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // 傾斜量図白黒
    map.addSource('keisyasirokuro_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //傾斜区分図(岐阜県森林研究所)
    map.addSource('keiyakubun_Base', {
        type: 'raster',
        tiles: ['https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
    });

    // 植生図
    map.addSource('syokusei_Base', {
        type: 'raster',
        tiles: ['https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://map.ecoris.info/#contents' target='_blank'>エコリス地図タイル</a>",
    });

    // シームレス地質図
    map.addSource('tisitus_Base', {
        type: 'raster',
        tiles: ['https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: "<a href='https://gbank.gsj.jp/seamless/index.html?lang=ja&' target='_blank'>産総研地質調査総合センター</a>",
    });

    // 活断層図
    map.addSource('katudansou_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // CS立体図(岐阜県森林研究所)
    map.addSource('csrittai_Base', {
        type: 'raster',
        tiles: ['https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
    });

    //赤色立体図10mメッシュ
    map.addSource('sekisyoku_Base', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/sekishoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://www.rrim.jp/' target='_blank'>アジア航測株式会社</a>",
    });

    //OpenStreetMap
    map.addSource('osm_Base', {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
    });

    //Esri World Street
    map.addSource('esriWS_Base', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
    });

    //Esri World Imagery
    map.addSource('esriWI_Base', {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
    });

    //Stamen_t
    map.addSource('Stamento_Base', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //Stamen_Terrain
    map.addSource('StamenT_Base', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //Stamen_w
    map.addSource('StamenW_Base', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //岐阜県共有空間データ
    map.addSource('gifukyouyu_Base', {
        type: 'raster',
        tiles: ['https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://info.qchizu.xyz/qchizu/reprint/' target='_blank'>Q地図タイル</a>",
    });

    //Mapbox Streets
    map.addSource('mapboxS_Base', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //Mapbox Dark
    map.addSource('mapboxD_Base', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //Mapbox Mapbox Satelite
    map.addSource('mapboxSL_Base', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //★重ね用ラスターレイヤー読み込み

    //地図なし
    map.addSource('nasi_Raster', {
        type: 'raster',
        tiles: [
            'https://api.mapbox.com/styles/v1/ensyuringis/ckzt6ulkx003214qu9cfzwp3f/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A',
        ],
        tileSize: 256,
    });

    //全国最新写真(シームレス)R
    map.addSource('saisinsyasin_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //電子国土基本図（オルソ画像）R
    map.addSource('oruso_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //空中写真(1979年頃)R
    map.addSource('kutyu_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/gazo2/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //基本図(マップボックスアカウントのマップデータから)R
    map.addSource('kihonzu_Raster', {
        type: 'raster',
        tiles: [
            'https://api.mapbox.com/styles/v1/ensyuringis/ckzppbbaf001k14ldljs4a65x/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A',
        ],
        tileSize: 256,
    });

    //地理院タイル標準R
    map.addSource('hyouzyun_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //地理院タイル淡色R
    map.addSource('tansyoku_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //地理院タイル白地図R
    map.addSource('hakutizu_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/blank/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //色別標高図R
    map.addSource('sikibetu_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/relief/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // 陰影起伏図R
    map.addSource('ineikizyou_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/hillshademap/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // 傾斜量図白黒R
    map.addSource('keisyasirokuro_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopemap/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    //傾斜区分図(岐阜県森林研究所)R
    map.addSource('keiyakubun_Raster', {
        type: 'raster',
        tiles: ['https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu_2021Slpoe_2022_07_25_15_54/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
    });

    // 植生図R
    map.addSource('syokusei_Raster', {
        type: 'raster',
        tiles: ['https://map.ecoris.info/tiles/vege67hill/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://map.ecoris.info/#contents' target='_blank'>エコリス地図タイル</a>",
    });

    // シームレス地質図R
    map.addSource('tisitus_Raster', {
        type: 'raster',
        tiles: ['https://gbank.gsj.jp/seamless/v2/api/1.2.1/tiles/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: "<a href='https://gbank.gsj.jp/seamless/index.html?lang=ja&' target='_blank'>産総研地質調査総合センター</a>",
    });

    // 活断層図R
    map.addSource('katudansou_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/afm/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // CS立体図(岐阜県森林研究所)R
    map.addSource('csrittai_Raster', {
        type: 'raster',
        tiles: ['https://tiles.arcgis.com/tiles/jJQWqgqiNhLLjkin/arcgis/rest/services/Gifu2021CS_Mosic/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "<a href='https://www.forest.rd.pref.gifu.lg.jp/shiyou/CSrittaizu.html' target='_blank'>岐阜県森林研究所</a>",
    });

    //赤色立体図10mメッシュR
    map.addSource('sekisyoku_Raster', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/sekishoku/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://www.rrim.jp/' target='_blank'>アジア航測株式会社</a>",
    });

    //OpenStreetMapR
    map.addSource('osm_Raster', {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
    });

    //Esri World StreetR
    map.addSource('esriWS_Raster', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
    });

    //Esri World ImageryR
    map.addSource('esriWI_Raster', {
        type: 'raster',
        tiles: ['https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        attribution: "&copy; <a href='http://osm.org/copyright'>ESRI</a> contributors",
    });

    //Stamen_tR
    map.addSource('Stamento_Raster', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //Stamen_TerrainR
    map.addSource('StamenT_Raster', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //Stamen_wR
    map.addSource('StamenW_Raster', {
        type: 'raster',
        tiles: ['https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg'],
        tileSize: 256,
        attribution: "&copy; <a href='https://stamen.com/'>Stamen</a> contributors",
    });

    //岐阜県共有空間データR
    map.addSource('gifukyouyu_Raster', {
        type: 'raster',
        tiles: ['https://mapdata.qchizu.xyz/gifu_pref_00/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://info.qchizu.xyz/qchizu/reprint/' target='_blank'>Q地図タイル</a>",
    });

    //Mapbox StreetsR
    map.addSource('mapboxS_Raster', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //Mapbox DarkR
    map.addSource('mapboxD_Raster', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //Mapbox Mapbox SateliteR
    map.addSource('mapboxSL_Raster', {
        type: 'raster',
        tiles: ['https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZW5zeXVyaW5naXMiLCJhIjoiY2t6cHBhdHp2MDFlMTJ3bmRsNzY4dTlkbiJ9.BtuWDU9uyDaR5Var2Y6-4A'],
        tileSize: 256,
        attribution: "&copy; <a href='https://www.mapbox.com/map-feedback/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
    });

    //★ベクターレイヤー読み込み

    //その他ポイント
    map.addSource('TITEN', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2em8xmn1yks21o4ey2m50br-8h3uo',
    });

    //道
    map.addSource('ENSYURIN_MITI', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2ms64e60f4t20nyp7xi4j4l-9xom5',
    });

    //川
    map.addSource('KAWA', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt76xfi0g0427r67smbkb9t-2ody0',
    });

    //サインポール
    map.addSource('ENSYURIN_pole', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt711bw5ofi25oh0n785jls-52uma',
    });

    //国有林
    map.addSource('kozyousan', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/kozyousan.geojson',
    });

    //林班合体
    map.addSource('ENSYURIN_rinhanzu', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt6y0c7089c2do2axbnkynn-9fnzh',
    });

    //林班別
    map.addSource('ENSYURIN_3rinhan', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt74982148421r055t98jgj-9zdam',
    });

    //未来の森づくり
    map.addSource('ENSYURIN_mirainomori', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2embn5f02tb28nac80mmgg5-1iftx',
    });

    //試験地
    map.addSource('ENSYURIN_sikenti', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt72fik07u223o2kyjqvyt8-4ds00',
    });

    //危険木
    map.addSource('ENSYURIN-kikenbokuH25', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt72vya0vu320pj4jqyrx92-5ye0d',
    });

    //等高線
    map.addSource('japan-gsi-contour-mts', {
        type: 'vector',
        url: 'mapbox://mapbox-japan.japan-gsi-contour-v1',
    });

    //標高点
    map.addSource('japan-gsi-elevpt-mts', {
        type: 'vector',
        url: 'mapbox://mapbox-japan.japan-gsi-elevpt-v1',
    });

    //OWL-立木データ
    map.addSource('OWL', {
        type: 'vector',
        url: 'mapbox://ensyuringis.ckzt75nrw5s7829ohn957uay3-9rkif',
    });

    //360度写真
    map.addSource('THETA360', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2coh9y71gjq2dnw9747n4f7-79iz1',
    });

    //駐車場
    map.addSource('tyusyazyo', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2emazhp118422ns7euzvif6-892gc',
    });

    //国土
    map.addSource('mapbox', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-streets-v8',
    });

    //★ラスターデータ読み込み

    //洪水浸水想定区域
    map.addSource('kousuisoutei', {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_pref_data/21/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://disaportal.gsi.go.jp/index.html' target='_blank'>ハザードマップポータルサイト</a>",
    });

    //土砂災害警戒区域（土石流）
    map.addSource('dosyadoseki', {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_dosekiryukeikaikuiki_data/21/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://disaportal.gsi.go.jp/index.html' target='_blank'>ハザードマップポータルサイト</a>",
    });

    //土砂災害警戒区域（急傾斜地の崩壊）
    map.addSource('dosyakyusyati', {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki_data/21/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://disaportal.gsi.go.jp/index.html' target='_blank'>ハザードマップポータルサイト</a>",
    });

    //土石流危険渓流
    map.addSource('dosekiryu', {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu_data/21/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://disaportal.gsi.go.jp/index.html' target='_blank'>ハザードマップポータルサイト</a>",
    });

    //急傾斜地崩壊危険箇所
    map.addSource('kyusyati', {
        type: 'raster',
        tiles: ['https://disaportaldata.gsi.go.jp/raster/05_kyukeisyachihoukai_data/21/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://disaportal.gsi.go.jp/index.html' target='_blank'>ハザードマップポータルサイト</a>",
    });

    // 全国傾斜量区分図(雪崩関連)
    map.addSource('keisyanadare', {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/slopezone1map/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='http://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html' target='_blank'>国土地理院</a>",
    });

    // 地すべり地形分布図日本全国版（防災科学技術研究所）
    map.addSource('zisuberi', {
        type: 'raster',
        tiles: ['https://jmapweb3v.bosai.go.jp/map/xyz/landslide/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "<a href='https://www.j-shis.bosai.go.jp/landslidemap' target='_blank'>防災科学技術研究所</a>",
    });

    //★geojsonデータ読み込み

    //自力建設＆アカデミー施設
    map.addSource('TATEMONO', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/TATEMONO.geojson',
    });

    //アカデミー施設名
    map.addSource('SISETU_NAME', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/SISETU_NAME.geojson',
    });

    //美濃市指定避難所
    map.addSource('MINOSI-hinan', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/MINOSI-hinan.geojson',
    });

    //美濃市指定緊急避難所
    map.addSource('MINOSI-kinkyuhinan.geojson', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/MINOSI-kinkyuhinan.geojson',
    });

    //フェノロジー2020
    map.addSource('fenorozi-2020', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/fenorozi-2020.geojson',
    });

    //鳥獣保護区等(H30)
    map.addSource('GIFU-tyouzyuhogokuH30', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/GIFU-tyouzyuhogokuH30.geojson',
    });

    //岐阜県表層地質
    map.addSource('GIFU-201tisitu', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/GIFU-201tisitu.geojson',
    });

    //岐阜県20万分の1土壌分類
    map.addSource('GIFU-201dozyo', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/GIFU-201dozyo.geojson',
    });

    //平面図-自力建設
    map.addSource('ZIRIKI-CAD', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/ZIRIKI-CAD.geojson',
    });

    //施設案内塔
    map.addSource('sisetuannaitou', {
        type: 'vector',
        url: 'mapbox://ensyuringis.cl2ema9zq4hg82do9vu7boodc-1p3wl',
    });

    //翔楓祭2021企画
    map.addSource('syohusai2021', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/ensyurinGIS/map/main/geojson/syohusai2021.geojson',
    });

    //ベースマップメニュー作成
    for (var i = 0; i < Object.keys(mapselectID).length; i++) {
        // レイヤID取得
        var id = Object.keys(mapselectID)[i];
        // aタグ作成
        var link = document.createElement('a');
        link.href = '#';
        // id追加
        link.id = id;
        // 名称追加
        link.textContent = mapselectID[id];

        // 初期表示m_mono以外非表示
        if (id === 'saisinsyasin_Base') {
            link.className = 'active';
        } else {
            map.setLayoutProperty(id, 'visibility', 'none');
            link.className = '';
        }

        //aタグクリック処理
        link.onclick = function (e) {
            // id取得
            var clickedLayer = this.id;
            e.preventDefault();
            e.stopPropagation();

            for (var j = 0; j < Object.keys(mapselectID).length; j++) {
                // レイヤID取得
                var ch_id = Object.keys(mapselectID)[j];

                // レイヤの表示・非表示
                if (ch_id === clickedLayer) {
                    // クリックしたレイヤを表示
                    this.className = 'active';
                    map.addLayer({
                        id: clickedLayer,
                        type: 'raster',
                        source: clickedLayer,
                        minzoom: 0,
                        maxzoom: 24,
                        paint: {
                            'raster-opacity': 1,
                            'raster-brightness-min': 0,
                            'raster-brightness-max': 1,
                            'raster-contrast': 0,
                            'raster-saturation': 0,
                        },
                    });
                    // 空レイヤーの下に挿入
                    map.moveLayer(clickedLayer, 'mapbase');
                } else {
                    // クリックしたレイヤ以外を非表示
                    var ch_obj = document.getElementById(ch_id);
                    ch_obj.className = '';
                    map.removeLayer(ch_id);
                }
            }

            //カラープロパティセット
            document.getElementById('property_base').value = clickedLayer;
            CangeBase();
        };

        // レイヤメニューにレイヤ追加
        var layers = document.getElementById('menu_base');
        layers.appendChild(link);
    }

    //ラスターメニュー作成
    for (var i = 0; i < Object.keys(rasterselectID).length; i++) {
        // レイヤID取得
        var id = Object.keys(rasterselectID)[i];
        // aタグ作成
        var link = document.createElement('a');
        link.href = '#';
        // id追加
        link.id = id;
        // 名称追加
        link.textContent = rasterselectID[id];

        // 初期表示m_mono以外非表示
        if (id === 'nasi_Raster') {
            link.className = 'active';
        } else {
            map.setLayoutProperty(id, 'visibility', 'none');
            link.className = '';
        }

        //aタグクリック処理
        link.onclick = function (e) {
            // id取得
            var clickedLayer2 = this.id;
            e.preventDefault();
            e.stopPropagation();

            for (var j = 0; j < Object.keys(rasterselectID).length; j++) {
                // レイヤID取得
                var ch_id2 = Object.keys(rasterselectID)[j];

                // レイヤの表示・非表示
                if (ch_id2 === clickedLayer2) {
                    // クリックしたレイヤを表示
                    this.className = 'active';
                    map.addLayer({
                        id: clickedLayer2,
                        type: 'raster',
                        source: clickedLayer2,
                        minzoom: 0,
                        maxzoom: 24,
                        paint: {
                            'raster-opacity': 0.5,
                            'raster-brightness-min': 0,
                            'raster-brightness-max': 1,
                            'raster-contrast': 0,
                            'raster-saturation': 0,
                        },
                    });
                    // 空レイヤーの下に挿入
                    map.moveLayer(clickedLayer2, 'rasterbase');
                } else {
                    // クリックしたレイヤ以外を非表示
                    var ch_obj = document.getElementById(ch_id2);
                    ch_obj.className = '';
                    map.removeLayer(ch_id2);
                }
            }

            //カラープロパティセット
            document.getElementById('property_raster').value = clickedLayer2;
            CangeRaster();
        };

        // レイヤメニューにレイヤ追加
        var layers = document.getElementById('menu_raster');
        layers.appendChild(link);
    }

    //★レイヤーの挿入

    //★初期ベースマップレイヤー
    map.addLayer({
        id: 'saisinsyasin_Base',
        type: 'raster',
        source: 'saisinsyasin_Base',
        minzoom: 0,
        maxzoom: 24,
        paint: {
            'raster-opacity': 1,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-contrast': 0,
            'raster-saturation': 0,
        },
    });

    //★初期ラスターレイヤー
    map.addLayer({
        id: 'nasi_Raster',
        type: 'raster',
        source: 'nasi_Raster',
        minzoom: 0,
        maxzoom: 24,
        paint: {
            'raster-opacity': 0,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-contrast': 0,
            'raster-saturation': 0,
        },
    });

    //挿入用透明マップベース
    map.addLayer({
        id: 'mapbase',
        type: 'raster',
        source: 'nasi_Raster',
        minzoom: 0,
        maxzoom: 0,
        paint: {
            'raster-opacity': 0,
        },
    });

    //挿入用透明ラスターベース
    map.addLayer({
        id: 'rasterbase',
        type: 'raster',
        source: 'nasi_Raster',
        minzoom: 0,
        maxzoom: 0,
        paint: {
            'raster-opacity': 0,
        },
    });

    //全国傾斜量区分図（雪崩関連）
    map.addLayer({
        id: '全国傾斜量区分図（雪崩関連）',
        type: 'raster',
        source: 'keisyanadare',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 1,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-contrast': 0,
            'raster-saturation': 0,
        },
    });

    //地すべり地形分布図
    map.addLayer({
        id: '地すべり地形分布図',
        type: 'raster',
        source: 'zisuberi',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 1,
            'raster-brightness-min': 0,
            'raster-brightness-max': 1,
            'raster-contrast': 0,
            'raster-saturation': 0,
        },
    });

    map.addLayer({
        id: '岐阜県20万分の1表層地質',
        type: 'fill',
        source: 'GIFU-201tisitu',
        filter: ['all', ['match', ['geometry-type'], ['Polygon'], true, false]],
        layout: {
            visibility: 'none',
        },
        paint: {
            'fill-opacity': 0.58,
            'fill-color': [
                'match',
                ['get', '属性2'],
                ['凝灰質岩石'],
                'hsl(255, 81%, 41%)',
                ['砂'],
                'hsl(36, 77%, 47%)',
                ['輝緑凝灰岩'],
                'hsl(0, 36%, 63%)',
                ['泥岩'],
                'hsl(141, 52%, 38%)',
                ['泥'],
                'hsl(85, 59%, 31%)',
                ['砂岩'],
                'hsl(0, 40%, 58%)',
                ['火山砕屑物'],
                'hsl(154, 30%, 17%)',
                ['片麻岩類'],
                'hsl(304, 82%, 40%)',
                ['礫'],
                'hsl(111, 32%, 53%)',
                ['石灰岩'],
                'hsl(0, 8%, 78%)',
                ['玄武岩質岩石'],
                'hsl(291, 78%, 81%)',
                ['チャート'],
                'hsl(0, 0%, 66%)',
                ['蛇紋岩質岩石'],
                'hsl(52, 34%, 28%)',
                ['砂岩・貢岩・礫岩互層'],
                'hsl(317, 82%, 34%)',
                ['礫・砂・粘土'],
                'hsl(160, 31%, 44%)',
                ['花崗岩質岩石'],
                'hsl(213, 11%, 52%)',
                ['安山岩質岩石'],
                'hsl(232, 56%, 60%)',
                ['斑レイ岩質岩石'],
                'hsl(121, 49%, 29%)',
                ['流紋岩質岩石'],
                'hsl(13, 35%, 68%)',
                ['結晶片岩類'],
                'hsl(167, 66%, 67%)',
                ['斑岩'],
                'hsl(134, 25%, 30%)',
                ['礫岩'],
                'hsl(344, 77%, 71%)',
                ['砂岩・貢岩互層（非変成）'],
                'hsl(0, 11%, 59%)',
                'hsl(0, 76%, 100%)',
            ],
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        id: '岐阜県20万分の1表層地質-断層',
        type: 'line',
        source: 'GIFU-201tisitu',
        filter: ['all', ['match', ['geometry-type'], ['LineString'], true, false]],
        layout: {
            visibility: 'none',
        },
        paint: {
            'line-width': 3,
            'line-opacity': 1,
            'line-color': '#000000',
        },
    });

    map.addLayer({
        id: '岐阜県20万分の1土壌分類',
        type: 'fill',
        source: 'GIFU-201dozyo',
        layout: {
            visibility: 'none',
        },
        paint: {
            'fill-opacity': 0.58,
            'fill-color': [
                'match',
                ['get', '属性1'],
                ['グライ土'],
                '#4455c4',
                ['ポドゾル'],
                '#4390fe',
                ['灰色低地土'],
                '#1fc9dd',
                ['褐色森林土'],
                '#2aefa1',
                ['褐色低地土'],
                '#7eff55',
                ['岩屑土'],
                '#c2f234',
                ['岩石地'],
                '#f2c93a',
                ['黒ボク土'],
                '#fe8f29',
                ['赤黄色土'],
                '#e94d0d',
                ['泥炭土'],
                '#bd2002',
                ['未熟土'],
                '#7a0403',
                '#30123b',
            ],
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        id: '洪水浸水想定区域',
        type: 'raster',
        source: 'kousuisoutei',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 0.6,
        },
    });

    map.addLayer({
        id: '土砂災害警戒区域（土石流）',
        type: 'raster',
        source: 'dosyadoseki',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 0.6,
        },
    });

    map.addLayer({
        id: '土砂災害警戒区域（急傾斜地の崩壊）',
        type: 'raster',
        source: 'dosyakyusyati',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 0.6,
        },
    });

    map.addLayer({
        id: '土石流危険渓流',
        type: 'raster',
        source: 'dosekiryu',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 0.6,
        },
    });

    map.addLayer({
        id: '急傾斜地崩壊危険箇所',
        type: 'raster',
        source: 'kyusyati',
        minzoom: 0,
        maxzoom: 24,
        layout: {
            visibility: 'none',
        },
        paint: {
            'raster-opacity': 0.6,
        },
    });

    map.addLayer({
        id: '岐阜県鳥獣保護区等(H30)',
        type: 'fill',
        source: 'GIFU-tyouzyuhogokuH30',
        layout: {
            visibility: 'none',
        },
        paint: {
            'fill-opacity': 0.58,
            'fill-color': [
                'match',
                ['get', '種類'],
                ['鳥獣保護区'],
                'hsl(193, 63%, 58%)',
                ['特定猟具禁止区域（銃）'],
                'hsl(0, 84%, 52%)',
                ['特別鳥獣保護区'],
                'hsl(118, 57%, 39%)',
                ['休猟区'],
                'hsl(98, 83%, 56%)',
                ['指定猟法禁止区域（鉛）'],
                'hsl(49, 79%, 50%)',
                ['猟区'],
                'hsl(29, 86%, 58%)',
                '#000000',
            ],
        },
    });

    map.addLayer({
        'id': '行政区画',
        'type': 'line',
        'source': 'mapbox',
        'source-layer': 'admin',
        'layout': {
            visibility: 'none',
        },
        'paint': {
            'line-opacity': 1,
            'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.1, 22, 9],
            'line-color': '#02b6a1',
            'line-opacity': 1,
        },
    });

    map.addLayer({
        'id': '行政区画-ラベル',
        'type': 'symbol',
        'source': 'mapbox',
        'source-layer': 'place_label',
        'layout': {
            'visibility': 'none',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': ['case', ['match', ['get', 'type'], ['city'], true, false], 17, 13],
        },
        'paint': {
            'text-halo-color': '#ffffff',
            'text-halo-width': 3,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '古城山国有林-林分',
        type: 'fill',
        source: 'kozyousan',
        layout: {
            visibility: 'none',
        },
        paint: {
            'fill-opacity': 0.4,
            'fill-color': ['match', ['get', '国有林_樹種１'], ['スギ'], '#3a9310', ['ヒノキ'], '#4adea5', ['アカマツ'], '#DD2B2B', ['他Ｌ'], '#ecbd22', ['天ヒノキ'], '#34eac2', '#000000'],
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        id: '古城山国有林-林分境界線',
        type: 'line',
        source: 'kozyousan',
        layout: {
            visibility: 'none',
        },
        paint: {
            'line-width': 1.5,
            'line-opacity': 1,
            'line-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-スギ林',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['スギ'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#399210',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-ヒノキ林',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['ヒノキ'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#4ADDA5',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-アカマツ林',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['アカマツ'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#DD2B2B',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-スラッシュマツ林',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['スラッシュマツ'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#B720BF',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-広葉樹林',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['広葉樹'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#EBBC22',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-草地',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['草地'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#2351E5',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-その他岩石',
        'type': 'fill',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'filter': ['all', ['match', ['get', '樹種'], ['その他岩石'], true, false]],
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'fill-opacity': 0.4,
            'fill-color': '#D98F34',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '演習林-小林班境界線',
        'type': 'line',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'line-color': '#000000',
            'line-width': 1.5,
            'line-opacity': 1,
        },
    });

    map.addLayer({
        'id': '演習林-林班境界線',
        'type': 'line',
        'source': 'ENSYURIN_3rinhan',
        'source-layer': 'ENSYURIN_3rinhan',
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'line-color': '#000000',
            'line-opacity': 1,
            'line-width': 2,
        },
    });

    map.addLayer({
        'id': '未来の森づくり予定地',
        'type': 'fill',
        'source': 'ENSYURIN_mirainomori',
        'source-layer': 'ENSYURIN_mirainomori',
        'layout': {
            visibility: 'none',
        },
        'paint': {
            'fill-color': '#ffff00',
            'fill-opacity': 1,
        },
    });

    map.addLayer({
        id: 'アカデミー施設・その他建物',
        source: 'TATEMONO',
        type: 'fill',
        filter: ['all', ['match', ['get', 'カテゴリ'], ['建物'], true, false]],
        layout: {
            visibility: 'visible',
        },
        paint: {
            'fill-color': '#47504F',
            'fill-opacity': 1,
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '川',
        'type': 'line',
        'source': 'KAWA',
        'source-layer': 'KAWA',
        'layout': {
            visibility: 'visible',
        },
        'paint': {
            'line-opacity': 0.8,
            'line-width': 5,
            'line-color': '#0f7acc',
        },
    });

    map.addLayer({
        'id': '道',
        'type': 'line',
        'source': 'ENSYURIN_MITI',
        'source-layer': 'ENSYURIN_MITI',
        'layout': {
            'visibility': 'visible',
            'line-join': 'bevel',
        },
        'paint': {
            'line-opacity': 0.8,
            'line-color': '#8e8e7b',
            'line-width': ['match', ['get', '種類'], ['林道'], 10, 5],
        },
    });

    map.addLayer({
        'id': '演習林-林分ラベル',
        'source': 'ENSYURIN_rinhanzu',
        'source-layer': 'ENSYURIN_rinhanzu',
        'type': 'symbol',
        'layout': {
            'visibility': 'visible',
            'text-field': [
                'match',
                ['get', '樹種'],
                ['広葉樹'],
                ['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
                ['草地'],
                ['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
                ['その他岩石'],
                ['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種']]],
                ['to-string', ['concat', ['get', '小林班ID'], '\n', ['get', '樹種'], ' ', ['+', ['get', '林齢'], 3], '年生']],
            ],
            'text-max-width': 12,
            'text-size': 12,
            // "text-variable-anchor": ["top", "bottom", "left", "right"],
            // "text-radial-offset": 0.5,
            // "text-justify": "auto",
        },
        'paint': {
            'text-color': '#000000',
            'text-halo-color': '#e0e0e0',
            'text-halo-width': 2,
            'text-opacity': 1,
        },
    });

    map.addLayer({
        id: '古城山国有林-林分ラベル',
        source: 'kozyousan',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': [
                'case',
                ['match', ['get', '国有林_樹種１'], ['他Ｌ'], true, false],
                ['to-string', ['concat', ['get', '国有林_名前'], '\n', '広葉樹']],
                ['match', ['get', '国有林_林小班名称'], ['3142_林班_イ', '3147_林班_イ', '3147_林班_ロ', '3149_林班_イ'], true, false],
                ['to-string', ['get', '国有林_名前']],
                ['to-string', ['concat', ['get', '国有林_名前'], '\n', ['get', '国有林_樹種１'], ' ', ['+', ['get', '国有林_最新林齢１'], 3], '年生']],
            ],
            'text-max-width': 12,
            'text-size': 12,
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
        },
    });

    map.addLayer({
        'id': '駐車場',
        'type': 'fill',
        'source': 'tyusyazyo',
        'source-layer': 'tyusyazyo',
        'layout': {
            visibility: 'none',
        },
        'paint': {
            'fill-color': '#4a8fe3',
            'fill-opacity': 0.6,
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '岐阜県森林研究所-試験地',
        'type': 'fill',
        'source': 'ENSYURIN_sikenti',
        'source-layer': 'ENSYURIN_sikenti',
        'layout': {
            visibility: 'none',
        },
        'paint': {
            'fill-opacity': 0.8,
            'fill-color': '#26BBF2',
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        'id': '岐阜県森林研究所-試験地-ラベル',
        'source': 'ENSYURIN_sikenti',
        'source-layer': 'ENSYURIN_sikenti',
        'type': 'symbol',
        'layout': {
            'visibility': 'none',
            'text-field': [
                'match',
                ['get', '活用期間'],
                ['不明～'],
                ['to-string', ['concat', '？年～', '\n', ['get', '活用内容']]],
                ['to-string', ['concat', ['get', '活用期間'], '\n', ['get', '活用内容']]],
            ],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 14,
        },
        'paint': {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-opacity': 1,
            'text-halo-width': 1,
        },
    });

    map.addLayer({
        id: '自力建設',
        type: 'fill',
        source: 'TATEMONO',
        filter: ['all', ['match', ['get', 'カテゴリ'], ['自力建設'], true, false]],
        layout: {
            visibility: 'visible',
        },
        paint: {
            'fill-color': '#AE5424',
            'fill-opacity': 1,
            'fill-outline-color': '#000000',
        },
    });

    map.addLayer({
        id: '岐阜県20万分の1表層地質-ラベル',
        source: 'GIFU-201tisitu',
        filter: ['all', ['match', ['geometry-type'], ['Polygon'], true, false]],
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '属性2']],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-opacity': 1,
            'text-halo-width': 1,
        },
    });

    map.addLayer({
        id: '岐阜県20万分の1土壌分類-ラベル',
        source: 'GIFU-201dozyo',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '属性2']],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-opacity': 1,
            'text-halo-width': 1,
        },
    });

    map.addLayer({
        id: '岐阜県鳥獣保護区等(H30)-ラベル',
        source: 'GIFU-tyouzyuhogokuH30',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '種類']],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
        },
        paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-opacity': 1,
            'text-halo-width': 1,
        },
    });

    map.addLayer({
        id: '自力建設-ラベル',
        source: 'SISETU_NAME',
        type: 'symbol',
        filter: ['all', ['match', ['get', 'カテゴリ'], ['自力建設'], true, false]],
        layout: {
            'visibility': 'visible',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': 14,
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
            'icon-image': 'dot-11',
        },
        paint: {
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-opacity': 1,
            'text-color': '#ef9271',
        },
    });

    map.addLayer({
        id: 'アカデミー施設・その他建物-ラベル',
        source: 'SISETU_NAME',
        type: 'symbol',
        filter: ['all', ['match', ['get', 'カテゴリ'], ['建物', 'その他'], true, false]],
        layout: {
            'visibility': 'visible',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': 14,
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': [
                'case',
                ['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false],
                'morinosuマーク',
                ['match', ['get', 'name'], ['アカデミーセンター'], true, false],
                'アカデミーマークアイコン',
                'dot-11',
            ],
            'icon-size': ['case', ['match', ['get', 'name'], ['森林総合教育センター(morinos)'], true, false], 0.4, ['match', ['get', 'name'], ['アカデミーセンター'], true, false], 0.3, 1],
        },
        paint: {
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-opacity': 1,
            'text-color': '#ffffff',
        },
    });

    map.addLayer({
        'id': '等高線',
        'type': 'line',
        'source': 'japan-gsi-contour-mts',
        'source-layer': 'japan-gsi-contour-mts',
        'layout': {
            'visibility': 'none',
            'line-join': 'round',
            'line-cap': 'round',
        },
        'paint': {
            'line-color': '#05CB63',
            'line-width': 1,
            'line-opacity': 1,
        },
    });

    map.addLayer({
        'id': '等高線-標高ラベル',
        'source': 'japan-gsi-contour-mts',
        'source-layer': 'japan-gsi-contour-mts',
        'type': 'symbol',
        'layout': {
            'visibility': 'none',
            'text-field': ['to-string', ['get', 'ele']],
            'text-size': 12,
            'symbol-placement': 'line',
            'symbol-spacing': 200,
        },
        'paint': {
            'text-color': '#000000',
            'text-halo-color': '#FFFFFF',
            'text-opacity': 1,
            'text-halo-width': 1,
        },
    });

    map.addLayer({
        'id': '標高点',
        'source': 'japan-gsi-elevpt-mts',
        'source-layer': 'japan-gsi-elevpt-mts',
        'type': 'symbol',
        'layout': {
            'visibility': 'none',
            'text-field': ['concat', ['to-string', ['get', 'ele']], 'm'],
            'text-offset': [0, -1],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': 'mountain',
        },
        'paint': {
            'text-halo-color': '#000000',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#FFFFFF',
        },
    });

    map.addLayer({
        'id': 'その他地点',
        'source': 'TITEN',
        'source-layer': 'TITEN',
        'type': 'symbol',
        'layout': {
            'visibility': 'visible',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': 14,
            'text-offset': [0, -1],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': [
                'case',
                ['match', ['get', 'name'], ['山の神'], true, false],
                'monument-JP',
                ['match', ['get', 'name'], ['青樹滝', '蛇尾滝'], true, false],
                'waterfall',
                ['match', ['get', '種類'], ['岩'], true, false],
                'triangle',
                ['match', ['get', 'name'], ['トイレ'], true, false],
                'toilet',
                ['match', ['get', 'name'], ['古城山山頂'], true, false],
                'mountain',
                ['match', ['get', 'name'], ['車止めゲート', '国有林ゲート', 'チェーンゲート'], true, false],
                'marker',
                ['match', ['get', 'name'], ['大杉'], true, false],
                'park',
                ['match', ['get', '種類'], ['駅'], true, false],
                'rail',
                ['match', ['get', '種類'], ['東屋'], true, false],
                'home',
                ['match', ['get', 'name'], ['炭焼き小屋'], true, false],
                'home',
                ['match', ['get', '種類'], ['橋'], true, false],
                'bridge',
                ['match', ['get', '種類'], ['鉄塔'], true, false],
                '鉄塔',
                'dot-11',
            ],
            'icon-size': ['case', ['match', ['get', '種類'], ['鉄塔'], true, false], 0.05, 1],
        },
        'paint': {
            'text-halo-color': '#000000',
            'text-halo-width': 2,
            'text-opacity': 1,
            'text-color': '#99B8FF',
        },
    });

    map.addLayer({
        'id': 'サインポール',
        'source': 'ENSYURIN_pole',
        'source-layer': 'ENSYURIN_pole',
        'type': 'symbol',
        'layout': {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '名前']],
            'text-offset': [0, -1],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': 'circle',
        },
        'paint': {
            'text-halo-color': '#000000',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#FA4B4B',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020(統計記録密度)',
        type: 'heatmap',
        source: 'fenorozi-2020',
        layout: {
            visibility: 'none',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-植物',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['植物'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'syokubutu',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-昆虫',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['昆虫'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'musi',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-菌類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['菌類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'kinoko',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-鳥類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['鳥類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'tori',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-哺乳類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['哺乳類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'honyuurui',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-爬虫類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['爬虫類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'hebi',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-魚類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['魚類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'sakana',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-両生類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['両生類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'kaeru',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-多足類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['多足類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'kumo',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-地衣類',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['地衣類'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'syokubutu',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-コケ',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['コケ'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'syokubutu',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-シダ植物',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['シダ植物'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'syokubutu',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '森林環境教育専攻-フェノロジー調査2020-虫こぶ',
        type: 'symbol',
        source: 'fenorozi-2020',
        filter: ['all', ['match', ['get', '分類群'], ['虫こぶ'], true, false]],
        layout: {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'musi',
            'icon-size': 0.05,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '種名'], '\n', ['get', '状態']]],
        },
        paint: {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        'id': '林業専攻-OWL利用研修立木計測データ',
        'type': 'circle',
        'source': 'OWL',
        'source-layer': 'OWL',
        'layout': {
            visibility: 'none',
        },
        'paint': {
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
            'circle-color': ['interpolate', ['linear'], ['get', '樹高m'], 4.1, 'hsl(52, 93%, 85%)', 18.7, 'hsl(0, 79%, 57%)'],
            'circle-radius': ['interpolate', ['linear'], ['get', '胸高直径cm'], 7, 5, 42.5, 10],
            // "circle-opacity" :0
        },
    });

    map.addLayer({
        'id': '林業専攻-OWL利用研修立木計測データ-ラベル',
        'type': 'symbol',
        'source': 'OWL',
        'source-layer': 'OWL',
        'layout': {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '樹種'], '\nDBH：', ['get', '胸高直径cm'], 'cm']],
        },
        'paint': {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        'id': 'アカデミー危険木調査結果(H25)',
        'type': 'symbol',
        'source': 'ENSYURIN-kikenbokuH25',
        'source-layer': 'ENSYURIN-kikenbokuH25',
        'layout': {
            'visibility': 'none',
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'text-size': 12,
            'text-radial-offset': 1,
            'icon-image': 'caution',
            'text-justify': 'left',
            'text-anchor': 'bottom-left',
            'text-field': ['to-string', ['concat', ['get', '樹種'], '\n', ['get', '状態']]],
        },
        'paint': {
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#610404',
        },
    });

    map.addLayer({
        id: '美濃市指定緊急避難場所',
        source: 'MINOSI-kinkyuhinan.geojson',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '名称']],
            'text-offset': [0, -1],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': 'siteikinkyuhinanzyo',
            'icon-size': 1.5,
        },
        paint: {
            'text-halo-color': '#000000',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#FFFFFF',
        },
    });

    map.addLayer({
        id: '美濃市指定避難場所',
        source: 'MINOSI-hinan',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', '名称']],
            'text-offset': [0, -1],
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': 'siteihinanzyo',
            'icon-size': 1.5,
        },
        paint: {
            'text-halo-color': '#000000',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#FFFFFF',
        },
    });

    map.addLayer({
        id: '木造建築専攻-自力建設平面図',
        type: 'line',
        source: 'ZIRIKI-CAD',
        layout: {
            visibility: 'none',
        },
        paint: {
            'line-color': '#00FBFF',
            'line-opacity': 1,
            'line-width': 1,
        },
    });

    map.addLayer({
        'id': '施設案内塔',
        'source': 'sisetuannaitou',
        'source-layer': 'sisetuannaitou',
        'type': 'symbol',
        'layout': {
            'visibility': 'none',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': 14,
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': 'monument',
            'icon-size': 1,
        },
        'paint': {
            'text-halo-color': '#ffffff',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    map.addLayer({
        id: '翔楓祭2021企画',
        source: 'syohusai2021',
        type: 'symbol',
        layout: {
            'visibility': 'none',
            'text-field': ['to-string', ['get', 'name']],
            'text-size': 14,
            'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
            'text-radial-offset': 0.5,
            'text-justify': 'auto',
            'icon-image': '翔楓祭',
            'icon-size': 0.05,
        },
        paint: {
            'text-halo-color': '#ffffff',
            'text-halo-width': 1,
            'text-opacity': 1,
            'text-color': '#000000',
        },
    });

    //アカデミーマップアイコン
    map.loadImage('https://raw.githubusercontent.com/ensyurinGIS/map/main/sozai/mapicon.png', (error, image) => {
        if (error) throw error;
        map.addImage('mapicon', image);

        map.addSource('mapicon', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [136.91826224059088, 35.555001266741186],
                        },
                    },
                ],
            },
        });

        map.addLayer({
            id: 'mapicon',
            type: 'symbol',
            source: 'mapicon',
            layout: {
                'icon-image': 'mapicon',
                'icon-size': 0.25,
            },
        });
        map.setLayerZoomRange('mapicon', 0, 11);
    });
});

const toggleableLayerIds = [
    'その他地点',
    '道',
    '川',
    'アカデミー施設・その他建物',
    'アカデミー施設・その他建物-ラベル',
    '自力建設',
    '自力建設-ラベル',
    '演習林-スギ林',
    '演習林-ヒノキ林',
    '演習林-アカマツ林',
    '演習林-スラッシュマツ林',
    '演習林-広葉樹林',
    '演習林-草地',
    '演習林-その他岩石',
    '演習林-林分ラベル',
    '演習林-小林班境界線',
    '演習林-林班境界線',
];

//各レイヤーに対応するトグルボタンを設定します。
for (const id of toggleableLayerIds) {
    //リンクを作成。
    const link = document.createElement('a');
    link.id = id;
    link.href = '#';
    link.textContent = id;
    link.className = 'active';

    //トグルがクリックされたときにレイヤーを表示または非表示。
    link.onclick = function (e) {
        const clickedLayer = this.textContent;
        e.preventDefault();
        e.stopPropagation();

        const visibility = map.getLayoutProperty(clickedLayer, 'visibility');

        if (visibility === 'visible') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            this.className = '';
        } else {
            this.className = 'active';
            map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
        }
    };

    const layers = document.getElementById('menu_vector');
    layers.appendChild(link);
}

//レイヤー初期非表示
const toggleableLayerIds2 = [
    '未来の森づくり予定地',
    '施設案内塔',
    '駐車場',
    'サインポール',
    '岐阜県森林研究所-試験地',
    '岐阜県森林研究所-試験地-ラベル',
    'アカデミー危険木調査結果(H25)',
    '林業専攻-OWL利用研修立木計測データ',
    '林業専攻-OWL利用研修立木計測データ-ラベル',
    '森林環境教育専攻-フェノロジー調査2020-植物',
    '森林環境教育専攻-フェノロジー調査2020-昆虫',
    '森林環境教育専攻-フェノロジー調査2020-哺乳類',
    '森林環境教育専攻-フェノロジー調査2020-鳥類',
    '森林環境教育専攻-フェノロジー調査2020-菌類',
    '森林環境教育専攻-フェノロジー調査2020-爬虫類',
    '森林環境教育専攻-フェノロジー調査2020-魚類',
    '森林環境教育専攻-フェノロジー調査2020-両生類',
    '森林環境教育専攻-フェノロジー調査2020-多足類',
    '森林環境教育専攻-フェノロジー調査2020-地衣類',
    '森林環境教育専攻-フェノロジー調査2020-コケ',
    '森林環境教育専攻-フェノロジー調査2020-シダ植物',
    '森林環境教育専攻-フェノロジー調査2020-虫こぶ',
    '森林環境教育専攻-フェノロジー調査2020(統計記録密度)',
    '木造建築専攻-自力建設平面図',
    '翔楓祭2021企画',
    '古城山国有林-林分',
    '古城山国有林-林分境界線',
    '古城山国有林-林分ラベル',
    '等高線',
    '等高線-標高ラベル',
    '標高点',
    '洪水浸水想定区域',
    '土砂災害警戒区域（土石流）',
    '土砂災害警戒区域（急傾斜地の崩壊）',
    '土石流危険渓流',
    '急傾斜地崩壊危険箇所',
    '美濃市指定避難場所',
    '美濃市指定緊急避難場所',
    '岐阜県鳥獣保護区等(H30)',
    '岐阜県鳥獣保護区等(H30)-ラベル',
    '岐阜県20万分の1表層地質',
    '岐阜県20万分の1表層地質-断層',
    '岐阜県20万分の1表層地質-ラベル',
    '岐阜県20万分の1土壌分類',
    '岐阜県20万分の1土壌分類-ラベル',
    '地すべり地形分布図',
    '全国傾斜量区分図（雪崩関連）',
    '行政区画',
    '行政区画-ラベル',
];

//各レイヤーに対応するトグルボタンを設定します。
for (const id of toggleableLayerIds2) {
    //リンクを作成します。
    const link = document.createElement('a');
    link.id = id;
    link.href = '#';
    link.textContent = id;
    link.className = '';

    //トグルがクリックされたときにレイヤーを表示または非表示にします。
    link.onclick = function (e) {
        const clickedLayer = this.textContent;
        e.preventDefault();
        e.stopPropagation();

        const visibility = map.getLayoutProperty(clickedLayer, 'visibility');

        //レイアウトオブジェクトのvisibilityプロパティを変更して、レイヤーの可視性を切り替えます。
        if (visibility === 'visible') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none');
            this.className = '';
        } else {
            this.className = 'active';
            map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
        }
    };

    const layers = document.getElementById('menu_vector');
    layers.appendChild(link);
}
