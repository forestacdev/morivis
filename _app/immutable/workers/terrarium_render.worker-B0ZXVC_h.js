var x=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}`,v=`#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;
// カラーマップテクスチャ (256x1)
uniform sampler2D u_color_map;

// バンド選択
uniform int u_bandIndex;
uniform int u_derived_mode;

// 表示範囲（実値）
uniform float u_min;
uniform float u_max;
uniform float u_data_min;
uniform float u_data_max;
uniform vec2 u_texel_size;
uniform float u_ewres;
uniform float u_nsres;

// 4326→メルカトル再投影
uniform bool u_reproject4326;
uniform vec4 u_bbox_display;  // 表示側bbox [minLng, minLat, maxLng, maxLat]（クリップ済み）
uniform vec4 u_bbox_source;   // ソーステクスチャのbbox [minLng, minLat, maxLng, maxLat]（元の範囲）

in vec2 v_tex_coord;
out vec4 fragColor;

float R = 6378137.0;

float latToY(float lat) {
    return R * log(tan(radians(lat) * 0.5 + 3.14159265 / 4.0));
}

float yToLat(float y) {
    return degrees(2.0 * atan(exp(y / R)) - 3.14159265 / 2.0);
}

// メルカトルUV → 正距円筒UV
vec2 reprojectUV(vec2 uv) {
    if (!u_reproject4326) return uv;

    // 出力UV → メルカトル座標 → 経緯度
    float maxY = latToY(u_bbox_display.w);
    float minY = latToY(u_bbox_display.y);
    float y = mix(maxY, minY, uv.y);
    float lng = mix(u_bbox_display.x, u_bbox_display.z, uv.x);
    float lat = yToLat(y);

    // 経緯度 → ソーステクスチャのUV
    float u = (lng - u_bbox_source.x) / (u_bbox_source.z - u_bbox_source.x);
    float v = (u_bbox_source.w - lat) / (u_bbox_source.w - u_bbox_source.y);

    return vec2(u, v);
}

// 標準 Terrarium の標高値を復元しているのではなく、
// 独自に 0〜65535 へ正規化して保存した値を 0〜1 に戻している。
// ここで得られるのは実値ではなく、そのバンド内での相対値。
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

float decodeBandValue(vec4 color) {
    return mix(u_data_min, u_data_max, decodeTerrariumNormalized(color));
}

float sampleBandValue(vec2 uv, vec2 offset) {
    vec4 encoded = texture(u_terrarium_bands, vec3(uv + offset, u_bandIndex));
    if (encoded.a == 0.0) {
        return 0.0;
    }
    return decodeBandValue(encoded);
}

float computeSlope(vec2 uv) {
    float h00 = sampleBandValue(uv, vec2(-u_texel_size.x, -u_texel_size.y));
    float h01 = sampleBandValue(uv, vec2(0.0, -u_texel_size.y));
    float h02 = sampleBandValue(uv, vec2(u_texel_size.x, -u_texel_size.y));
    float h10 = sampleBandValue(uv, vec2(-u_texel_size.x, 0.0));
    float h12 = sampleBandValue(uv, vec2(u_texel_size.x, 0.0));
    float h20 = sampleBandValue(uv, vec2(-u_texel_size.x, u_texel_size.y));
    float h21 = sampleBandValue(uv, vec2(0.0, u_texel_size.y));
    float h22 = sampleBandValue(uv, vec2(u_texel_size.x, u_texel_size.y));

    float dx = ((h00 + 2.0 * h10 + h20) - (h02 + 2.0 * h12 + h22)) / (8.0 * u_ewres);
    float dy = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) / (8.0 * u_nsres);
    return degrees(atan(sqrt(dx * dx + dy * dy)));
}

float computeAspect(vec2 uv) {
    float h00 = sampleBandValue(uv, vec2(-u_texel_size.x, -u_texel_size.y));
    float h01 = sampleBandValue(uv, vec2(0.0, -u_texel_size.y));
    float h02 = sampleBandValue(uv, vec2(u_texel_size.x, -u_texel_size.y));
    float h10 = sampleBandValue(uv, vec2(-u_texel_size.x, 0.0));
    float h12 = sampleBandValue(uv, vec2(u_texel_size.x, 0.0));
    float h20 = sampleBandValue(uv, vec2(-u_texel_size.x, u_texel_size.y));
    float h21 = sampleBandValue(uv, vec2(0.0, u_texel_size.y));
    float h22 = sampleBandValue(uv, vec2(u_texel_size.x, u_texel_size.y));

    float dx = ((h00 + 2.0 * h10 + h20) - (h02 + 2.0 * h12 + h22)) / (8.0 * u_ewres);
    float dy = ((h20 + 2.0 * h21 + h22) - (h00 + 2.0 * h01 + h02)) / (8.0 * u_nsres);
    float aspect = degrees(atan(dy, dx));
    if (aspect < 0.0) {
        aspect += 360.0;
    }
    aspect = 90.0 - aspect;
    if (aspect < 0.0) {
        aspect += 360.0;
    }
    return aspect;
}

