(function(){"use strict";var R=`#version 300 es
in vec4 a_position;
out vec2 v_tex_coord;

void main() {
    gl_Position = a_position;
    v_tex_coord = vec2(a_position.x * 0.5 + 0.5, a_position.y * -0.5 + 0.5);
}`,A=`#version 300 es

precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform int u_redIndex;
uniform int u_greenIndex;
uniform int u_blueIndex;
uniform float u_min;
uniform float u_max;


in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    vec2 uv = v_tex_coord;

    float r = texture(u_texArray, vec3(uv, u_redIndex)).r;
    float g = texture(u_texArray, vec3(uv, u_greenIndex)).r;
    float b = texture(u_texArray, vec3(uv, u_blueIndex)).r;

    float normalized_r = clamp((r - u_min) / (u_max - u_min), 0.0, 1.0);
    float normalized_g = clamp((g - u_min) / (u_max - u_min), 0.0, 1.0);
    float normalized_b = clamp((b - u_min) / (u_max - u_min), 0.0, 1.0);
    fragColor = vec4(normalized_r, normalized_g, normalized_b, 1.0);

}`,v=`#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray u_texArray;
uniform sampler2D u_elevationMap;
uniform int u_bandIndex;
uniform float u_min;
uniform float u_max;


in vec2 v_tex_coord ;
out vec4 fragColor;

// カラーマップテクスチャから色を取得する関数
vec4 getColorFromMap(sampler2D map, float value) {
    return vec4(texture(map, vec2(value, 0.5)).rgb, 1.0);
}

void main() {
    vec2 uv = v_tex_coord;
	float value = texture(u_texArray, vec3(uv, u_bandIndex)).r;

	float normalized = clamp((value - u_min) / (u_max - u_min), 0.0, 1.0);
    vec4 value_color = getColorFromMap(u_elevationMap, normalized);


    fragColor = value_color; // グレースケールで出力

}


`;const p=(r,a,t,n)=>{const i=r.createTexture();r.activeTexture(r.TEXTURE0+n),r.bindTexture(r.TEXTURE_2D,i);const _=r.getUniformLocation(a,"u_elevationMap");r.uniform1i(_,n),r.texImage2D(r.TEXTURE_2D,0,r.RGB,256,1,0,r.RGB,r.UNSIGNED_BYTE,t),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR)},c=(r,a,t)=>{const n=r.createShader(a);return n?(r.shaderSource(n,t),r.compileShader(n),r.getShaderParameter(n,r.COMPILE_STATUS)?n:(console.error("Shader compilation failed:",r.getShaderInfoLog(n)),r.deleteShader(n),null)):null},E=(r,a,t)=>{const n=r.createProgram();return n?(r.attachShader(n,a),r.attachShader(n,t),r.linkProgram(n),r.getProgramParameter(n,r.LINK_STATUS)?n:(console.error("Program linking failed:",r.getProgramInfoLog(n)),r.deleteProgram(n),null)):null};let e=null;const u=new OffscreenCanvas(256,256);let T=null;const h=r=>{if(e=r.getContext("webgl2"),!e)throw new Error("WebGL not supported");e.getExtension("EXT_color_buffer_float")||console.error("Float texture not supported");const t=c(e,e.VERTEX_SHADER,R),n=c(e,e.FRAGMENT_SHADER,v),i=c(e,e.FRAGMENT_SHADER,A);if(!t||!n||!i)throw new Error("Failed to create shaders");T={single:E(e,t,n),multi:E(e,t,i)}};self.onmessage=async r=>{const{rasters:a,size:t,type:n,min:i,max:_,width:d,height:x,colorArray:L}=r.data;try{if(e||h(u),!e)throw new Error("WebGL initialization failed");u.width=d,u.height=x,e.viewport(0,0,u.width,u.height);const o=T[n];e.useProgram(o),e.clearColor(0,0,0,0);const l=e.getAttribLocation(o,"a_position"),U=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,U),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW),e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0);const I=e.createTexture();if(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D_ARRAY,I),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D_ARRAY,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texImage3D(e.TEXTURE_2D_ARRAY,0,e.R32F,d,x,t,0,e.RED,e.FLOAT,a),n==="single"){const m=e.getUniformLocation(o,"u_bandIndex");e.uniform1i(m,0);const f=e.getUniformLocation(o,"u_min"),s=e.getUniformLocation(o,"u_max");e.uniform1f(f,i),e.uniform1f(s,_)}if(n==="multi"){const m=e.getUniformLocation(o,"u_redIndex"),f=e.getUniformLocation(o,"u_greenIndex"),s=e.getUniformLocation(o,"u_blueIndex");e.uniform1i(m,0),e.uniform1i(f,1),e.uniform1i(s,2);const D=e.getUniformLocation(o,"u_min"),b=e.getUniformLocation(o,"u_max");e.uniform1f(D,i),e.uniform1f(b,_)}p(e,o,L,1),e.drawArrays(e.TRIANGLES,0,6);const S=await u.convertToBlob({type:"image/png"});self.postMessage({blob:S})}catch(o){console.error(o)}}})();
