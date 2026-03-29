let l=null;const F=()=>{if(l!==null)return l;l=!1;const e=5,s=new OffscreenCanvas(e,e).getContext("2d",{willReadFrequently:!0});if(!s)return!1;for(let t=0;t<e*e;t++){const a=t*4;s.fillStyle=`rgb(${a},${a+1},${a+2})`,s.fillRect(t%e,Math.floor(t/e),1,1)}const n=s.getImageData(0,0,e,e).data;for(let t=0;t<e*e*4;t++)if(t%4!==3&&n[t]!==t){l=!0;break}return l},M=async e=>{if(F())try{return e.transferToImageBitmap()}catch{}return await e.convertToBlob()};var N=`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_band_texture;
uniform sampler2D u_color_map;
uniform float u_min;
uniform float u_max;

in vec2 v_tex_coord;
out vec4 fragColor;

void main() {
    // 範囲外 + nodata → alpha=0 をブランチレスで判定
    float inBounds = step(0.0, v_tex_coord.x) * step(v_tex_coord.x, 1.0)
                   * step(0.0, v_tex_coord.y) * step(v_tex_coord.y, 1.0);

    vec4 texel = texture(u_band_texture, v_tex_coord);
    float valid = inBounds * step(0.001, texel.a);

    vec3 rgb = texel.rgb * 255.0;
    float normalized = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
    float displayNorm = clamp((normalized - u_min) / (u_max - u_min), 0.0, 1.0);
    vec3 color = texture(u_color_map, vec2(displayNorm, 0.5)).rgb;

    fragColor = vec4(color, 1.0) * valid;
}
`,w=`#version 300 es
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D u_band_r;
uniform sampler2D u_band_g;
uniform sampler2D u_band_b;
uniform float u_r_min;
uniform float u_r_max;
uniform float u_g_min;
uniform float u_g_max;
uniform float u_b_min;
uniform float u_b_max;

in vec2 v_tex_coord;
out vec4 fragColor;

float decodeBand(sampler2D tex) {
    vec4 texel = texture(tex, v_tex_coord);
    float valid = step(0.001, texel.a);
    vec3 rgb = texel.rgb * 255.0;
    float normalized = (rgb.r * 256.0 + rgb.g + rgb.b / 256.0) / 65535.0;
    return mix(-1.0, normalized, valid);
}

void main() {
    float inBounds = step(0.0, v_tex_coord.x) * step(v_tex_coord.x, 1.0)
                   * step(0.0, v_tex_coord.y) * step(v_tex_coord.y, 1.0);

    float r = decodeBand(u_band_r);
    float g = decodeBand(u_band_g);
    float b = decodeBand(u_band_b);

    float valid = inBounds * step(0.0, r) * step(0.0, g) * step(0.0, b);

    float rNorm = clamp((r - u_r_min) / (u_r_max - u_r_min), 0.0, 1.0);
    float gNorm = clamp((g - u_g_min) / (u_g_max - u_g_min), 0.0, 1.0);
    float bNorm = clamp((b - u_b_min) / (u_b_max - u_b_min), 0.0, 1.0);

    fragColor = vec4(rNorm, gNorm, bNorm, 1.0) * valid;
}
`,v=`#version 300 es
in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_tex_coord;

void main() {
    // a_position: 0-1 正規化座標 → クリップ座標 -1〜1
    gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
    // Y軸反転（タイル座標は上が0、GL座標は下が-1）
    gl_Position.y = -gl_Position.y;
    v_tex_coord = a_texcoord;
}
`;const E=new Map,g=(e,i,s)=>{const n=e.createShader(i);return n?(e.shaderSource(n,s),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(console.error("Shader compile error:",e.getShaderInfoLog(n)),e.deleteShader(n),null)):null},T=(e,i,s)=>{const n=g(e,e.VERTEX_SHADER,i),t=g(e,e.FRAGMENT_SHADER,s);if(!n||!t)throw new Error("Failed to compile shaders");const a=e.createProgram();if(!a)throw new Error("Failed to create program");if(e.attachShader(a,n),e.attachShader(a,t),e.linkProgram(a),!e.getProgramParameter(a,e.LINK_STATUS))throw new Error("Program link error: "+e.getProgramInfoLog(a));return a},y=e=>{let i=E.get(e);if(i)return i;const s=new OffscreenCanvas(e,e),n=s.getContext("webgl2");if(!n)throw new Error("WebGL2 not supported");const t=T(n,v,N),a=T(n,v,w);return i={canvas:s,gl:n,singleProgram:t,multiProgram:a,texturePool:new Map},E.set(e,i),i},x=(e,i,s,n,t,a)=>{const{gl:r,texturePool:u}=e,m=r.TEXTURE0+i;let _=u.get(i)??null;const b=!_;b&&(_=r.createTexture(),u.set(i,_)),r.activeTexture(m),r.bindTexture(r.TEXTURE_2D,_),r.uniform1i(r.getUniformLocation(n,s),i),a?r.texImage2D(r.TEXTURE_2D,0,r.RGB,256,1,0,r.RGB,r.UNSIGNED_BYTE,t):r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,t),b&&(r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR))},A=(e,i,s)=>{const n=e.getAttribLocation(i,"a_position"),t=e.getAttribLocation(i,"a_texcoord");if(s&&s.length>0){const a=[];for(const m of s)for(let _=0;_<3;_++)a.push(m.target[_][0],m.target[_][1]),a.push(m.source[_][0],m.source[_][1]);const r=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,new Float32Array(a),e.DYNAMIC_DRAW);const u=4*4;e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,u,0),t>=0&&(e.enableVertexAttribArray(t),e.vertexAttribPointer(t,2,e.FLOAT,!1,u,2*4)),e.drawArrays(e.TRIANGLES,0,s.length*3),e.deleteBuffer(r)}else{const a=new Float32Array([0,0,0,0,1,0,1,0,0,1,0,1,1,1,1,1]),r=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,a,e.STATIC_DRAW);const u=4*4;e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,u,0),t>=0&&(e.enableVertexAttribArray(t),e.vertexAttribPointer(t,2,e.FLOAT,!1,u,2*4)),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.deleteBuffer(r)}};let R=Promise.resolve();self.onmessage=e=>{R=R.then(()=>C(e))};async function C(e){const{tileId:i,mode:s,tileSize:n=256,triangles:t,bandTexture:a,colorMapArray:r,min:u,max:m,bandR:_,bandG:b,bandB:P,rMin:h,rMax:L,gMin:B,gMax:D,bMin:U,bMax:S}=e.data;try{const c=y(n),{canvas:I,gl:o}=c;if(o.viewport(0,0,n,n),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),s==="single"){const f=c.singleProgram;o.useProgram(f),o.uniform1f(o.getUniformLocation(f,"u_min"),u),o.uniform1f(o.getUniformLocation(f,"u_max"),m);let d=0;x(c,d++,"u_band_texture",f,a,!1),x(c,d++,"u_color_map",f,r,!0),A(o,f,t)}else{const f=c.multiProgram;o.useProgram(f),o.uniform1f(o.getUniformLocation(f,"u_r_min"),h),o.uniform1f(o.getUniformLocation(f,"u_r_max"),L),o.uniform1f(o.getUniformLocation(f,"u_g_min"),B),o.uniform1f(o.getUniformLocation(f,"u_g_max"),D),o.uniform1f(o.getUniformLocation(f,"u_b_min"),U),o.uniform1f(o.getUniformLocation(f,"u_b_max"),S);let d=0;x(c,d++,"u_band_r",f,_,!1),x(c,d++,"u_band_g",f,b,!1),x(c,d++,"u_band_b",f,P,!1),A(o,f,t)}const p=await M(I);if(p instanceof ImageBitmap)self.postMessage({id:i,imageBitmap:p},{transfer:[p]});else{const f=await p.arrayBuffer();self.postMessage({id:i,buffer:f})}}catch(c){c instanceof Error&&self.postMessage({id:i,error:c.message})}}
