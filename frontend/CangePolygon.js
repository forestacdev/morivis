//セレクトボタンのIDを列挙します。
const PolygonselectID = [
    "アカデミー施設・その他建物",
    "自力建設",
    "演習林-スギ林",
    "演習林-ヒノキ林",
    "演習林-アカマツ林",
    "演習林-スラッシュマツ林",
    "演習林-広葉樹林",
    "演習林-草地",
    "演習林-その他岩石",
    "未来の森づくり予定地",
    "駐車場",
    "岐阜県森林研究所-試験地",
];

  //セレクトボタンを追加
for (const id of PolygonselectID) {

    if (document.getElementById(id)) {
    continue;
    }

    const option = document.createElement("option");
    option.id = id;
    option.text = id;
    const select = document.getElementById("property_Polygon");
    select.appendChild(option);
}

document.querySelector("#selectcolor_Polygon").addEventListener('input',(event)=>{
    //色が変更された場合に色情報を取得する
    var layer = document.getElementById('property_Polygon');
    var colorval = event.target.value;
    map.setPaintProperty(layer.value, 'fill-color', colorval);
});

slider_Polygon_opacity.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_Polygon_opacity_value');
    map.setPaintProperty(
        property_Polygon.value,
        'fill-opacity',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value + '%';
});

function CangePolygon(){
    var layer = document.getElementById('property_Polygon');

    var nowcolor = map.getPaintProperty(layer.value, 'fill-color');
    document.getElementById( "selectcolor_Polygon" ).value = nowcolor;

    var nowopacity = map.getPaintProperty(layer.value, 'fill-opacity',) * 100;
    const sliderValueO = document.getElementById('slider_Polygon_opacity_value');
    document.getElementById( "slider_Polygon_opacity" ).value = Math.trunc(nowopacity);
    sliderValueO.textContent = Math.trunc(nowopacity) + '%';
}