let E=null;const Q=()=>{if(E!==null)return E;E=!1;const e=5,c=new OffscreenCanvas(e,e).getContext("2d",{willReadFrequently:!0});if(!c)return!1;for(let n=0;n<e*e;n++){const t=n*4;c.fillStyle=`rgb(${t},${t+1},${t+2})`,c.fillRect(n%e,Math.floor(n/e),1,1)}const o=c.getImageData(0,0,e,e).data;for(let n=0;n<e*e*4;n++)if(n%4!==3&&o[n]!==n){E=!0;break}return E},j=async e=>{if(Q())try{return e.transferToImageBitmap()}catch{}return await e.convertToBlob()};var J=`#version 300 es
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
`,Z=`#version 300 es
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
`,P=`#version 300 es
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
`;const U=new Map,B=(e,a,c)=>{const o=e.createShader(a);return o?(e.shaderSource(o,c),e.compileShader(o),e.getShaderParameter(o,e.COMPILE_STATUS)?o:(console.error("Shader compile error:",e.getShaderInfoLog(o)),e.deleteShader(o),null)):null},L=(e,a,c)=>{const o=B(e,e.VERTEX_SHADER,a),n=B(e,e.FRAGMENT_SHADER,c);if(!o||!n)throw new Error("Failed to compile shaders");const t=e.createProgram();if(!t)throw new Error("Failed to create program");if(e.attachShader(t,o),e.attachShader(t,n),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS))throw new Error("Program link error: "+e.getProgramInfoLog(t));return t},ee=(e,a)=>{const c=`${e}x${a}`;let o=U.get(c);if(o)return o;const n=new OffscreenCanvas(e,a),t=n.getContext("webgl2");if(!t)throw new Error("WebGL2 not supported");const i=L(t,P,Z),r=L(t,P,J);return o={canvas:n,gl:t,singleProgram:i,multiProgram:r,texturePool:new Map},U.set(c,o),o},R=(e,a,c,o,n,t)=>{const i=new Uint8ClampedArray(a*c*4),r=n-o,f=r!==0?65535/r:0;for(let s=0;s<e.length;s++){const m=e[s],l=s*4;if(t!==null&&m===t||!isFinite(m)){i[l]=0,i[l+1]=0,i[l+2]=0,i[l+3]=0;continue}const x=(m-o)*f;i[l]=Math.floor(x/256),i[l+1]=Math.floor(x)%256,i[l+2]=Math.floor(x%1*256),i[l+3]=255}return i},p=(e,a,c,o,n,t,i)=>{const{gl:r,texturePool:f}=e,s=r.TEXTURE0+a;let m=f.get(a)??null;const l=!m;l&&(m=r.createTexture(),f.set(a,m)),r.activeTexture(s),r.bindTexture(r.TEXTURE_2D,m),r.uniform1i(r.getUniformLocation(o,c),a),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,t,i,0,r.RGBA,r.UNSIGNED_BYTE,n),l&&(r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR))},te=(e,a,c,o,n)=>{const{gl:t,texturePool:i}=e,r=t.TEXTURE0+a;let f=i.get(a)??null;const s=!f;s&&(f=t.createTexture(),i.set(a,f)),t.activeTexture(r),t.bindTexture(t.TEXTURE_2D,f),t.uniform1i(t.getUniformLocation(o,c),a),t.texImage2D(t.TEXTURE_2D,0,t.RGB,256,1,0,t.RGB,t.UNSIGNED_BYTE,n),s&&(t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR))},h=(e,a,c)=>{const o=e.getAttribLocation(a,"a_position"),n=e.getAttribLocation(a,"a_texcoord");if(c&&c.length>0){const t=[];for(const f of c)for(let s=0;s<3;s++)t.push(f.target[s][0],f.target[s][1]),t.push(f.source[s][0],f.source[s][1]);const i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,new Float32Array(t),e.DYNAMIC_DRAW);const r=4*4;e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,r,0),n>=0&&(e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,r,2*4)),e.drawArrays(e.TRIANGLES,0,c.length*3),e.deleteBuffer(i)}else{const t=new Float32Array([0,0,0,0,1,0,1,0,0,1,0,1,1,1,1,1]),i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW);const r=4*4;e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,r,0),n>=0&&(e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,r,2*4)),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.deleteBuffer(i)}};let M=Promise.resolve();self.onmessage=e=>{M=M.then(()=>re(e))};async function re(e){const{tileId:a,mode:c,tileSize:o=256,targetWidth:n=o,targetHeight:t=o,preferBlob:i=!1,triangles:r,srcWidth:f,srcHeight:s,nodata:m,band:l,dataMin:x,dataMax:D,colorMapArray:S,min:F,max:N,bandR:w,bandG:y,bandB:G,dataMinR:I,dataMaxR:C,dataMinG:X,dataMaxG:O,dataMinB:W,dataMaxB:Y,rMin:z,rMax:H,gMin:V,gMax:$,bMin:k,bMax:q}=e.data;try{const d=ee(n,t),{canvas:v,gl:_}=d;if(_.viewport(0,0,n,t),_.clearColor(0,0,0,0),_.clear(_.COLOR_BUFFER_BIT),c==="single"){const u=d.singleProgram;_.useProgram(u),_.uniform1f(_.getUniformLocation(u,"u_min"),F),_.uniform1f(_.getUniformLocation(u,"u_max"),N);const T=R(l,f,s,x,D,m);let g=0;p(d,g++,"u_band_texture",u,T,f,s),te(d,g++,"u_color_map",u,S),h(_,u,r)}else{const u=d.multiProgram;_.useProgram(u),_.uniform1f(_.getUniformLocation(u,"u_r_min"),z),_.uniform1f(_.getUniformLocation(u,"u_r_max"),H),_.uniform1f(_.getUniformLocation(u,"u_g_min"),V),_.uniform1f(_.getUniformLocation(u,"u_g_max"),$),_.uniform1f(_.getUniformLocation(u,"u_b_min"),k),_.uniform1f(_.getUniformLocation(u,"u_b_max"),q);const T=R(w,f,s,I,C,m),g=R(y,f,s,X,O,m),K=R(G,f,s,W,Y,m);let A=0;p(d,A++,"u_band_r",u,T,f,s),p(d,A++,"u_band_g",u,g,f,s),p(d,A++,"u_band_b",u,K,f,s),h(_,u,r)}const b=i?await v.convertToBlob({type:"image/png"}):await j(v);if(!i&&b instanceof ImageBitmap)self.postMessage({id:a,imageBitmap:b},{transfer:[b]});else{const T=await(b instanceof Blob?b:await v.convertToBlob({type:"image/png"})).arrayBuffer();self.postMessage({id:a,buffer:T})}}catch(d){d instanceof Error&&self.postMessage({id:a,error:d.message})}}