float computeTpi(vec2 uv) {
    float center = sampleBandValue(uv, vec2(0.0, 0.0));
    float sum =
        sampleBandValue(uv, vec2(-u_texel_size.x, -u_texel_size.y)) +
        sampleBandValue(uv, vec2(0.0, -u_texel_size.y)) +
        sampleBandValue(uv, vec2(u_texel_size.x, -u_texel_size.y)) +
        sampleBandValue(uv, vec2(-u_texel_size.x, 0.0)) +
        sampleBandValue(uv, vec2(u_texel_size.x, 0.0)) +
        sampleBandValue(uv, vec2(-u_texel_size.x, u_texel_size.y)) +
        sampleBandValue(uv, vec2(0.0, u_texel_size.y)) +
        sampleBandValue(uv, vec2(u_texel_size.x, u_texel_size.y));
    return center - sum / 8.0;
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, u_bandIndex));

    // nodata チェック（alpha = 0）
    if (encoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float value = decodeBandValue(encoded);
    if (u_derived_mode == 1) {
        value = computeSlope(uv);
    } else if (u_derived_mode == 2) {
        value = computeAspect(uv);
    } else if (u_derived_mode == 3) {
        value = computeTpi(uv);
    }

    float displayRange = max(u_max - u_min, 0.000001);
    float displayNorm = clamp((value - u_min) / displayRange, 0.0, 1.0);

    fragColor = vec4(texture(u_color_map, vec2(displayNorm, 0.5)).rgb, 1.0);
}
`,b=`#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;

// RGB バンドインデックス
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;

// 各チャンネルの表示範囲（CPU側で正規化済み: 0〜1）
uniform float u_redMin;
uniform float u_redMax;
uniform float u_greenMin;
uniform float u_greenMax;
uniform float u_blueMin;
uniform float u_blueMax;

// 4326→メルカトル再投影
uniform bool u_reproject4326;
uniform vec4 u_bbox_display;  // 表示側bbox [minLng, minLat, maxLng, maxLat]（クリップ済み）
uniform vec4 u_bbox_source;   // ソーステクスチャのbbox [minLng, minLat, maxLng, maxLat]（元の範囲）

in vec2 v_tex_coord;
out vec4 fragColor;

float R = 6378137.0;

float latToY(float lat) {
    return R * log(tan(radians(lat) * 0.5 + 3.14159265 / 4.0));
}

float yToLat(float y) {
    return degrees(2.0 * atan(exp(y / R)) - 3.14159265 / 2.0);
}

// メルカトルUV → 正距円筒UV
vec2 reprojectUV(vec2 uv) {
    if (!u_reproject4326) return uv;

    float maxY = latToY(u_bbox_display.w);
    float minY = latToY(u_bbox_display.y);
    float y = mix(maxY, minY, uv.y);
    float lng = mix(u_bbox_display.x, u_bbox_display.z, uv.x);
    float lat = yToLat(y);

    float u = (lng - u_bbox_source.x) / (u_bbox_source.z - u_bbox_source.x);
    float v = (u_bbox_source.w - lat) / (u_bbox_source.w - u_bbox_source.y);

    return vec2(u, v);
}

// 標準 Terrarium の標高値を復元しているのではなく、
// 独自に 0〜65535 へ正規化して保存した値を 0〜1 に戻している。
// ここで得られるのは各バンドの実値ではなく相対値。
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

