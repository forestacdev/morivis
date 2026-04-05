let T=null;const $=()=>{if(T!==null)return T;T=!1;const e=5,s=new OffscreenCanvas(e,e).getContext("2d",{willReadFrequently:!0});if(!s)return!1;for(let o=0;o<e*e;o++){const r=o*4;s.fillStyle=`rgb(${r},${r+1},${r+2})`,s.fillRect(o%e,Math.floor(o/e),1,1)}const n=s.getImageData(0,0,e,e).data;for(let o=0;o<e*e*4;o++)if(o%4!==3&&n[o]!==o){T=!0;break}return T},q=async e=>{if($())try{return e.transferToImageBitmap()}catch{}return await e.convertToBlob()};var K=`#version 300 es
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
`,Q=`#version 300 es
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
`,A=`#version 300 es
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
`;const P=new Map,U=(e,a,s)=>{const n=e.createShader(a);return n?(e.shaderSource(n,s),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(console.error("Shader compile error:",e.getShaderInfoLog(n)),e.deleteShader(n),null)):null},L=(e,a,s)=>{const n=U(e,e.VERTEX_SHADER,a),o=U(e,e.FRAGMENT_SHADER,s);if(!n||!o)throw new Error("Failed to compile shaders");const r=e.createProgram();if(!r)throw new Error("Failed to create program");if(e.attachShader(r,n),e.attachShader(r,o),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw new Error("Program link error: "+e.getProgramInfoLog(r));return r},j=e=>{let a=P.get(e);if(a)return a;const s=new OffscreenCanvas(e,e),n=s.getContext("webgl2");if(!n)throw new Error("WebGL2 not supported");const o=L(n,A,K),r=L(n,A,Q);return a={canvas:s,gl:n,singleProgram:o,multiProgram:r,texturePool:new Map},P.set(e,a),a},R=(e,a,s,n,o,r)=>{const i=new Uint8ClampedArray(a*s*4),t=o-n,u=t!==0?65535/t:0;for(let f=0;f<e.length;f++){const l=e[f],m=f*4;if(r!==null&&l===r||!isFinite(l)){i[m]=0,i[m+1]=0,i[m+2]=0,i[m+3]=0;continue}const x=(l-n)*u;i[m]=Math.floor(x/256),i[m+1]=Math.floor(x)%256,i[m+2]=Math.floor(x%1*256),i[m+3]=255}return i},g=(e,a,s,n,o,r,i)=>{const{gl:t,texturePool:u}=e,f=t.TEXTURE0+a;let l=u.get(a)??null;const m=!l;m&&(l=t.createTexture(),u.set(a,l)),t.activeTexture(f),t.bindTexture(t.TEXTURE_2D,l),t.uniform1i(t.getUniformLocation(n,s),a),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,r,i,0,t.RGBA,t.UNSIGNED_BYTE,o),m&&(t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR))},J=(e,a,s,n,o)=>{const{gl:r,texturePool:i}=e,t=r.TEXTURE0+a;let u=i.get(a)??null;const f=!u;f&&(u=r.createTexture(),i.set(a,u)),r.activeTexture(t),r.bindTexture(r.TEXTURE_2D,u),r.uniform1i(r.getUniformLocation(n,s),a),r.texImage2D(r.TEXTURE_2D,0,r.RGB,256,1,0,r.RGB,r.UNSIGNED_BYTE,o),f&&(r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR))},h=(e,a,s)=>{const n=e.getAttribLocation(a,"a_position"),o=e.getAttribLocation(a,"a_texcoord");if(s&&s.length>0){const r=[];for(const u of s)for(let f=0;f<3;f++)r.push(u.target[f][0],u.target[f][1]),r.push(u.source[f][0],u.source[f][1]);const i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,new Float32Array(r),e.DYNAMIC_DRAW);const t=4*4;e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,t,0),o>=0&&(e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,t,2*4)),e.drawArrays(e.TRIANGLES,0,s.length*3),e.deleteBuffer(i)}else{const r=new Float32Array([0,0,0,0,1,0,1,0,0,1,0,1,1,1,1,1]),i=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,i),e.bufferData(e.ARRAY_BUFFER,r,e.STATIC_DRAW);const t=4*4;e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,t,0),o>=0&&(e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,t,2*4)),e.drawArrays(e.TRIANGLE_STRIP,0,4),e.deleteBuffer(i)}};let M=Promise.resolve();self.onmessage=e=>{M=M.then(()=>Z(e))};async function Z(e){const{tileId:a,mode:s,tileSize:n=256,triangles:o,srcWidth:r,srcHeight:i,nodata:t,band:u,dataMin:f,dataMax:l,colorMapArray:m,min:x,max:D,bandR:B,bandG:F,bandB:N,dataMinR:G,dataMaxR:I,dataMinG:S,dataMaxG:w,dataMinB:y,dataMaxB:C,rMin:X,rMax:O,gMin:W,gMax:Y,bMin:H,bMax:V}=e.data;try{const d=j(n),{canvas:z,gl:_}=d;if(_.viewport(0,0,n,n),_.clearColor(0,0,0,0),_.clear(_.COLOR_BUFFER_BIT),s==="single"){const c=d.singleProgram;_.useProgram(c),_.uniform1f(_.getUniformLocation(c,"u_min"),x),_.uniform1f(_.getUniformLocation(c,"u_max"),D);const p=R(u,r,i,f,l,t);let b=0;g(d,b++,"u_band_texture",c,p,r,i),J(d,b++,"u_color_map",c,m),h(_,c,o)}else{const c=d.multiProgram;_.useProgram(c),_.uniform1f(_.getUniformLocation(c,"u_r_min"),X),_.uniform1f(_.getUniformLocation(c,"u_r_max"),O),_.uniform1f(_.getUniformLocation(c,"u_g_min"),W),_.uniform1f(_.getUniformLocation(c,"u_g_max"),Y),_.uniform1f(_.getUniformLocation(c,"u_b_min"),H),_.uniform1f(_.getUniformLocation(c,"u_b_max"),V);const p=R(B,r,i,G,I,t),b=R(F,r,i,S,w,t),k=R(N,r,i,y,C,t);let v=0;g(d,v++,"u_band_r",c,p,r,i),g(d,v++,"u_band_g",c,b,r,i),g(d,v++,"u_band_b",c,k,r,i),h(_,c,o)}const E=await q(z);if(E instanceof ImageBitmap)self.postMessage({id:a,imageBitmap:E},{transfer:[E]});else{const c=await E.arrayBuffer();self.postMessage({id:a,buffer:c})}}catch(d){d instanceof Error&&self.postMessage({id:a,error:d.message})}}
