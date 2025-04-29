(function(){"use strict";var u=`#version 300 es
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
}`,g=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}`;let e=null,r=null,c=null,s=null,d=null;const h=f=>{if(e=f.getContext("webgl2"),!e)throw new Error("WebGL not supported");const a=(o,T,E)=>{const t=o.createShader(T);return t?(o.shaderSource(t,E),o.compileShader(t),o.getShaderParameter(t,o.COMPILE_STATUS)?t:(console.error("An error occurred compiling the shaders: "+o.getShaderInfoLog(t)),o.deleteShader(t),null)):(console.error("Unable to create shader"),null)},l=a(e,e.VERTEX_SHADER,g),_=a(e,e.FRAGMENT_SHADER,u);if(!l||!_)throw new Error("Failed to load shaders");if(r=e.createProgram(),!r)throw new Error("Failed to create program");if(e.attachShader(r,l),e.attachShader(r,_),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw console.error("Unable to initialize the shader program: "+e.getProgramInfoLog(r)),new Error("Failed to link program");c=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,c);const n=new Float32Array([-1,-1,1,-1,-1,1,1,1]);e.bufferData(e.ARRAY_BUFFER,n,e.STATIC_DRAW);const i=e.getAttribLocation(r,"a_position");e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0),s=e.getUniformLocation(r,"u_height_map"),d=e.getUniformLocation(r,"u_dem_type")},m=new OffscreenCanvas(256,256);self.onmessage=async f=>{const{id:a,image:l,demTypeNumber:_}=f.data;try{if(e||h(m),!e||!r||!c||!s)throw new Error("WebGL initialization failed");const n=e.createTexture();e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,n),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,l),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.useProgram(r),e.uniform1i(s,0),e.uniform1f(d,_),e.clear(e.COLOR_BUFFER_BIT),e.drawArrays(e.TRIANGLE_STRIP,0,4);const i=await m.convertToBlob();if(!i)throw new Error("Failed to convert canvas to blob");const o=await i.arrayBuffer();self.postMessage({id:a,buffer:o})}catch(n){n instanceof Error&&self.postMessage({id:a,error:n.message})}}})();
