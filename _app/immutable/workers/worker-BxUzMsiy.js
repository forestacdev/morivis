(function(){"use strict";var h=`#version 300 es
precision highp float;

uniform sampler2D u_height_map_center;


uniform sampler2D u_elevationMap;
uniform float u_min_height;
uniform float u_max_height;
uniform float u_dem_type; // 0: mapbox, 1: gsi, 2: terrarium


in vec2 v_tex_coord ;
out vec4 fragColor;


// === INSERT_SHADER_MODULES_HERE === //



void main() {
    vec2 uv = v_tex_coord;
    vec4 final_color = vec4(0.0, 0.0,0.0,0.0);


    vec4 color = texture(u_height_map_center, uv);
     if(color.a == 0.0){
        // テクスチャなし、または透明ピクセルの場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    float h = convertToHeight(color, u_dem_type);
    if(-9999.0 == h){
        // 無効地の場合
        fragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
    }
    float normalized_h = clamp((h - u_min_height) / (u_max_height - u_min_height), 0.0, 1.0);
    vec4 terrain_color = getColorFromMap(u_elevationMap, normalized_h);

    fragColor = terrain_color;

}


`,d=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5); // Y軸を反転
}`,T=`

// 高さ変換関数
float convertToHeight(vec4 color, float dem_type) {
    vec3 rgb = color.rgb * 255.0;

    if (dem_type == 0.0) {  // mapbox (TerrainRGB)

        return -10000.0 + dot(rgb, vec3(256.0 * 256.0, 256.0, 1.0)) * 0.1;

    } else if (dem_type == 1.0) {  // gsi (地理院標高タイル)
        // 地理院標高タイルの無効値チェック (R, G, B) = (128, 0, 0)
        if (rgb == vec3(128.0, 0.0, 0.0)) {
            return -9999.0;
        }

        float total = dot(rgb, vec3(65536.0, 256.0, 1.0));
        return mix(total, total - 16777216.0, step(8388608.0, total)) * 0.01;

    } else if (dem_type == 2.0) {  // terrarium (TerrariumRGB)

        return (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) - 32768.0;
    }
}

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}
`;let r=null,o=null,m=null;const v=(e,t,c)=>{let n="";for(const i of t)n+=i+`
`;return e.replace(c,n)},p="// === INSERT_SHADER_MODULES_HERE === //",R=e=>{if(r=e.getContext("webgl2"),!r)throw new Error("WebGL not supported");const t=(a,u,l)=>{const f=a.createShader(u);return f?(a.shaderSource(f,l),a.compileShader(f),a.getShaderParameter(f,a.COMPILE_STATUS)?f:(console.error("An error occurred compiling the shaders: "+a.getShaderInfoLog(f)),a.deleteShader(f),null)):(console.error("Unable to create shader"),null)},c=v(h,[T],p),n=t(r,r.VERTEX_SHADER,d),s=t(r,r.FRAGMENT_SHADER,c);if(!n||!s)throw new Error("Failed to load shaders");if(o=r.createProgram(),!o)throw new Error("Failed to create program");if(r.attachShader(o,n),r.attachShader(o,s),r.linkProgram(o),!r.getProgramParameter(o,r.LINK_STATUS))throw console.error("Unable to initialize the shader program: "+r.getProgramInfoLog(o)),new Error("Failed to link program");r.useProgram(o),m=r.createBuffer(),r.bindBuffer(r.ARRAY_BUFFER,m);const i=new Float32Array([-1,-1,1,-1,-1,1,1,1]);r.bufferData(r.ARRAY_BUFFER,i,r.STATIC_DRAW);const _=r.getAttribLocation(o,"a_position");r.enableVertexAttribArray(_),r.vertexAttribPointer(_,2,r.FLOAT,!1,0,0)},S=(e,t,c)=>{let n=e.TEXTURE0;Object.entries(c).forEach(([s,{image:i,type:_}])=>{const a=e.createTexture();e.activeTexture(n),e.bindTexture(e.TEXTURE_2D,a);const u=e.getUniformLocation(t,s);e.uniform1i(u,n-e.TEXTURE0),_==="height"?e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,i):e.texImage2D(e.TEXTURE_2D,0,e.RGB,256,1,0,e.RGB,e.UNSIGNED_BYTE,i),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),n+=1})},b=(e,t,c)=>{for(const[n,{type:s,value:i}]of Object.entries(c)){const _=e.getUniformLocation(t,n);_!==null&&e[`uniform${s}`](_,i)}},E=new OffscreenCanvas(256,256);self.onmessage=async e=>{const{tileId:t,center:c,demTypeNumber:n,mode:s,max:i,min:_,elevationColorArray:a}=e.data;try{if(r||R(E),!r||!o||!m)throw new Error("WebGL initialization failed");s==="evolution"&&(b(r,o,{u_dem_type:{type:"1f",value:n},u_max_height:{type:"1f",value:i},u_min_height:{type:"1f",value:_}}),S(r,o,{u_height_map_center:{image:c,type:"height"},u_elevationMap:{image:a,type:"colormap"}})),r.clear(r.COLOR_BUFFER_BIT),r.drawArrays(r.TRIANGLE_STRIP,0,4);const u=await E.convertToBlob();if(!u)throw new Error("Failed to convert canvas to blob");const l=await u.arrayBuffer();self.postMessage({id:t,buffer:l})}catch(u){u instanceof Error&&self.postMessage({id:t,error:u.message})}}})();
