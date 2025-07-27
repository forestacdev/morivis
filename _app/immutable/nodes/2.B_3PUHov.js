import{t as L,a as H}from"../chunks/DGlbTQzB.js";import{p as X,o as ee,as as te,a as ne,c as P,g as C,s as N,b as V,d as W,r as T,t as oe}from"../chunks/BhGCRYfc.js";import{d as re}from"../chunks/B3cittMl.js";import{i as ae,s as ie,a as se}from"../chunks/7t48_w1r.js";import{i as le,c as ce,t as de,d as ve,a as ue}from"../chunks/CbppkHeU.js";import{b as me}from"../chunks/B4D6-wy9.js";import{f as U,g as fe,b as O,d as R,B as he,h as F,M as q,i as ge,S as B,P as we,O as pe,j as xe,k as G,N as $,l as be,W as ye,m as Me}from"../chunks/BU1-WxVn.js";import{T as Ce}from"../chunks/ClwP2i3y.js";import{g as _e}from"../chunks/DhfIKGpT.js";import{F as Pe}from"../chunks/CfsgEpjf.js";import{c as Te}from"../chunks/BOVylflK.js";const Re=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform sampler2D screenTexture;
varying vec2 vUv;

uniform vec2 resolution;
uniform vec2 screenCenter;
uniform sampler2D uTexture;


void main() {
    vec4 screenColor = texture2D(screenTexture, vUv);
    vec4 textureColor = texture2D(uTexture, vUv);


    gl_FragColor = screenColor;
}`,We=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Fe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
//uniform 変数としてテクスチャのデータを受け取る
uniform sampler2D u_texture;
// vertexShaderで処理されて渡されるテクスチャ座標
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
varying mat4 vModelMatrix;
uniform vec3 uColor;
uniform vec3 uColor2;
uniform float time;
varying mat4 v_modelMatrix;
varying float v_fogDistance;

uniform vec2 resolution; // 画面の解像度


float edgeFactor(vec2 p){
    float thickness = 5.0;
    vec2 grid = abs(fract(p - 0.5) - 0.5) / fwidth(p) / thickness;
    return min(grid.x, grid.y);
}
void main(){

    //  フォッグの割合を計算 (線形補間)
    float fade = mod(time, 1.0); // u_timeを0〜1に正規化
    float fogFactor = smoothstep(0.0,300.0,  v_fogDistance);
    float fog_alpha = 1.0 - fogFactor; // フォッグが濃いほど透明に
    float coefficient = 1.2;
    float power = 1.0;
    vec3 glowColor = uColor;

    vec3 worldPosition = (vModelMatrix * vec4(vPosition, 1.0)).xyz;
    vec3 cameraToVertex = normalize(worldPosition - cameraPosition);
    float intensity = pow(coefficient + dot(cameraToVertex, normalize(vNormal)), power);

    // 等高線
    float contourInterval = 50.0; // 等高線の間隔
    float lineWidth = 6.0; // 等高線の線の幅
    float edgeWidth = 8.0; // 等高線の境界の幅（スムージング用）

    float t = time * 10.0;

    // 時間に基づいた変動を加えたY位置
    float yPos = vPosition.y - t;

    // 等高線の位置を計算
    float contourValue = mod(yPos, contourInterval);
    // 等高線のアルファ値を計算
    float alpha = smoothstep(lineWidth - edgeWidth, lineWidth, contourValue) - smoothstep(lineWidth, lineWidth + edgeWidth, contourValue);

    // 等高線の色
    vec3 contourColor = uColor2; // 赤色

    // 地形の色
    vec3 terrainColor = uColor; // グレー色

    // 等高線か地形かによって色を決定
    vec3 color = mix(terrainColor, contourColor, alpha);

    vec3 color2 = mix(color, glowColor, 0.5);


    // 法線ベクトルと「真上」方向（0,1,0）との角度を使って傾斜を検出
    float slope = 1.0 - dot(normalize(vNormal), vec3(0.0, 1.0, 0.0)); // 0 = 上向き, 1 = 横向き

    // 傾斜に応じたカラー補正（エッジが赤みを帯びるなど）
    vec3 slopeColor = mix(color2, vec3(0.0, 1.0, 0.898), pow(slope, .5)); // 傾斜が急なほどオレンジに近づく

    // fog + glow + contour + 傾斜
    gl_FragColor = vec4(slopeColor, fog_alpha) * intensity;

}`,ke=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
varying vec3 vPosition;
uniform float uTime;
varying vec3 vNormal;
varying mat4 vModelMatrix;
varying mat4 v_modelMatrix;
varying float v_fogDistance;

