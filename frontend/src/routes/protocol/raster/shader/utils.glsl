// gsi (地理院標高タイル)
float convertToHeight(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    float total = dot(rgb, vec3(65536.0, 256.0, 1.0));
    return mix(total, total - 16777216.0, step(8388608.0, total)) * 0.01;
}

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}