// 各バンドを同じ正規化空間で扱い、そのまま RGB 合成用の 0〜1 値に切り直す。
float decodeAndNormalize(vec2 uv, int bandIndex, float dispMin, float dispMax) {
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, bandIndex));
    if (encoded.a == 0.0) return 0.0;

    float decoded = decodeTerrariumNormalized(encoded);
    return clamp((decoded - dispMin) / (dispMax - dispMin), 0.0, 1.0);
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);

    // nodata チェック（代表バンドの alpha）
    vec4 redEncoded = texture(u_terrarium_bands, vec3(uv, u_redIndex));
    if (redEncoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    float r = decodeAndNormalize(uv, u_redIndex, u_redMin, u_redMax);
    float g = decodeAndNormalize(uv, u_greenIndex, u_greenMin, u_greenMax);
    float b = decodeAndNormalize(uv, u_blueIndex, u_blueMin, u_blueMax);

    fragColor = vec4(r, g, b, 1.0);
}
`;const d=(a,n,r)=>{const t=a.createShader(n);return t?(a.shaderSource(t,r),a.compileShader(t),a.getShaderParameter(t,a.COMPILE_STATUS)?t:(console.error("Shader compilation failed:",a.getShaderInfoLog(t)),a.deleteShader(t),null)):null},s=(a,n,r)=>{const t=a.createProgram();return t?(a.attachShader(t,n),a.attachShader(t,r),a.linkProgram(t),a.getProgramParameter(t,a.LINK_STATUS)?t:(console.error("Program linking failed:",a.getProgramInfoLog(t)),a.deleteProgram(t),null)):null};let e=null;const _=new OffscreenCanvas(256,256);let c=null,f=null;const l=new Map,p=()=>{if(e=_.getContext("webgl2"),!e)throw new Error("WebGL2 not supported");e.getExtension("EXT_color_buffer_float");const a=d(e,e.VERTEX_SHADER,x),n=d(e,e.FRAGMENT_SHADER,v),r=d(e,e.FRAGMENT_SHADER,b);if(!a||!n||!r)throw new Error("Failed to create shaders");c={single:s(e,a,n),multi:s(e,a,r)},f=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,f),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW)},g=(a,n,r,t)=>{if(!e)return;const i=l.get(a);i&&e.deleteTexture(i.texture);const o=e.createTexture();if(o){e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,o),e.texStorage3D(e.TEXTURE_2D_ARRAY,1,e.RGBA8,r,t,n.length);for(let u=0;u<n.length;u++)e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,u,r,t,1,e.RGBA,e.UNSIGNED_BYTE,n[u]);e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),l.set(a,{texture:o,width:r,height:t,bandCount:n.length})}},T=(a,n,r)=>{if(!e)return;const t=e.createTexture();e.activeTexture(e.TEXTURE0+r),e.bindTexture(e.TEXTURE_2D,t),e.uniform1i(e.getUniformLocation(a,"u_color_map"),r),e.texImage2D(e.TEXTURE_2D,0,e.RGB,256,1,0,e.RGB,e.UNSIGNED_BYTE,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};self.onmessage=async a=>{const n=a.data;if(n.action==="release"){const r=l.get(n.entryId);r&&e&&e.deleteTexture(r.texture),l.delete(n.entryId);return}try{if(e||p(),!e||!c)throw new Error("WebGL initialization failed");n.images&&g(n.entryId,n.images,n.width,n.height);const r=l.get(n.entryId);if(!r)throw new Error(`No texture cached for entry: ${n.entryId}`);const t=n.outputWidth??r.width,i=n.outputHeight??r.height;_.width=t,_.height=i,e.viewport(0,0,t,i);const o=c[n.type];e.useProgram(o),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);const u=e.getAttribLocation(o,"a_position");e.bindBuffer(e.ARRAY_BUFFER,f),e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,r.texture),e.uniform1i(e.getUniformLocation(o,"u_terrarium_bands"),0),e.uniform1i(e.getUniformLocation(o,"u_reproject4326"),n.reproject4326?1:0),n.bboxDisplay?e.uniform4f(e.getUniformLocation(o,"u_bbox_display"),n.bboxDisplay[0],n.bboxDisplay[1],n.bboxDisplay[2],n.bboxDisplay[3]):e.uniform4f(e.getUniformLocation(o,"u_bbox_display"),0,0,0,0),n.bboxSource?e.uniform4f(e.getUniformLocation(o,"u_bbox_source"),n.bboxSource[0],n.bboxSource[1],n.bboxSource[2],n.bboxSource[3]):e.uniform4f(e.getUniformLocation(o,"u_bbox_source"),0,0,0,0),n.type==="single"?(e.uniform1i(e.getUniformLocation(o,"u_bandIndex"),n.bandIndex??0),e.uniform1f(e.getUniformLocation(o,"u_min"),n.min??0),e.uniform1f(e.getUniformLocation(o,"u_max"),n.max??1),e.uniform1i(e.getUniformLocation(o,"u_derived_mode"),n.derivedMode==="slope"?1:n.derivedMode==="aspect"?2:n.derivedMode==="tpi"?3:0),e.uniform1f(e.getUniformLocation(o,"u_data_min"),n.dataMin??0),e.uniform1f(e.getUniformLocation(o,"u_data_max"),n.dataMax??1),e.uniform2f(e.getUniformLocation(o,"u_texel_size"),r.width>0?1/r.width:0,r.height>0?1/r.height:0),e.uniform1f(e.getUniformLocation(o,"u_ewres"),n.ewres??1),e.uniform1f(e.getUniformLocation(o,"u_nsres"),n.nsres??1),n.colorArray&&T(o,n.colorArray,1)):n.type==="multi"&&(e.uniform1i(e.getUniformLocation(o,"u_redIndex"),n.redIndex??0),e.uniform1i(e.getUniformLocation(o,"u_greenIndex"),n.greenIndex??1),e.uniform1i(e.getUniformLocation(o,"u_blueIndex"),n.blueIndex??2),e.uniform1f(e.getUniformLocation(o,"u_redMin"),n.redMin??0),e.uniform1f(e.getUniformLocation(o,"u_redMax"),n.redMax??1),e.uniform1f(e.getUniformLocation(o,"u_greenMin"),n.greenMin??0),e.uniform1f(e.getUniformLocation(o,"u_greenMax"),n.greenMax??1),e.uniform1f(e.getUniformLocation(o,"u_blueMin"),n.blueMin??0),e.uniform1f(e.getUniformLocation(o,"u_blueMax"),n.blueMax??1)),e.drawArrays(e.TRIANGLES,0,6);const m=await _.convertToBlob({type:"image/png"});self.postMessage({blob:m})}catch(r){console.error(r),self.postMessage({error:r instanceof Error?r.message:String(r)})}};
