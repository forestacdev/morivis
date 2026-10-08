import"../chunks/CWj6FrbW.js";import{I as xe,p as be,o as ye,ar as _e,f as re,G as E,a as Q,b as Me,R as Ce,c as y,M as _,K as Z,N as J,F as T,P as $,r as M,t as Pe}from"../chunks/94hfI15Y.js";import{i as Te}from"../chunks/xXMv-Slb.js";import{t as De,s as Ie}from"../chunks/yrnW4538.js";import{j as G,k as ke,l as X,s as Fe}from"../chunks/XNcr-WfO.js";import{b as Re}from"../chunks/CpcDbWW7.js";import{q as k,C as ee,aQ as Ae,a0 as ie,c as We,d as H,f as se,b as Se,H as te,ao as ze,bm as Ee,h as ne,N as oe,bn as $e,aq as Ge,bo as He}from"../chunks/CRJLgPfV.js";import{O as Ne}from"../chunks/BxRSvoRg.js";import{T as Ue}from"../chunks/Bmmcz0BX.js";import{g as je}from"../chunks/cOOE7ycz.js";import{G as Be,I as Ve,F as Le}from"../chunks/CdgM0zQD.js";import{c as Oe}from"../chunks/BkqTNOh8.js";const qe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,Ye=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Ke=""+new URL("../assets/terrainrgb.BPhhet7p.webp",import.meta.url).href,Qe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
uniform float fadeProgress;
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
    float reveal = smoothstep(0.0, 1.0, fadeProgress);
    float finalAlpha = fog_alpha * reveal;
    vec3 finalColor = slopeColor * mix(0.7, 1.0, reveal);

    gl_FragColor = vec4(finalColor, finalAlpha) * intensity;

}
`,Ze=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,ae=g=>Math.pow(2,Math.ceil(Math.log2(g))),Je=(g="morivis",o=1280,r="#ffffff",d="Arial, sans-serif")=>{const s=document.createElement("canvas"),e=s.getContext("2d");if(!e)throw new Error("Failed to get canvas context");e.font=`${o}px ${d}`,e.textAlign="left",e.textBaseline="top";const C=e.measureText(g),v=Math.ceil(C.width)+20,a=o+20,t=ae(v),l=ae(a);return s.width=t,s.height=l,e.clearRect(0,0,t,l),e.font=`${o}px ${d}`,e.textAlign="left",e.textBaseline="top",e.fillStyle=r,e.fillText(g,10,10),e.getImageData(0,0,s.width,s.height),s},D={time:{value:0},fadeProgress:{value:0},uColor:{value:new ee("rgb(252, 252, 252)")},uColor2:{value:new ee("rgb(0, 194, 36)")},resolution:{value:new k(window.innerWidth,window.innerHeight)}},N={screenCenter:{value:new k(.5,.5)},resolution:{value:new k(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new Ae(Je())},uTextureResolution:{value:new k(1e3,750)}},Xe=new ie({uniforms:D,vertexShader:Ze,fragmentShader:Qe,transparent:!0}),et=async(g,o=.1)=>{const r=new Image;r.src=g,await new Promise((a,t)=>{r.onload=a,r.onerror=t});const d=document.createElement("canvas");d.width=r.width,d.height=r.height;const s=d.getContext("2d");if(!s)throw new Error("Failed to get canvas context");s.drawImage(r,0,0);const e=s.getImageData(0,0,d.width,d.height).data,C=e.length/4|0,v=new Float32Array(C);for(let a=0,t=0;a<e.length;a+=4,t++){const l=e[a],n=e[a+1],u=e[a+2],P=(-1e4+(l*256*256+n*256+u)*.1)*o;v[t]=P}return{width:d.width,height:d.height,data:v}},tt=async()=>{const{data:g,width:o,height:r}=await et(Ke,.15),d=1,s=1,e=new We,C=o*d/2,v=r*s/2,a=new Float32Array(o*r*3);for(let c=0;c<r;c++)for(let i=0;i<o;i++){const h=c*o+i,w=i*d-C,b=g[h],p=c*s-v,I=h*3;a[I]=w,a[I+1]=b,a[I+2]=p}e.setAttribute("position",new H(a,3));const t=new Float32Array(o*r*2);for(let c=0;c<r;c++)for(let i=0;i<o;i++){const h=c*o+i,w=i/(o-1),b=c/(r-1),p=h*2;t[p]=w,t[p+1]=b}e.setAttribute("uv",new H(t,2));const l=(o-1)*(r-1),n=new Uint32Array(l*6);let u=0;for(let c=0;c<r-1;c++)for(let i=0;i<o-1;i++){const h=c*o+i,w=h+o,b=h+1,p=w+1;n[u++]=h,n[u++]=w,n[u++]=b,n[u++]=w,n[u++]=p,n[u++]=b}e.setIndex(new H(n,1));const P=new se(e,Xe);P.name="dem",e.computeVertexNormals();const x=new Se().makeRotationY(Math.PI/-2);return e.applyMatrix4(x),P};var nt=re("<button>マップを見る</button>"),ot=re('<div class="fixed h-dvh w-full bg-gray-900"><canvas class="absolute m-0 block h-full w-full overflow-hidden bg-gray-900 p-0"></canvas> <div class="pointer-events-none absolute top-0 left-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow font-bold text-white max-lg:text-[75px] lg:text-[100px] svelte-1uha8ag">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center px-8 opacity-90 max-lg:justify-center lg:justify-between"><div class="flex gap-3 max-lg:hidden"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white max-lg:hidden"><span class="underline select-none">利用規約</span></button></div></div>');function gt(g,o){be(o,!0);const r=()=>$(X,"$showInfoDialog",e),d=()=>$(G,"$showTermsDialog",e),s=()=>$(ke,"$isBlocked",e),[e,C]=Ce();let v=Z(null),a,t,l,n,u,P=Z(!0),x,c,i,h=null;const w=1.6,b=()=>{J(P,!1),je("/morivis/map")},p=()=>{const f=window.innerWidth,m=window.innerHeight;D.resolution.value.set(f,m),l.setPixelRatio(window.devicePixelRatio),l.setSize(f,m),t.aspect=f/m,t.updateProjectionMatrix(),N.resolution.value.set(f,m),x&&(x.setSize(f,m),i.material.uniforms.resolution.value.set(f,m))};ye(async()=>{if(!_(v)||!_(v))return;const f={width:window.innerWidth,height:window.innerHeight};a=new te,t=new ze(75,window.innerWidth/window.innerHeight,.1,1e5);const V=-170*Math.PI/180,L=180;t.position.x=L*Math.sin(V),t.position.z=L*Math.cos(V),t.position.y=90,a.add(t),c=new te;const he=_(v).getContext("webgl2");n=new Ne(t,_(v)),n.enableDamping=!0,n.enablePan=!1,n.enableZoom=!1,n.autoRotateSpeed=.5,n.autoRotate=!0,n.minDistance=100,n.maxDistance=500,n.maxPolarAngle=Math.PI/2-.35,u=new Ue(t,_(v)),u.noPan=!0,u.noRotate=!0,u.zoomSpeed=.2,x=new Ee(f.width,f.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:oe,minFilter:oe,wrapS:ne,wrapT:ne}),N.screenTexture.value=x.texture;const ge=new $e(2,2),pe=new ie({fragmentShader:qe,vertexShader:Ye,uniforms:N});i=new se(ge,pe),c.add(i),l=new Ge({canvas:_(v),context:he,alpha:!0}),l.setSize(window.innerWidth,window.innerHeight),l.setPixelRatio(Math.min(window.devicePixelRatio,2));const O=new He,q=await tt();q?(h=O.getElapsedTime(),D.fadeProgress.value=0,a.add(q)):console.error("Failed to create DEM mesh");const Y=()=>{requestAnimationFrame(Y),n.update(),u.update();const K=O.getElapsedTime();if(D.time.value=K,h===null)D.fadeProgress.value=0;else{const we=K-h;D.fadeProgress.value=Math.min(Math.max(we/w,0),1)}l.setRenderTarget(x),l.render(a,t),l.setRenderTarget(null),l.render(c,t),i.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};Y(),window.addEventListener("resize",p),p(),Oe()||G.set(!0)}),_e(()=>{n.dispose(),u.dispose(),a.clear(),l.dispose(),x.dispose(),i.geometry.dispose(),window.removeEventListener("resize",p)});const I=()=>{X.set(!r())},le=()=>{G.set(!d())};var F=ot(),U=y(F);Re(U,f=>J(v,f),()=>_(v));var R=T(U,2),j=y(R),ce=T(y(j),2);{var de=f=>{var m=nt();Pe(()=>{Fe(m,1,`bg-base text-main lg:hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 transition-all duration-200 max-lg:text-lg lg:text-2xl lg:hover:text-white ${s()?"pointer-events-none":"pointer-events-auto"}`),m.disabled=s()}),E("click",m,b),De(3,m,()=>Ie,()=>({duration:300,axis:"y"})),Q(f,m)};Te(ce,f=>{!s()&&_(P)&&f(de)})}M(j),M(R);var B=T(R,2),A=y(B),W=y(A),ve=y(W);Be(ve,{class:"h-8 w-8"}),M(W);var S=T(W,2),ue=y(S);Ve(ue,{class:"h-7 w-7"}),M(S),M(A);var z=T(A,2),fe=y(z);Le(fe,{width:"230"}),M(z);var me=T(z,2);M(B),M(F),E("click",S,I),E("click",me,le),Q(g,F),Me(),C()}xe(["click"]);export{gt as component};