layout(location = 0) in vec3 aPos; // 頂点の位置

void main() {
    vUv = uv;
    vPosition = position;
    vNormal = normal;
    vModelMatrix = modelMatrix;
    // ワールド座標を計算
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    v_modelMatrix = modelMatrix;

    // 中心 (0, 0, 0) からの距離を計算
    v_fogDistance = length(worldPosition.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,j=h=>Math.pow(2,Math.ceil(Math.log2(h))),De=(h="morivis",t=1280,u="#ffffff",p="Arial, sans-serif")=>{const r=document.createElement("canvas"),e=r.getContext("2d");if(!e)throw new Error("Failed to get canvas context");e.font=`${t}px ${p}`,e.textAlign="left",e.textBaseline="top";const m=e.measureText(h),n=Math.ceil(m.width)+20,a=t+20,o=j(n),i=j(a);return r.width=o,r.height=i,e.clearRect(0,0,o,i),e.font=`${t}px ${p}`,e.textAlign="left",e.textBaseline="top",e.fillStyle=u,e.fillText(h,10,10),e.getImageData(0,0,r.width,r.height),r},D={time:{value:0},uColor:{value:new U("rgb(252, 252, 252)")},uColor2:{value:new U("rgb(0, 194, 36)")},resolution:{value:new R(window.innerWidth,window.innerHeight)}},k={screenCenter:{value:new R(.5,.5)},resolution:{value:new R(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new fe(De())},uTextureResolution:{value:new R(1e3,750)}},Ae=new O({uniforms:D,vertexShader:ke,fragmentShader:Fe,transparent:!0}),Se=async(h,t=.1)=>{const p=await(await fetch(h)).blob(),r=new Image;r.src=URL.createObjectURL(p),await new Promise((i,v)=>{r.onload=i,r.onerror=v});const e=document.createElement("canvas");e.width=r.width,e.height=r.height;const m=e.getContext("2d");if(!m)throw new Error("Failed to get canvas context");m.drawImage(r,0,0);const n=m.getImageData(0,0,e.width,e.height).data,a=n.length/4|0,o=new Float32Array(a);for(let i=0,v=0;i<n.length;i+=4,v++){const c=n[i],M=n[i+1],x=n[i+2],s=(-1e4+(c*256*256+M*256+x)*.1)*t;o[v]=s}return{width:e.width,height:e.height,data:o}},ze=async()=>{const{data:h,width:t,height:u}=await Se("./terrainrgb.png",.15),p=1,r=1,e=new he,m=t*p/2,n=u*r/2,a=new Float32Array(t*u*3);for(let s=0;s<u;s++)for(let l=0;l<t;l++){const g=s*t+l,w=l*p-m,b=h[g],y=s*r-n,_=g*3;a[_]=w,a[_+1]=b,a[_+2]=y}e.setAttribute("position",new F(a,3));const o=new Float32Array(t*u*2);for(let s=0;s<u;s++)for(let l=0;l<t;l++){const g=s*t+l,w=l/(t-1),b=s/(u-1),y=g*2;o[y]=w,o[y+1]=b}e.setAttribute("uv",new F(o,2));const i=(t-1)*(u-1),v=new Uint32Array(i*6);let c=0;for(let s=0;s<u-1;s++)for(let l=0;l<t-1;l++){const g=s*t+l,w=g+t,b=g+1,y=w+1;v[c++]=g,v[c++]=w,v[c++]=b,v[c++]=w,v[c++]=y,v[c++]=b}e.setIndex(new F(v,1));const M=new q(e,Ae);M.name="dem",e.computeVertexNormals();const x=new ge().makeRotationY(Math.PI/-2);return e.applyMatrix4(x),M},Ie=(h,t)=>{if(!Te()){ue.set(!0);return}V(t,!1),_e("/morivis/map")};var Ee=L("<button>マップを見る</button>"),He=L('<div class="app relative flex h-dvh w-dvw"><canvas class="h-full w-full bg-gray-900"></canvas> <div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow text-[100px] font-bold text-white svelte-1xggvkh">morivis</span> <!> <div class="absolute bottom-8 [&amp;_path]:fill-white"><!></div></div></div></div>');function Ze(h,t){X(t,!0);const[u,p]=ie(),r=()=>se(le,"$isBlocked",u);let e=N(null),m,n,a,o,i,v=N(!0),c,M,x;const s=()=>{const d=window.innerWidth,f=window.innerHeight;D.resolution.value.set(d,f),a.setPixelRatio(window.devicePixelRatio),a.setSize(d,f),n.aspect=d/f,n.updateProjectionMatrix(),k.resolution.value.set(d,f),c&&(c.setSize(d,f),x.material.uniforms.resolution.value.set(d,f))};ee(async()=>{if(!C(e)||!C(e))return;const d={width:window.innerWidth,height:window.innerHeight};m=new B,n=new we(75,window.innerWidth/window.innerHeight,.1,1e5);const S=-170*Math.PI/180,z=180;n.position.x=z*Math.sin(S),n.position.z=z*Math.cos(S),n.position.y=90,m.add(n),M=new B;const Z=C(e).getContext("webgl2");o=new pe(n,C(e)),o.enableDamping=!0,o.enablePan=!1,o.enableZoom=!1,o.autoRotateSpeed=.5,o.autoRotate=!0,o.minDistance=100,o.maxDistance=500,o.maxPolarAngle=Math.PI/2-.35,i=new Ce(n,C(e)),i.noPan=!0,i.noRotate=!0,i.zoomSpeed=.2,c=new xe(d.width,d.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:$,minFilter:$,wrapS:G,wrapT:G}),k.screenTexture.value=c.texture;const J=new be(2,2),K=new O({fragmentShader:Re,vertexShader:We,uniforms:k});x=new q(J,K),M.add(x),a=new ye({canvas:C(e),context:Z,alpha:!0}),a.setSize(window.innerWidth,window.innerHeight),a.setPixelRatio(Math.min(window.devicePixelRatio,2));const I=await ze();I?m.add(I):console.error("Failed to create DEM mesh");const Q=new Me,E=()=>{requestAnimationFrame(E),o.update(),i.update(),D.time.value=Q.getElapsedTime(),a.setRenderTarget(c),a.render(m,n),a.setRenderTarget(null),a.render(M,n),x.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};E(),window.addEventListener("resize",s),s()}),te(()=>{o.dispose(),i.dispose(),m.clear(),a.dispose(),c.dispose(),x.geometry.dispose(),window.removeEventListener("resize",s)});var l=He(),g=P(l);me(g,d=>V(e,d),()=>C(e));var w=W(g,2),b=P(w),y=W(P(b),2);{var _=d=>{var f=Ee();f.__click=[Ie,v],oe(()=>{ce(f,1,`bg-base hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 text-2xl transition-all duration-200 hover:text-white ${r()?"pointer-events-none":"pointer-events-auto"}`),f.disabled=r()}),de(3,f,()=>ve,()=>({duration:300,axis:"y"})),H(d,f)};ae(y,d=>{r()||d(_)})}var A=W(y,2),Y=P(A);Pe(Y,{width:"230"}),T(A),T(b),T(w),T(l),H(h,l),ne(),p()}re(["click"]);export{Ze as component};
