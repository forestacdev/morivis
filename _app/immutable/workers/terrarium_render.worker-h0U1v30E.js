(function(){"use strict";var x=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}`,b=`#version 300 es
precision highp float;
precision highp sampler2DArray;

// Terrarium エンコード済みバンドテクスチャ（配列）
uniform sampler2DArray u_terrarium_bands;
// カラーマップテクスチャ (256x1)
uniform sampler2D u_color_map;

// バンド選択
uniform int u_bandIndex;

// 表示範囲（CPU側で正規化済み: 0〜1）
uniform float u_min;
uniform float u_max;

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

// Terrarium デコード → 正規化値 (0〜1)
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

void main() {
    vec2 uv = reprojectUV(v_tex_coord);
    vec4 encoded = texture(u_terrarium_bands, vec3(uv, u_bandIndex));

    // nodata チェック（alpha = 0）
    if (encoded.a == 0.0) {
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }

    // Terrarium デコード → 0〜1
    float decoded = decodeTerrariumNormalized(encoded);

    // 表示範囲で正規化（u_min, u_max は既にCPU側で正規化済み）
    float displayNorm = clamp((decoded - u_min) / (u_max - u_min), 0.0, 1.0);

    fragColor = vec4(texture(u_color_map, vec2(displayNorm, 0.5)).rgb, 1.0);
}
`,s=`#version 300 es
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

// Terrarium デコード → 正規化値 (0〜1)
float decodeTerrariumNormalized(vec4 color) {
    vec3 rgb = color.rgb * 255.0;
    return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
}

// デコード → 表示正規化
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
`;const l=(r,n,o)=>{const t=r.createShader(n);return t?(r.shaderSource(t,o),r.compileShader(t),r.getShaderParameter(t,r.COMPILE_STATUS)?t:(console.error("Shader compilation failed:",r.getShaderInfoLog(t)),r.deleteShader(t),null)):null},m=(r,n,o)=>{const t=r.createProgram();return t?(r.attachShader(t,n),r.attachShader(t,o),r.linkProgram(t),r.getProgramParameter(t,r.LINK_STATUS)?t:(console.error("Program linking failed:",r.getProgramInfoLog(t)),r.deleteProgram(t),null)):null};let e=null;const c=new OffscreenCanvas(256,256);let f=null,d=null;const u=new Map,T=()=>{if(e=c.getContext("webgl2"),!e)throw new Error("WebGL2 not supported");e.getExtension("EXT_color_buffer_float");const r=l(e,e.VERTEX_SHADER,x),n=l(e,e.FRAGMENT_SHADER,b),o=l(e,e.FRAGMENT_SHADER,s);if(!r||!n||!o)throw new Error("Failed to create shaders");f={single:m(e,r,n),multi:m(e,r,o)},d=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,d),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW)},g=(r,n,o,t)=>{if(!e)return;const _=u.get(r);_&&e.deleteTexture(_.texture);const a=e.createTexture();if(a){e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,a),e.texStorage3D(e.TEXTURE_2D_ARRAY,1,e.RGBA8,o,t,n.length);for(let i=0;i<n.length;i++)e.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,i,o,t,1,e.RGBA,e.UNSIGNED_BYTE,n[i]);e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),u.set(r,{texture:a,width:o,height:t,bandCount:n.length})}},E=(r,n,o)=>{if(!e)return;const t=e.createTexture();e.activeTexture(e.TEXTURE0+o),e.bindTexture(e.TEXTURE_2D,t),e.uniform1i(e.getUniformLocation(r,"u_color_map"),o),e.texImage2D(e.TEXTURE_2D,0,e.RGB,256,1,0,e.RGB,e.UNSIGNED_BYTE,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR)};self.onmessage=async r=>{const n=r.data;if(n.action==="release"){const o=u.get(n.entryId);o&&e&&e.deleteTexture(o.texture),u.delete(n.entryId);return}try{if(e||T(),!e||!f)throw new Error("WebGL initialization failed");n.images&&g(n.entryId,n.images,n.width,n.height);const o=u.get(n.entryId);if(!o)throw new Error(`No texture cached for entry: ${n.entryId}`);const t=n.outputWidth??o.width,_=n.outputHeight??o.height;c.width=t,c.height=_,e.viewport(0,0,t,_);const a=f[n.type];e.useProgram(a),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT);const i=e.getAttribLocation(a,"a_position");e.bindBuffer(e.ARRAY_BUFFER,d),e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,o.texture),e.uniform1i(e.getUniformLocation(a,"u_terrarium_bands"),0),e.uniform1i(e.getUniformLocation(a,"u_reproject4326"),n.reproject4326?1:0),n.bboxDisplay?e.uniform4f(e.getUniformLocation(a,"u_bbox_display"),n.bboxDisplay[0],n.bboxDisplay[1],n.bboxDisplay[2],n.bboxDisplay[3]):e.uniform4f(e.getUniformLocation(a,"u_bbox_display"),0,0,0,0),n.bboxSource?e.uniform4f(e.getUniformLocation(a,"u_bbox_source"),n.bboxSource[0],n.bboxSource[1],n.bboxSource[2],n.bboxSource[3]):e.uniform4f(e.getUniformLocation(a,"u_bbox_source"),0,0,0,0),n.type==="single"?(e.uniform1i(e.getUniformLocation(a,"u_bandIndex"),n.bandIndex??0),e.uniform1f(e.getUniformLocation(a,"u_min"),n.min??0),e.uniform1f(e.getUniformLocation(a,"u_max"),n.max??1),n.colorArray&&E(a,n.colorArray,1)):n.type==="multi"&&(e.uniform1i(e.getUniformLocation(a,"u_redIndex"),n.redIndex??0),e.uniform1i(e.getUniformLocation(a,"u_greenIndex"),n.greenIndex??1),e.uniform1i(e.getUniformLocation(a,"u_blueIndex"),n.blueIndex??2),e.uniform1f(e.getUniformLocation(a,"u_redMin"),n.redMin??0),e.uniform1f(e.getUniformLocation(a,"u_redMax"),n.redMax??1),e.uniform1f(e.getUniformLocation(a,"u_greenMin"),n.greenMin??0),e.uniform1f(e.getUniformLocation(a,"u_greenMax"),n.greenMax??1),e.uniform1f(e.getUniformLocation(a,"u_blueMin"),n.blueMin??0),e.uniform1f(e.getUniformLocation(a,"u_blueMax"),n.blueMax??1)),e.drawArrays(e.TRIANGLES,0,6);const p=await c.convertToBlob({type:"image/png"});self.postMessage({blob:p})}catch(o){console.error(o),self.postMessage({error:o instanceof Error?o.message:String(o)})}}})();
