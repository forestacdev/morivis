  //セレクトボタンを追加
for (var i = 0; i < Object.keys(mapselectID).length; i++) {

    const id = Object.keys(mapselectID)[i];
    const option = document.createElement("option");
    option.value = id;
    option.text = mapselectID[id];
    const select = document.getElementById("property_base");
    select.appendChild(option);
}

//スライダー設定
slider_base_opacity.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_base_opacity_value');
    map.setPaintProperty(
        property_base.value,
        'raster-opacity',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value + '%';
});

slider_base_saturation.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_base_saturation_value');
    map.setPaintProperty(
        property_base.value,
        'raster-saturation',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_base_contrast.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_base_contrast_value');
    map.setPaintProperty(
        property_base.value,
        'raster-contrast',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_base_brightnessmin.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_base_brightnessmin_value');
    map.setPaintProperty(
        property_base.value,
        'raster-brightness-min',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_base_brightnessmax.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_base_brightnessmax_value');
    map.setPaintProperty(
        property_base.value,
        'raster-brightness-max',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

function CangeBase(){
    const layer = document.getElementById('property_base');

    const sliderValueO = document.getElementById('slider_base_opacity_value');
    const nowopacity = map.getPaintProperty(layer.value, 'raster-opacity',) * 100;
    document.getElementById( "slider_base_opacity" ).value = Math.trunc(nowopacity);
    sliderValueO.textContent = Math.trunc(nowopacity) + '%';

    const nowsikiso = map.getPaintProperty(layer.value, 'raster-saturation',) * 100;
    const sliderValueS = document.getElementById('slider_base_saturation_value');
    document.getElementById( "slider_base_saturation" ).value = Math.trunc(nowsikiso);
    sliderValueS.textContent = Math.trunc(nowsikiso);

    const nowcontrast = map.getPaintProperty(layer.value, 'raster-contrast',) * 100;
    const sliderValueC = document.getElementById('slider_base_contrast_value');
    document.getElementById( "slider_base_contrast" ).value = Math.trunc(nowcontrast);
    sliderValueC.textContent = Math.trunc(nowcontrast);

    const nowbmin = map.getPaintProperty(layer.value, 'raster-brightness-min',) * 100;
    const sliderValueMIN = document.getElementById('slider_base_brightnessmin_value');
    document.getElementById( "slider_base_brightnessmin" ).value = Math.trunc(nowbmin);
    sliderValueMIN.textContent = Math.trunc(nowbmin);

    const nowbmix = map.getPaintProperty(layer.value, 'raster-brightness-max',) * 100;
    const sliderValueMAX = document.getElementById('slider_base_brightnessmax_value');
    document.getElementById( "slider_base_brightnessmax" ).value = Math.trunc(nowbmix);
    sliderValueMAX.textContent = Math.trunc(nowbmix);

}