(function(){"use strict";let c=null;const p=()=>{if(c!==null)return c;c=!1;const t=5,i=new OffscreenCanvas(t,t).getContext("2d",{willReadFrequently:!0});if(!i)return!1;for(let n=0;n<t*t;n++){const o=n*4;i.fillStyle=`rgb(${o},${o+1},${o+2})`,i.fillRect(n%t,Math.floor(n/t),1,1)}const l=i.getImageData(0,0,t,t).data;for(let n=0;n<t*t*4;n++)if(n%4!==3&&l[n]!==n){c=!0;break}return c},T=async t=>{if(p())try{return t.transferToImageBitmap()}catch{}return await t.convertToBlob()};var E=`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_height_map;
uniform float u_dem_type; // mapbox(0.0), gsi(1.0), terrarium(2.0)
in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec4 color = texture(u_height_map, v_tex_coord);

    // u_dem_type が 0.0 の場合は color を返し、他の値の場合は処理を続ける
    float demTypeStep = step(0.5, u_dem_type);  // 0.0 の場合は 0.0、他の値の場合は 1.0
    vec4 defaultColor = color;

    vec3 rgb = color.rgb * 255.0;

    // terrainRGBにおける高度0の色
    vec4 zero_elevation_color = vec4(1.0, 134.0, 160.0, 255.0) / 255.0;

    // defaultColorが完全に透明なら zero_elevation_color に設定
    if (defaultColor.a == 0.0) {
        defaultColor = zero_elevation_color;
    }

    float height;

    // 高さの計算 (u_dem_typeによって異なる処理)
    if (u_dem_type == 1.0) {  // gsi(地理院標高タイル)
        float rgb_value = dot(rgb, vec3(65536.0, 256.0, 1.0));
        height = mix(rgb_value, rgb_value - 16777216.0, step(8388608.0, rgb_value)) * 0.01;
        height = (height + 10000.0) * 10.0;
    } else if (u_dem_type == 2.0) {  // Terrarium-RGB
        height = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) - 32768.0;
        height = (height + 10000.0) * 10.0;  // Mapbox RGB に合わせたスケーリング
    }

    // 地理院標高タイルまたはTerrarium-RGBの無効値または完全に透明なピクセルの判定
    float is_valid = float(
        (u_dem_type == 1.0 && (rgb.r != 128.0 || rgb.g != 0.0 || rgb.b != 0.0) && color.a != 0.0) ||
        (u_dem_type == 2.0 && color.a != 0.0)
    );

    // 標高カラーの計算
    vec4 elevationColor = vec4(
        floor(height / 65536.0) / 255.0,
        floor(mod(height / 256.0, 256.0)) / 255.0,
        mod(height, 256.0) / 255.0,
        1.0
    );

    // 無効値の場合は zero_elevation_color を使用
    vec4 finalColor = mix(zero_elevation_color, elevationColor, is_valid);

    // demTypeStep に応じてデフォルトの色か標高色を選択
    fragColor = mix(defaultColor, finalColor, demTypeStep);
}`,v=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}`;const h=new Map;let d=null;const R=t=>{const r=t.getContext("webgl2");if(!r)throw new Error("WebGL not supported");const i=(a,m,x)=>{const s=a.createShader(m);return s?(a.shaderSource(s,x),a.compileShader(s),a.getShaderParameter(s,a.COMPILE_STATUS)?s:(console.error("An error occurred compiling the shaders: "+a.getShaderInfoLog(s)),a.deleteShader(s),null)):(console.error("Unable to create shader"),null)},l=i(r,r.VERTEX_SHADER,v),n=i(r,r.FRAGMENT_SHADER,E);if(!l||!n)throw new Error("Failed to load shaders");const o=r.createProgram();if(!o)throw new Error("Failed to create program");if(r.attachShader(o,l),r.attachShader(o,n),r.linkProgram(o),!r.getProgramParameter(o,r.LINK_STATUS))throw console.error("Unable to initialize the shader program: "+r.getProgramInfoLog(o)),new Error("Failed to link program");const f=r.createBuffer();if(!f)throw new Error("Failed to create position buffer");r.bindBuffer(r.ARRAY_BUFFER,f);const e=new Float32Array([-1,-1,1,-1,-1,1,1,1]);r.bufferData(r.ARRAY_BUFFER,e,r.STATIC_DRAW);const _=r.getAttribLocation(o,"a_position");r.enableVertexAttribArray(_),r.vertexAttribPointer(_,2,r.FLOAT,!1,0,0);const g=r.getUniformLocation(o,"u_height_map"),u=r.getUniformLocation(o,"u_dem_type");if(!g||!u)throw new Error("Failed to get uniform locations");return{canvas:t,gl:r,program:o,positionBuffer:f,heightMapLocation:g,demTypeLocation:u}},b=t=>{let r=h.get(t);if(!r){const i=new OffscreenCanvas(t,t);r=R(i),h.set(t,r)}return r};self.onmessage=async t=>{const{id:r,image:i,demTypeNumber:l,tileSize:n=256}=t.data;try{const o=b(n),{canvas:f,gl:e,program:_,heightMapLocation:g,demTypeLocation:u}=o;e.viewport(0,0,n,n),d||(d=e.createTexture()),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,d),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.useProgram(_),e.uniform1i(g,0),e.uniform1f(u,l),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLE_STRIP,0,4);const a=await T(f);if(a instanceof ImageBitmap)self.postMessage({id:r,imageBitmap:a},{transfer:[a]});else{const m=await a.arrayBuffer();self.postMessage({id:r,buffer:m})}}catch(o){o instanceof Error&&self.postMessage({id:r,error:o.message})}}})();
