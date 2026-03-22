var P=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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

    // vec3 debugAnimeColor = vec3(sin(time) *2.0, cos(time) * 2.0, sin(time * 0.5) * 2.0);
    gl_FragColor = vec4(col, alpha);


}`,b=`attribute vec2 a_position;
varying vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;let e=null,r=null,h=null,E=null,p=null,l=null,s=null,i=!1,m=0,d=0,f=null;const S=(n,o,c)=>{const t=n.createShader(o);return t?(n.shaderSource(t,c),n.compileShader(t),n.getShaderParameter(t,n.COMPILE_STATUS)?t:(console.error(n.getShaderInfoLog(t)),n.deleteShader(t),null)):(console.error("Failed to create shader"),null)},L=(n,o,c)=>{const t=n.createProgram();return n.attachShader(t,o),n.attachShader(t,c),n.linkProgram(t),n.getProgramParameter(t,n.LINK_STATUS)?t:(console.error(n.getProgramInfoLog(t)),n.deleteProgram(t),null)},R=n=>{if(i)return;T(),i=!0,d=n;const o=()=>{const t=(performance.now()-d)/1e3;if(!e||!i){console.error("WebGL context not available or animation stopped");return}e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(r),e.uniform1f(h,t),e.uniform2f(p,e.drawingBufferWidth,e.drawingBufferHeight),e.drawArrays(e.TRIANGLES,0,6),i&&(s=self.requestAnimationFrame(o))};s=self.requestAnimationFrame(o)},x=()=>{T(),s!==null&&(self.cancelAnimationFrame(s),s=null),i=!1},T=()=>{f!==null&&(clearTimeout(f),f=null)},w=async(n=1500)=>{T(),f=self.setTimeout(()=>{s!==null&&(self.cancelAnimationFrame(s),s=null),i=!1,f=null},n)},g=()=>{if(!e){console.error("WebGL context not available");return}e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(r),e.uniform1f(h,0),e.uniform2f(p,e.drawingBufferWidth,e.drawingBufferHeight),e.drawArrays(e.TRIANGLES,0,6)},y=()=>({isAnimating:i,currentAnimationFlag:m,hasDelayedStopTimer:f!==null,animationId:s!==null});self.onmessage=n=>{performance.now();const{type:o,canvas:c,width:t,height:v}=n.data;if(o==="init"){if(e=c.getContext("webgl"),!e){console.error("WebGL context not available");return}const a=S(e,e.VERTEX_SHADER,b),u=S(e,e.FRAGMENT_SHADER,P);if(!a||!u){console.error("Failed to create shaders");return}if(r=L(e,a,u),!r){console.error("Failed to create shader program");return}e.useProgram(r);const A=e.getAttribLocation(r,"a_position");h=e.getUniformLocation(r,"time"),p=e.getUniformLocation(r,"resolution"),l=e.getUniformLocation(r,"animationFlag"),e.uniform1f(l,0),m=0;const _=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,_);const F=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1];e.bufferData(e.ARRAY_BUFFER,new Float32Array(F),e.STATIC_DRAW),e.enableVertexAttribArray(A),e.bindBuffer(e.ARRAY_BUFFER,_),e.vertexAttribPointer(A,2,e.FLOAT,!1,0,0),E=e.createTexture(),e.bindTexture(e.TEXTURE_2D,E),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.viewport(0,0,e.drawingBufferWidth,e.drawingBufferHeight),e.canvas.width=t,e.canvas.height=v,e.viewport(0,0,t,v),g(),self.postMessage({type:"initialized"})}else if(o==="resize"){const{width:a,height:u}=n.data;if(!e){console.error("WebGL context not available");return}x(),e.canvas.width=a,e.canvas.height=u,e.viewport(0,0,a,u),e.useProgram(r),e.uniform1f(l,0),m=0,g()}else if(o==="transition"){const{animationFlag:a}=n.data;if(!e||!l){console.error("WebGL context or uniform location not available");return}e.useProgram(r),e.uniform1f(l,a),m=a,d=performance.now(),a===1?i||R(d):a===-1&&(i||R(d),w(1500))}else o==="stop"?(x(),m=0,e&&l&&(e.useProgram(r),e.uniform1f(l,0),g())):o==="status"&&self.postMessage({type:"status_response",status:y()})};
