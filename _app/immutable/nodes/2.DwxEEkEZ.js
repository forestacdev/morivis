import{t as ee,a as V}from"../chunks/CTGbhQev.js";import{p as me,o as he,ar as ge,d as k,a as we,c as y,g as C,s as O,b as te,r as M,t as pe}from"../chunks/DoYK5enb.js";import{d as xe}from"../chunks/D2V9Pmsh.js";import{i as be,s as _e,a as S}from"../chunks/BE9aEvYs.js";import{I as q,a as Y,b as z,i as ye,c as Me,t as Ce,d as Te}from"../chunks/DHUyjTK2.js";import{b as Pe}from"../chunks/CqQ_GNuP.js";import{f as Z,g as ke,b as ne,d as D,B as De,h as $,M as oe,i as Ie,S as J,P as Re,O as We,j as Fe,k as K,N as Q,l as Ae,W as Se,m as ze}from"../chunks/BU1-WxVn.js";import{T as $e}from"../chunks/ClwP2i3y.js";import{g as Ee}from"../chunks/DSX-eWcP.js";import{F as He}from"../chunks/B82XnbQD.js";import{c as Ne}from"../chunks/BOVylflK.js";const Ue=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,je=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Be=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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

}`,Ge=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,X=h=>Math.pow(2,Math.ceil(Math.log2(h))),Le=(h="morivis",o=1280,c="#ffffff",x="Arial, sans-serif")=>{const s=document.createElement("canvas"),e=s.getContext("2d");if(!e)throw new Error("Failed to get canvas context");e.font=`${o}px ${x}`,e.textAlign="left",e.textBaseline="top";const g=e.measureText(h),l=Math.ceil(g.width)+20,u=o+20,r=X(l),n=X(u);return s.width=r,s.height=n,e.clearRect(0,0,r,n),e.font=`${o}px ${x}`,e.textAlign="left",e.textBaseline="top",e.fillStyle=c,e.fillText(h,10,10),e.getImageData(0,0,s.width,s.height),s},H={time:{value:0},uColor:{value:new Z("rgb(252, 252, 252)")},uColor2:{value:new Z("rgb(0, 194, 36)")},resolution:{value:new D(window.innerWidth,window.innerHeight)}},E={screenCenter:{value:new D(.5,.5)},resolution:{value:new D(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new ke(Le())},uTextureResolution:{value:new D(1e3,750)}},Ve=new ne({uniforms:H,vertexShader:Ge,fragmentShader:Be,transparent:!0}),Oe=async(h,o=.1)=>{const x=await(await fetch(h)).blob(),s=new Image;s.src=URL.createObjectURL(x),await new Promise((n,t)=>{s.onload=n,s.onerror=t});const e=document.createElement("canvas");e.width=s.width,e.height=s.height;const g=e.getContext("2d");if(!g)throw new Error("Failed to get canvas context");g.drawImage(s,0,0);const l=g.getImageData(0,0,e.width,e.height).data,u=l.length/4|0,r=new Float32Array(u);for(let n=0,t=0;n<l.length;n+=4,t++){const d=l[n],T=l[n+1],w=l[n+2],a=(-1e4+(d*256*256+T*256+w)*.1)*o;r[t]=a}return{width:e.width,height:e.height,data:r}},qe=async()=>{const{data:h,width:o,height:c}=await Oe("./terrainrgb.png",.15),x=1,s=1,e=new De,g=o*x/2,l=c*s/2,u=new Float32Array(o*c*3);for(let a=0;a<c;a++)for(let i=0;i<o;i++){const m=a*o+i,b=i*x-g,_=h[m],p=a*s-l,P=m*3;u[P]=b,u[P+1]=_,u[P+2]=p}e.setAttribute("position",new $(u,3));const r=new Float32Array(o*c*2);for(let a=0;a<c;a++)for(let i=0;i<o;i++){const m=a*o+i,b=i/(o-1),_=a/(c-1),p=m*2;r[p]=b,r[p+1]=_}e.setAttribute("uv",new $(r,2));const n=(o-1)*(c-1),t=new Uint32Array(n*6);let d=0;for(let a=0;a<c-1;a++)for(let i=0;i<o-1;i++){const m=a*o+i,b=m+o,_=m+1,p=b+1;t[d++]=m,t[d++]=b,t[d++]=_,t[d++]=b,t[d++]=p,t[d++]=_}e.setIndex(new $(t,1));const T=new oe(e,Ve);T.name="dem",e.computeVertexNormals();const w=new Ie().makeRotationY(Math.PI/-2);return e.applyMatrix4(w),T},Ye=(h,o)=>{te(o,!1),Ee("/morivis/map")};var Ze=ee("<button>マップを見る</button>"),Je=ee('<div class="app relative flex h-dvh w-dvw"><canvas class="h-full w-full bg-gray-900"></canvas> <div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow text-[100px] font-bold text-white svelte-1xggvkh">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center justify-between px-8 opacity-90"><div class="flex gap-3"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white"><span class="select-none underline">利用規約</span></button></div></div>');function lt(h,o){me(o,!0);const[c,x]=_e(),s=()=>S(Y,"$showInfoDialog",c),e=()=>S(z,"$showTermsDialog",c),g=()=>S(ye,"$isBlocked",c);let l=O(null),u,r,n,t,d,T=O(!0),w,a,i;const m=()=>{const v=window.innerWidth,f=window.innerHeight;H.resolution.value.set(v,f),n.setPixelRatio(window.devicePixelRatio),n.setSize(v,f),r.aspect=v/f,r.updateProjectionMatrix(),E.resolution.value.set(v,f),w&&(w.setSize(v,f),i.material.uniforms.resolution.value.set(v,f))};he(async()=>{if(!C(l)||!C(l))return;const v={width:window.innerWidth,height:window.innerHeight};u=new J,r=new Re(75,window.innerWidth/window.innerHeight,.1,1e5);const j=-170*Math.PI/180,B=180;r.position.x=B*Math.sin(j),r.position.z=B*Math.cos(j),r.position.y=90,u.add(r),a=new J;const de=C(l).getContext("webgl2");t=new We(r,C(l)),t.enableDamping=!0,t.enablePan=!1,t.enableZoom=!1,t.autoRotateSpeed=.5,t.autoRotate=!0,t.minDistance=100,t.maxDistance=500,t.maxPolarAngle=Math.PI/2-.35,d=new $e(r,C(l)),d.noPan=!0,d.noRotate=!0,d.zoomSpeed=.2,w=new Fe(v.width,v.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:Q,minFilter:Q,wrapS:K,wrapT:K}),E.screenTexture.value=w.texture;const ve=new Ae(2,2),ue=new ne({fragmentShader:Ue,vertexShader:je,uniforms:E});i=new oe(ve,ue),a.add(i),n=new Se({canvas:C(l),context:de,alpha:!0}),n.setSize(window.innerWidth,window.innerHeight),n.setPixelRatio(Math.min(window.devicePixelRatio,2));const G=await qe();G?u.add(G):console.error("Failed to create DEM mesh");const fe=new ze,L=()=>{requestAnimationFrame(L),t.update(),d.update(),H.time.value=fe.getElapsedTime(),n.setRenderTarget(w),n.render(u,r),n.setRenderTarget(null),n.render(a,r),i.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};L(),window.addEventListener("resize",m),m(),Ne()||z.set(!0)}),ge(()=>{t.dispose(),d.dispose(),u.clear(),n.dispose(),w.dispose(),i.geometry.dispose(),window.removeEventListener("resize",m)});const b=()=>{Y.set(!s())},_=()=>{z.set(!e())};var p=Je(),P=y(p);Pe(P,v=>te(l,v),()=>C(l));var I=k(P,2),N=y(I),re=k(y(N),2);{var ae=v=>{var f=Ze();f.__click=[Ye,T],pe(()=>{Me(f,1,`bg-base hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 text-2xl transition-all duration-200 hover:text-white ${g()?"pointer-events-none":"pointer-events-auto"}`),f.disabled=g()}),Ce(3,f,()=>Te,()=>({duration:300,axis:"y"})),V(v,f)};be(re,v=>{g()||v(ae)})}M(N),M(I);var U=k(I,2),R=y(U),W=y(R),ie=y(W);q(ie,{icon:"mdi:github",class:"h-8 w-8"}),M(W);var F=k(W,2);F.__click=b;var se=y(F);q(se,{icon:"akar-icons:info-fill",class:"h-7 w-7"}),M(F),M(R);var A=k(R,2),le=y(A);He(le,{width:"230"}),M(A);var ce=k(A,2);ce.__click=_,M(U),M(p),V(h,p),we(),x()}xe(["click"]);export{lt as component};
