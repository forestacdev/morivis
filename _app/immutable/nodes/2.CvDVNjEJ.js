import"../chunks/CWj6FrbW.js";import{o as Rt,a as It}from"../chunks/BfBzq5JU.js";import{F as Zt,p as Ut,f as Et,J as V,a as lt,b as Ft,aL as Wt,I as P,M as pt,c as M,K as dt,L as D,aK as B,r as C,t as Ht}from"../chunks/DBPMsHJQ.js";import{i as Yt}from"../chunks/BGVL8sqF.js";import{I as mt,c as X,i as Vt,s as ut,t as Bt,g as Xt}from"../chunks/Y2qR_rWr.js";import{C as Kt,M as A,V as w,a as g,Q as $t,b as _t,i as ft,a7 as Gt,az as Pt,B as qt,k as K,e as Mt,g as Qt,t as gt,u as Jt,aA as te,m as vt,N as wt,aB as ee,W as oe,aC as ie,J as ne}from"../chunks/zhCwisl_.js";import{b as se}from"../chunks/m5cDl-i-.js";import{O as ae}from"../chunks/BfusecmV.js";import{g as re}from"../chunks/CdPBIpBk.js";import{F as he}from"../chunks/BaP2j6jl.js";import{c as ce}from"../chunks/BkqTNOh8.js";const $={type:"change"},J={type:"start"},tt={type:"end"},yt=1e-6,n={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},N=new g,T=new g,le=new w,L=new w,G=new w,k=new $t,bt=new w,R=new w,q=new w,I=new w;class pe extends Kt{constructor(t,o=null){super(t,o),this.enabled=!0,this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:A.ROTATE,MIDDLE:A.DOLLY,RIGHT:A.PAN},this.state=n.NONE,this.keyState=n.NONE,this.target=new w,this._lastPosition=new w,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new w,this._movePrev=new g,this._moveCurr=new g,this._lastAxis=new w,this._zoomStart=new g,this._zoomEnd=new g,this._panStart=new g,this._panEnd=new g,this._pointers=[],this._pointerPositions={},this._onPointerMove=me.bind(this),this._onPointerDown=de.bind(this),this._onPointerUp=ue.bind(this),this._onPointerCancel=_e.bind(this),this._onContextMenu=xe.bind(this),this._onMouseWheel=be.bind(this),this._onKeyDown=ge.bind(this),this._onKeyUp=fe.bind(this),this._onTouchStart=Ee.bind(this),this._onTouchMove=Pe.bind(this),this._onTouchEnd=Me.bind(this),this._onMouseDown=ve.bind(this),this._onMouseMove=we.bind(this),this._onMouseUp=ye.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,o!==null&&(this.connect(),this.handleResize()),this.update()}connect(){window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){const t=this.domElement.getBoundingClientRect(),o=this.domElement.ownerDocument.documentElement;this.screen.left=t.left+window.pageXOffset-o.clientLeft,this.screen.top=t.top+window.pageYOffset-o.clientTop,this.screen.width=t.width,this.screen.height=t.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>yt&&(this.dispatchEvent($),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>yt||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent($),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=n.NONE,this.keyState=n.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent($),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(T.copy(this._panEnd).sub(this._panStart),T.lengthSq()){if(this.object.isOrthographicCamera){const t=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,o=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;T.x*=t,T.y*=o}T.multiplyScalar(this._eye.length()*this.panSpeed),L.copy(this._eye).cross(this.object.up).setLength(T.x),L.add(le.copy(this.object.up).setLength(T.y)),this.object.position.add(L),this.target.add(L),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(T.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){I.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let t=I.length();t?(this._eye.copy(this.object.position).sub(this.target),bt.copy(this._eye).normalize(),R.copy(this.object.up).normalize(),q.crossVectors(R,bt).normalize(),R.setLength(this._moveCurr.y-this._movePrev.y),q.setLength(this._moveCurr.x-this._movePrev.x),I.copy(R.add(q)),G.crossVectors(I,this._eye).normalize(),t*=this.rotateSpeed,k.setFromAxisAngle(G,t),this._eye.applyQuaternion(k),this.object.up.applyQuaternion(k),this._lastAxis.copy(G),this._lastAngle=t):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),k.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(k),this.object.up.applyQuaternion(k)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let t;this.state===n.TOUCH_ZOOM_PAN?(t=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=_t.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(t=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,t!==1&&t>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=_t.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(t,o){return N.set((t-this.screen.left)/this.screen.width,(o-this.screen.top)/this.screen.height),N}_getMouseOnCircle(t,o){return N.set((t-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-o))/this.screen.width),N}_addPointer(t){this._pointers.push(t)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let o=0;o<this._pointers.length;o++)if(this._pointers[o].pointerId==t.pointerId){this._pointers.splice(o,1);return}}_trackPointer(t){let o=this._pointerPositions[t.pointerId];o===void 0&&(o=new g,this._pointerPositions[t.pointerId]=o),o.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const o=t.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[o.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}}function de(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e))}function me(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function ue(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchEnd(e):this._onMouseUp(),this._removePointer(e),this._pointers.length===0&&(this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function _e(e){this._removePointer(e)}function fe(){this.enabled!==!1&&(this.keyState=n.NONE,window.addEventListener("keydown",this._onKeyDown))}function ge(e){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===n.NONE&&(e.code===this.keys[n.ROTATE]&&!this.noRotate?this.keyState=n.ROTATE:e.code===this.keys[n.ZOOM]&&!this.noZoom?this.keyState=n.ZOOM:e.code===this.keys[n.PAN]&&!this.noPan&&(this.keyState=n.PAN)))}function ve(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case A.DOLLY:this.state=n.ZOOM;break;case A.ROTATE:this.state=n.ROTATE;break;case A.PAN:this.state=n.PAN;break;default:this.state=n.NONE}const o=this.keyState!==n.NONE?this.keyState:this.state;o===n.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr)):o===n.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._zoomEnd.copy(this._zoomStart)):o===n.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(J)}function we(e){const t=this.keyState!==n.NONE?this.keyState:this.state;t===n.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY))):t===n.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY)):t===n.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY))}function ye(){this.state=n.NONE,this.dispatchEvent(tt)}function be(e){if(this.enabled!==!1&&this.noZoom!==!0){switch(e.preventDefault(),e.deltaMode){case 2:this._zoomStart.y-=e.deltaY*.025;break;case 1:this._zoomStart.y-=e.deltaY*.01;break;default:this._zoomStart.y-=e.deltaY*25e-5;break}this.dispatchEvent(J),this.dispatchEvent(tt)}}function xe(e){this.enabled!==!1&&e.preventDefault()}function Ee(e){switch(this._trackPointer(e),this._pointers.length){case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);break;default:this.state=n.TOUCH_ZOOM_PAN;const t=this._pointers[0].pageX-this._pointers[1].pageX,o=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(t*t+o*o);const h=(this._pointers[0].pageX+this._pointers[1].pageX)/2,a=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(h,a)),this._panEnd.copy(this._panStart);break}this.dispatchEvent(J)}function Pe(e){switch(this._trackPointer(e),this._pointers.length){case 1:this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY));break;default:const t=this._getSecondPointerPosition(e),o=e.pageX-t.x,h=e.pageY-t.y;this._touchZoomDistanceEnd=Math.sqrt(o*o+h*h);const a=(e.pageX+t.x)/2,i=(e.pageY+t.y)/2;this._panEnd.copy(this._getMouseOnScreen(a,i));break}}function Me(e){switch(this._pointers.length){case 0:this.state=n.NONE;break;case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=n.TOUCH_ZOOM_PAN;for(let t=0;t<this._pointers.length;t++)if(this._pointers[t].pointerId!==e.pointerId){const o=this._pointerPositions[this._pointers[t].pointerId];this._moveCurr.copy(this._getMouseOnCircle(o.x,o.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(tt)}const Ce=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,Te=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Se=""+new URL("../assets/terrainrgb.BPhhet7p.webp",import.meta.url).href,Oe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
`,De=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,xt=e=>Math.pow(2,Math.ceil(Math.log2(e))),ke=(e="morivis",t=1280,o="#ffffff",h="Arial, sans-serif")=>{const a=document.createElement("canvas"),i=a.getContext("2d");if(!i)throw new Error("Failed to get canvas context");i.font=`${t}px ${h}`,i.textAlign="left",i.textBaseline="top";const S=i.measureText(e),m=Math.ceil(S.width)+20,c=t+20,s=xt(m),p=xt(c);return a.width=s,a.height=p,i.clearRect(0,0,s,p),i.font=`${t}px ${h}`,i.textAlign="left",i.textBaseline="top",i.fillStyle=o,i.fillText(e,10,10),i.getImageData(0,0,a.width,a.height),a},j={time:{value:0},fadeProgress:{value:0},uColor:{value:new ft("rgb(252, 252, 252)")},uColor2:{value:new ft("rgb(0, 194, 36)")},resolution:{value:new g(window.innerWidth,window.innerHeight)}},Q={screenCenter:{value:new g(.5,.5)},resolution:{value:new g(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new Gt(ke())},uTextureResolution:{value:new g(1e3,750)}},je=new Pt({uniforms:j,vertexShader:De,fragmentShader:Oe,transparent:!0}),Ae=async(e,t=.1)=>{const o=new Image;o.src=e,await new Promise((c,s)=>{o.onload=c,o.onerror=s});const h=document.createElement("canvas");h.width=o.width,h.height=o.height;const a=h.getContext("2d");if(!a)throw new Error("Failed to get canvas context");a.drawImage(o,0,0);const i=a.getImageData(0,0,h.width,h.height).data,S=i.length/4|0,m=new Float32Array(S);for(let c=0,s=0;c<i.length;c+=4,s++){const p=i[c],r=i[c+1],u=i[c+2],O=(-1e4+(p*256*256+r*256+u)*.1)*t;m[s]=O}return{width:h.width,height:h.height,data:m}},ze=async()=>{const{data:e,width:t,height:o}=await Ae(Se,.15),h=1,a=1,i=new qt,S=t*h/2,m=o*a/2,c=new Float32Array(t*o*3);for(let d=0;d<o;d++)for(let l=0;l<t;l++){const v=d*t+l,b=l*h-S,E=e[v],y=d*a-m,z=v*3;c[z]=b,c[z+1]=E,c[z+2]=y}i.setAttribute("position",new K(c,3));const s=new Float32Array(t*o*2);for(let d=0;d<o;d++)for(let l=0;l<t;l++){const v=d*t+l,b=l/(t-1),E=d/(o-1),y=v*2;s[y]=b,s[y+1]=E}i.setAttribute("uv",new K(s,2));const p=(t-1)*(o-1),r=new Uint32Array(p*6);let u=0;for(let d=0;d<o-1;d++)for(let l=0;l<t-1;l++){const v=d*t+l,b=v+t,E=v+1,y=b+1;r[u++]=v,r[u++]=b,r[u++]=E,r[u++]=b,r[u++]=y,r[u++]=E}i.setIndex(new K(r,1));const O=new Mt(i,je);O.name="dem",i.computeVertexNormals();const x=new Qt().makeRotationY(Math.PI/-2);return i.applyMatrix4(x),O};var Ne=Et("<button>マップを見る</button>"),Le=Et('<div class="fixed h-dvh w-full bg-gray-900"><canvas class="absolute m-0 block h-full w-full overflow-hidden bg-gray-900 p-0"></canvas> <div class="pointer-events-none absolute top-0 left-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow font-bold text-white max-lg:text-[75px] lg:text-[100px] svelte-1uha8ag">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center px-8 opacity-90 max-lg:justify-center lg:justify-between"><div class="flex gap-3 max-lg:hidden"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white max-lg:hidden"><span class="underline select-none">利用規約</span></button></div></div>');function Ke(e,t){Ut(t,!0);const o=()=>B(ut,"$showInfoDialog",i),h=()=>B(X,"$showTermsDialog",i),a=()=>B(Vt,"$isBlocked",i),[i,S]=Wt();let m=pt(null),c,s,p,r,u,O=pt(!0),x,d,l,v=null;const b=1.6,E=()=>{dt(O,!1),re("/morivis/map")},y=()=>{const _=window.innerWidth,f=window.innerHeight;j.resolution.value.set(_,f),p.setPixelRatio(window.devicePixelRatio),p.setSize(_,f),s.aspect=_/f,s.updateProjectionMatrix(),Q.resolution.value.set(_,f),x&&(x.setSize(_,f),l.material.uniforms.resolution.value.set(_,f))};Rt(async()=>{if(!P(m)||!P(m))return;const _={width:window.innerWidth,height:window.innerHeight};c=new gt,s=new Jt(75,window.innerWidth/window.innerHeight,.1,1e5);const nt=-170*Math.PI/180,st=180;s.position.x=st*Math.sin(nt),s.position.z=st*Math.cos(nt),s.position.y=90,c.add(s),d=new gt;const At=P(m).getContext("webgl2");r=new ae(s,P(m)),r.enableDamping=!0,r.enablePan=!1,r.enableZoom=!1,r.autoRotateSpeed=.5,r.autoRotate=!0,r.minDistance=100,r.maxDistance=500,r.maxPolarAngle=Math.PI/2-.35,u=new pe(s,P(m)),u.noPan=!0,u.noRotate=!0,u.zoomSpeed=.2,x=new te(_.width,_.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:wt,minFilter:wt,wrapS:vt,wrapT:vt}),Q.screenTexture.value=x.texture;const zt=new ee(2,2),Nt=new Pt({fragmentShader:Ce,vertexShader:Te,uniforms:Q});l=new Mt(zt,Nt),d.add(l),p=new oe({canvas:P(m),context:At,alpha:!0}),p.setSize(window.innerWidth,window.innerHeight),p.setPixelRatio(Math.min(window.devicePixelRatio,2));const at=new ie,rt=await ze();rt?(v=at.getElapsedTime(),j.fadeProgress.value=0,c.add(rt)):console.error("Failed to create DEM mesh");const ht=()=>{requestAnimationFrame(ht),r.update(),u.update();const ct=at.getElapsedTime();if(j.time.value=ct,v===null)j.fadeProgress.value=0;else{const Lt=ct-v;j.fadeProgress.value=Math.min(Math.max(Lt/b,0),1)}p.setRenderTarget(x),p.render(c,s),p.setRenderTarget(null),p.render(d,s),l.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};ht(),window.addEventListener("resize",y),y(),ce()||X.set(!0)}),It(()=>{r.dispose(),u.dispose(),c.clear(),p.dispose(),x.dispose(),l.geometry.dispose(),window.removeEventListener("resize",y)});const z=()=>{ut.set(!o())},Ct=()=>{X.set(!h())};var Z=Le(),et=M(Z);se(et,_=>dt(m,_),()=>P(m));var U=D(et,2),ot=M(U),Tt=D(M(ot),2);{var St=_=>{var f=Ne();Ht(()=>{ne(f,1,`bg-base text-main lg:hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 transition-all duration-200 max-lg:text-lg lg:text-2xl lg:hover:text-white ${a()?"pointer-events-none":"pointer-events-auto"}`),f.disabled=a()}),V("click",f,E),Bt(3,f,()=>Xt,()=>({duration:300,axis:"y"})),lt(_,f)};Yt(Tt,_=>{!a()&&P(O)&&_(St)})}C(ot),C(U);var it=D(U,2),F=M(it),W=M(F),Ot=M(W);mt(Ot,{icon:"mdi:github",class:"h-8 w-8"}),C(W);var H=D(W,2),Dt=M(H);mt(Dt,{icon:"akar-icons:info-fill",class:"h-7 w-7"}),C(H),C(F);var Y=D(F,2),kt=M(Y);he(kt,{width:"230"}),C(Y);var jt=D(Y,2);C(it),C(Z),V("click",H,z),V("click",jt,Ct),lt(e,Z),Ft(),S()}Zt(["click"]);export{Ke as component};
