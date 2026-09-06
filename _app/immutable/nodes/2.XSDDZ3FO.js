import"../chunks/CWj6FrbW.js";import{o as be,a as ye}from"../chunks/CRutiIVY.js";import{A as _e,p as Me,f as ie,I as E,a as Y,b as Ce,aJ as Pe,G as y,L as Q,c as _,J as Z,K as T,aK as $,r as M,t as Te}from"../chunks/_gOzsIRb.js";import{i as De}from"../chunks/Bgj25zAs.js";import{I as X,s as B,i as ke,a as ee,t as Ie,b as Fe}from"../chunks/CU_2qC8X.js";import{a as I,i as te,ay as Re,y as se,B as Ae,k as G,e as le,g as We,ac as ne,ad as Se,aO as ze,m as oe,N as ae,aP as Ee,ab as $e,aQ as Be,am as Ge}from"../chunks/Bk-zkpno.js";import{b as He}from"../chunks/0cRt42ix.js";import{O as Ne}from"../chunks/BydQLQTJ.js";import{F as Ue,T as je}from"../chunks/BHu4HrVq.js";import{g as Le}from"../chunks/yO7Ikb9z.js";import{c as Ve}from"../chunks/BkqTNOh8.js";const Oe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,qe=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Je=""+new URL("../assets/terrainrgb.BPhhet7p.webp",import.meta.url).href,Ke=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
`,Ye=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,re=g=>Math.pow(2,Math.ceil(Math.log2(g))),Qe=(g="morivis",o=1280,r="#ffffff",d="Arial, sans-serif")=>{const s=document.createElement("canvas"),e=s.getContext("2d");if(!e)throw new Error("Failed to get canvas context");e.font=`${o}px ${d}`,e.textAlign="left",e.textBaseline="top";const C=e.measureText(g),v=Math.ceil(C.width)+20,a=o+20,t=re(v),l=re(a);return s.width=t,s.height=l,e.clearRect(0,0,t,l),e.font=`${o}px ${d}`,e.textAlign="left",e.textBaseline="top",e.fillStyle=r,e.fillText(g,10,10),e.getImageData(0,0,s.width,s.height),s},D={time:{value:0},fadeProgress:{value:0},uColor:{value:new te("rgb(252, 252, 252)")},uColor2:{value:new te("rgb(0, 194, 36)")},resolution:{value:new I(window.innerWidth,window.innerHeight)}},H={screenCenter:{value:new I(.5,.5)},resolution:{value:new I(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new Re(Qe())},uTextureResolution:{value:new I(1e3,750)}},Ze=new se({uniforms:D,vertexShader:Ye,fragmentShader:Ke,transparent:!0}),Xe=async(g,o=.1)=>{const r=new Image;r.src=g,await new Promise((a,t)=>{r.onload=a,r.onerror=t});const d=document.createElement("canvas");d.width=r.width,d.height=r.height;const s=d.getContext("2d");if(!s)throw new Error("Failed to get canvas context");s.drawImage(r,0,0);const e=s.getImageData(0,0,d.width,d.height).data,C=e.length/4|0,v=new Float32Array(C);for(let a=0,t=0;a<e.length;a+=4,t++){const l=e[a],n=e[a+1],u=e[a+2],P=(-1e4+(l*256*256+n*256+u)*.1)*o;v[t]=P}return{width:d.width,height:d.height,data:v}},et=async()=>{const{data:g,width:o,height:r}=await Xe(Je,.15),d=1,s=1,e=new Ae,C=o*d/2,v=r*s/2,a=new Float32Array(o*r*3);for(let c=0;c<r;c++)for(let i=0;i<o;i++){const h=c*o+i,w=i*d-C,b=g[h],p=c*s-v,k=h*3;a[k]=w,a[k+1]=b,a[k+2]=p}e.setAttribute("position",new G(a,3));const t=new Float32Array(o*r*2);for(let c=0;c<r;c++)for(let i=0;i<o;i++){const h=c*o+i,w=i/(o-1),b=c/(r-1),p=h*2;t[p]=w,t[p+1]=b}e.setAttribute("uv",new G(t,2));const l=(o-1)*(r-1),n=new Uint32Array(l*6);let u=0;for(let c=0;c<r-1;c++)for(let i=0;i<o-1;i++){const h=c*o+i,w=h+o,b=h+1,p=w+1;n[u++]=h,n[u++]=w,n[u++]=b,n[u++]=w,n[u++]=p,n[u++]=b}e.setIndex(new G(n,1));const P=new le(e,Ze);P.name="dem",e.computeVertexNormals();const x=new We().makeRotationY(Math.PI/-2);return e.applyMatrix4(x),P};var tt=ie("<button>マップを見る</button>"),nt=ie('<div class="fixed h-dvh w-full bg-gray-900"><canvas class="absolute m-0 block h-full w-full overflow-hidden bg-gray-900 p-0"></canvas> <div class="pointer-events-none absolute top-0 left-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow font-bold text-white max-lg:text-[75px] lg:text-[100px] svelte-1uha8ag">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center px-8 opacity-90 max-lg:justify-center lg:justify-between"><div class="flex gap-3 max-lg:hidden"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white max-lg:hidden"><span class="underline select-none">利用規約</span></button></div></div>');function mt(g,o){Me(o,!0);const r=()=>$(ee,"$showInfoDialog",e),d=()=>$(B,"$showTermsDialog",e),s=()=>$(ke,"$isBlocked",e),[e,C]=Pe();let v=Q(null),a,t,l,n,u,P=Q(!0),x,c,i,h=null;const w=1.6,b=()=>{Z(P,!1),Le("/morivis/map")},p=()=>{const f=window.innerWidth,m=window.innerHeight;D.resolution.value.set(f,m),l.setPixelRatio(window.devicePixelRatio),l.setSize(f,m),t.aspect=f/m,t.updateProjectionMatrix(),H.resolution.value.set(f,m),x&&(x.setSize(f,m),i.material.uniforms.resolution.value.set(f,m))};be(async()=>{if(!y(v)||!y(v))return;const f={width:window.innerWidth,height:window.innerHeight};a=new ne,t=new Se(75,window.innerWidth/window.innerHeight,.1,1e5);const L=-170*Math.PI/180,V=180;t.position.x=V*Math.sin(L),t.position.z=V*Math.cos(L),t.position.y=90,a.add(t),c=new ne;const ge=y(v).getContext("webgl2");n=new Ne(t,y(v)),n.enableDamping=!0,n.enablePan=!1,n.enableZoom=!1,n.autoRotateSpeed=.5,n.autoRotate=!0,n.minDistance=100,n.maxDistance=500,n.maxPolarAngle=Math.PI/2-.35,u=new je(t,y(v)),u.noPan=!0,u.noRotate=!0,u.zoomSpeed=.2,x=new ze(f.width,f.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:ae,minFilter:ae,wrapS:oe,wrapT:oe}),H.screenTexture.value=x.texture;const pe=new Ee(2,2),we=new se({fragmentShader:Oe,vertexShader:qe,uniforms:H});i=new le(pe,we),c.add(i),l=new $e({canvas:y(v),context:ge,alpha:!0}),l.setSize(window.innerWidth,window.innerHeight),l.setPixelRatio(Math.min(window.devicePixelRatio,2));const O=new Be,q=await et();q?(h=O.getElapsedTime(),D.fadeProgress.value=0,a.add(q)):console.error("Failed to create DEM mesh");const J=()=>{requestAnimationFrame(J),n.update(),u.update();const K=O.getElapsedTime();if(D.time.value=K,h===null)D.fadeProgress.value=0;else{const xe=K-h;D.fadeProgress.value=Math.min(Math.max(xe/w,0),1)}l.setRenderTarget(x),l.render(a,t),l.setRenderTarget(null),l.render(c,t),i.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};J(),window.addEventListener("resize",p),p(),Ve()||B.set(!0)}),ye(()=>{n.dispose(),u.dispose(),a.clear(),l.dispose(),x.dispose(),i.geometry.dispose(),window.removeEventListener("resize",p)});const k=()=>{ee.set(!r())},ce=()=>{B.set(!d())};var F=nt(),N=_(F);He(N,f=>Z(v,f),()=>y(v));var R=T(N,2),U=_(R),de=T(_(U),2);{var ve=f=>{var m=tt();Te(()=>{Ge(m,1,`bg-base text-main lg:hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 transition-all duration-200 max-lg:text-lg lg:text-2xl lg:hover:text-white ${s()?"pointer-events-none":"pointer-events-auto"}`),m.disabled=s()}),E("click",m,b),Ie(3,m,()=>Fe,()=>({duration:300,axis:"y"})),Y(f,m)};De(de,f=>{!s()&&y(P)&&f(ve)})}M(U),M(R);var j=T(R,2),A=_(j),W=_(A),ue=_(W);X(ue,{icon:"mdi:github",class:"h-8 w-8"}),M(W);var S=T(W,2),fe=_(S);X(fe,{icon:"akar-icons:info-fill",class:"h-7 w-7"}),M(S),M(A);var z=T(A,2),me=_(z);Ue(me,{width:"230"}),M(z);var he=T(z,2);M(j),M(F),E("click",S,k),E("click",he,ce),Y(g,F),Ce(),C()}_e(["click"]);export{mt as component};
