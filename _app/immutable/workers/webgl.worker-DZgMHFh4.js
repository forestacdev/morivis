(function(){"use strict";var T=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;
uniform vec2 resolution;
uniform float time;
uniform float animationFlag; // 0=何もしない, 1=出現アニメ, -1=消失アニメ

// 六角形の距離関数
float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.732)));
    c = max(c, p.x);
    return c;
}

// 六角グリッドの座標変換
vec4 hexCoords(vec2 uv) {
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;

    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;

    vec2 gv = dot(a, a) < dot(b, b) ? a : b;
    vec2 id = uv - gv;

    return vec4(gv, id);
}

void main(void) {
    // 正規化された画面座標 (-1 to 1)
    vec2 screenUV = (gl_FragCoord.xy - 0.5 * resolution.xy) / min(resolution.x, resolution.y);
    
    // 六角グリッド用の座標
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    float baseScale = 10.0;
    uv *= baseScale;

    vec4 hc = hexCoords(uv);
    vec2 gv = hc.xy;
    vec2 id = hc.zw;

    // 画面座標での基準点設定（右下角から開始）
    vec2 startPoint = vec2(1.0, -1.0); // 右下角
    vec2 direction = normalize(vec2(-1.0, 1.0)); // 左上への方向ベクトル（45度）
    
    // 各六角形の画面座標での位置を計算
    vec2 hexScreenPos = (id / baseScale) * resolution.y / min(resolution.x, resolution.y);
    
    // 基準点からの距離（方向ベクトルに沿った距離）
    vec2 toHex = hexScreenPos - startPoint;
    float distAlongDirection = dot(toHex, direction);
    
    // アニメーション設定
    float animationSpeed = 4.0;
    float delayPerUnitDist = 1.0; // 単位距離あたりの遅延
    float scale = 0.0;

    if (animationFlag > 0.5) {
        // 出現アニメーション (0から1へ)
        float appearTiming = distAlongDirection * delayPerUnitDist - time * animationSpeed;
        scale = smoothstep(0.0, -1.0, appearTiming);
    } else if (animationFlag < -0.5) {
        // 消失アニメーション (1から0へ)
        float disappearTiming = distAlongDirection * delayPerUnitDist - time * animationSpeed;
        scale = 1.0 - smoothstep(0.0, -1.0, disappearTiming);
    }

    vec3 col = vec3(0.1176, 0.1176, 0.1176);
    float alpha = 0.0;

    if (scale > 0.0) {
        float d = hexDist(gv);
        float hexagon = smoothstep(0.52, 0.5, d / scale);
        alpha = hexagon * scale;
    }

    gl_FragColor = vec4(col, alpha);
}`,_=`attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;let e=null,o=null,f=null,u=null,d=null,c=null;const m=(n,s,a)=>{const t=n.createShader(s);return t?(n.shaderSource(t,a),n.compileShader(t),n.getShaderParameter(t,n.COMPILE_STATUS)?t:(console.error(n.getShaderInfoLog(t)),n.deleteShader(t),null)):(console.error("Failed to create shader"),null)},E=(n,s,a)=>{const t=n.createProgram();return n.attachShader(t,s),n.attachShader(t,a),n.linkProgram(t),n.getProgramParameter(t,n.LINK_STATUS)?t:(console.error(n.getProgramInfoLog(t)),n.deleteProgram(t),null)};self.onmessage=n=>{const s=performance.now(),{type:a,canvas:t,width:l,height:v}=n.data;if(a==="init"){if(e=t.getContext("webgl"),!e){console.error("WebGL context not available");return}const r=m(e,e.VERTEX_SHADER,_),i=m(e,e.FRAGMENT_SHADER,T);if(!r||!i){console.error("Failed to create shaders");return}if(o=E(e,r,i),!o){console.error("Failed to create shader program");return}const g=e.getAttribLocation(o,"a_position");f=e.getUniformLocation(o,"time"),d=e.getUniformLocation(o,"resolution"),c=e.getUniformLocation(o,"animationFlag"),e.uniform1f(c,0);const p=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,p);const x=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1];e.bufferData(e.ARRAY_BUFFER,new Float32Array(x),e.STATIC_DRAW),e.useProgram(o),e.enableVertexAttribArray(g),e.bindBuffer(e.ARRAY_BUFFER,p),e.vertexAttribPointer(g,2,e.FLOAT,!1,0,0),u=e.createTexture(),e.bindTexture(e.TEXTURE_2D,u),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.canvas.width=l,e.canvas.height=v,e.viewport(0,0,l,v),self.postMessage({type:"initialized"})}else if(a==="resize"){const{width:r,height:i}=n.data;if(!e){console.error("WebGL context not available");return}e.canvas.width=r,e.canvas.height=i,e.viewport(0,0,r,i),e.uniform1f(c,0)}else if(a==="transition"){const{animationFlag:r}=n.data;if(!e||!c){console.error("WebGL context or uniform location not available");return}e.useProgram(o),e.uniform1f(c,r)}const h=()=>{const i=(performance.now()-s)/1e3;if(!e){console.error("WebGL context not available");return}e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(o),e.uniform1f(f,i),e.uniform2f(d,e.drawingBufferWidth,e.drawingBufferHeight),e.drawArrays(e.TRIANGLES,0,6),self.requestAnimationFrame(h)};self.requestAnimationFrame(h)}})();
