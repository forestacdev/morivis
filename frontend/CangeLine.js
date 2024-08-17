//セレクトボタンのIDを列挙します。
const lineselectID = ['道', '川', '演習林-小林班境界線', '演習林-林班境界線', '木造建築専攻-自力建設平面図', '古城山国有林-林分境界線', '等高線', '岐阜県20万分の1表層地質-断層', '行政区画'];

//セレクトボタンを追加
for (const id of lineselectID) {
    if (document.getElementById(id)) {
        continue;
    }

    const option = document.createElement('option');
    option.id = id;
    option.text = id;
    const select = document.getElementById('property_line');
    select.appendChild(option);
}

document.querySelector('#selectcolor_line').addEventListener('input', (event) => {
    var layer = document.getElementById('property_line');
    var colorval = event.target.value;
    map.setPaintProperty(layer.value, 'line-color', colorval);
});

slider_line_width.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_line_width_value');
    map.setPaintProperty(property_line.value, 'line-width', parseInt(e.target.value, 10) / 100);
    sliderValue.textContent = e.target.value / 100;
});

slider_line_opacity.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_line_opacity_value');
    map.setPaintProperty(property_line.value, 'line-opacity', parseInt(e.target.value, 10) / 100);
    sliderValue.textContent = e.target.value + '%';
});

function CangeLine() {
    var layer = document.getElementById('property_line');

    var nowcolor = map.getPaintProperty(layer.value, 'line-color');
    document.getElementById('selectcolor_line').value = nowcolor;

    var nowwidth = map.getPaintProperty(layer.value, 'line-width') * 100;
    const sliderValueW = document.getElementById('slider_line_width_value');
    document.getElementById('slider_line_width').value = Math.trunc(nowwidth);
    sliderValueW.textContent = Math.trunc(nowwidth) / 100;

    var nowopacity = map.getPaintProperty(layer.value, 'line-opacity') * 100;
    const sliderValueO = document.getElementById('slider_line_opacity_value');
    document.getElementById('slider_line_opacity').value = Math.trunc(nowopacity);
    sliderValueO.textContent = Math.trunc(nowopacity) + '%';
}
