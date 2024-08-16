//セレクトボタンを追加
for (var i = 0; i < Object.keys(rasterselectID).length; i++) {

    const id = Object.keys(rasterselectID)[i];
    const option = document.createElement("option");
    option.value = id;
    option.text = rasterselectID[id];
    const select = document.getElementById("property_raster");
    select.appendChild(option);
}

slider_raster_opacity.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_raster_opacity_value');
    map.setPaintProperty(
        property_raster.value,
        'raster-opacity',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value + '%';
});

slider_raster_saturation.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_raster_saturation_value');
    map.setPaintProperty(
        property_raster.value,
        'raster-saturation',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_raster_contrast.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_raster_contrast_value');
    map.setPaintProperty(
        property_raster.value,
        'raster-contrast',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_raster_brightnessmin.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_raster_brightnessmin_value');
    map.setPaintProperty(
        property_raster.value,
        'raster-brightness-min',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

slider_raster_brightnessmax.addEventListener('input', (e) => {
    const sliderValue = document.getElementById('slider_raster_brightnessmax_value');
    map.setPaintProperty(
        property_raster.value,
        'raster-brightness-max',
        parseInt(e.target.value, 10) / 100
    );
    sliderValue.textContent = e.target.value;
});

function CangeRaster(){
    var layer = document.getElementById('property_raster');
    const sliderValueO = document.getElementById('slider_raster_opacity_value');
    var nowopacity = map.getPaintProperty(layer.value, 'raster-opacity',) * 100;
    document.getElementById( "slider_raster_opacity" ).value = Math.trunc(nowopacity);
    sliderValueO.textContent = Math.trunc(nowopacity) + '%';

    var nowsikiso = map.getPaintProperty(layer.value, 'raster-saturation',) * 100;
    const sliderValueS = document.getElementById('slider_raster_saturation_value');
    document.getElementById( "slider_raster_saturation" ).value = Math.trunc(nowsikiso);
    sliderValueS.textContent = Math.trunc(nowsikiso);

    var nowcontrast = map.getPaintProperty(layer.value, 'raster-contrast',) * 100;
    const sliderValueC = document.getElementById('slider_raster_contrast_value');
    document.getElementById( "slider_raster_contrast" ).value = Math.trunc(nowcontrast);
    sliderValueC.textContent = Math.trunc(nowcontrast);

    var nowbmin = map.getPaintProperty(layer.value, 'raster-brightness-min',) * 100;
    const sliderValueMIN = document.getElementById('slider_raster_brightnessmin_value');
    document.getElementById( "slider_raster_brightnessmin" ).value = Math.trunc(nowbmin);
    sliderValueMIN.textContent = Math.trunc(nowbmin);

    var nowbmix = map.getPaintProperty(layer.value, 'raster-brightness-max',) * 100;
    const sliderValueMAX = document.getElementById('slider_raster_brightnessmax_value');
    document.getElementById( "slider_raster_brightnessmax" ).value = Math.trunc(nowbmix);
    sliderValueMAX.textContent = Math.trunc(nowbmix);
}