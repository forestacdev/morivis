import{d as Dt,t as gt,a as st}from"../chunks/D0t-KpC4.js";import{p as jt,a2 as zt,a8 as At,a6 as D,a as Nt,c as M,n as C,a3 as at,I as vt,r as T,t as Rt}from"../chunks/BSdiOwP2.js";import{b as Lt,i as It,s as Zt,a as H}from"../chunks/BLZvhTbo.js";import{I as rt,a as ht,b as Y,i as Ut,c as Ft,t as Wt,d as Ht}from"../chunks/DXwcHgFi.js";import{C as Yt,M as z,V as y,a as g,Q as Vt,b as ct,c as lt,d as Xt,S as wt,B as Bt,e as V,f as yt,g as $t,F as Gt,h as pt,P as Kt,O as qt,W as Qt,i as dt,N as mt,j as Jt,k as te,l as ee}from"../chunks/CJBc1Kaz.js";import{g as oe}from"../chunks/DDVb75pj.js";import{c as ie}from"../chunks/BOVylflK.js";const X={type:"change"},q={type:"start"},Q={type:"end"},ut=1e-6,n={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},A=new g,S=new g,ne=new y,N=new y,B=new y,j=new Vt,_t=new y,R=new y,$=new y,L=new y;class se extends Yt{constructor(t,o=null){super(t,o),this.enabled=!0,this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:z.ROTATE,MIDDLE:z.DOLLY,RIGHT:z.PAN},this.state=n.NONE,this.keyState=n.NONE,this.target=new y,this._lastPosition=new y,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new y,this._movePrev=new g,this._moveCurr=new g,this._lastAxis=new y,this._zoomStart=new g,this._zoomEnd=new g,this._panStart=new g,this._panEnd=new g,this._pointers=[],this._pointerPositions={},this._onPointerMove=re.bind(this),this._onPointerDown=ae.bind(this),this._onPointerUp=he.bind(this),this._onPointerCancel=ce.bind(this),this._onContextMenu=fe.bind(this),this._onMouseWheel=_e.bind(this),this._onKeyDown=pe.bind(this),this._onKeyUp=le.bind(this),this._onTouchStart=ge.bind(this),this._onTouchMove=ve.bind(this),this._onTouchEnd=we.bind(this),this._onMouseDown=de.bind(this),this._onMouseMove=me.bind(this),this._onMouseUp=ue.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,o!==null&&(this.connect(),this.handleResize()),this.update()}connect(){window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){const t=this.domElement.getBoundingClientRect(),o=this.domElement.ownerDocument.documentElement;this.screen.left=t.left+window.pageXOffset-o.clientLeft,this.screen.top=t.top+window.pageYOffset-o.clientTop,this.screen.width=t.width,this.screen.height=t.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>ut&&(this.dispatchEvent(X),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>ut||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(X),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=n.NONE,this.keyState=n.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(X),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(S.copy(this._panEnd).sub(this._panStart),S.lengthSq()){if(this.object.isOrthographicCamera){const t=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,o=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;S.x*=t,S.y*=o}S.multiplyScalar(this._eye.length()*this.panSpeed),N.copy(this._eye).cross(this.object.up).setLength(S.x),N.add(ne.copy(this.object.up).setLength(S.y)),this.object.position.add(N),this.target.add(N),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(S.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){L.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let t=L.length();t?(this._eye.copy(this.object.position).sub(this.target),_t.copy(this._eye).normalize(),R.copy(this.object.up).normalize(),$.crossVectors(R,_t).normalize(),R.setLength(this._moveCurr.y-this._movePrev.y),$.setLength(this._moveCurr.x-this._movePrev.x),L.copy(R.add($)),B.crossVectors(L,this._eye).normalize(),t*=this.rotateSpeed,j.setFromAxisAngle(B,t),this._eye.applyQuaternion(j),this.object.up.applyQuaternion(j),this._lastAxis.copy(B),this._lastAngle=t):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),j.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(j),this.object.up.applyQuaternion(j)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let t;this.state===n.TOUCH_ZOOM_PAN?(t=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=ct.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(t=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,t!==1&&t>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=ct.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(t,o){return A.set((t-this.screen.left)/this.screen.width,(o-this.screen.top)/this.screen.height),A}_getMouseOnCircle(t,o){return A.set((t-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-o))/this.screen.width),A}_addPointer(t){this._pointers.push(t)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let o=0;o<this._pointers.length;o++)if(this._pointers[o].pointerId==t.pointerId){this._pointers.splice(o,1);return}}_trackPointer(t){let o=this._pointerPositions[t.pointerId];o===void 0&&(o=new g,this._pointerPositions[t.pointerId]=o),o.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const o=t.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[o.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}}function ae(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e))}function re(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function he(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchEnd(e):this._onMouseUp(),this._removePointer(e),this._pointers.length===0&&(this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function ce(e){this._removePointer(e)}function le(){this.enabled!==!1&&(this.keyState=n.NONE,window.addEventListener("keydown",this._onKeyDown))}function pe(e){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===n.NONE&&(e.code===this.keys[n.ROTATE]&&!this.noRotate?this.keyState=n.ROTATE:e.code===this.keys[n.ZOOM]&&!this.noZoom?this.keyState=n.ZOOM:e.code===this.keys[n.PAN]&&!this.noPan&&(this.keyState=n.PAN)))}function de(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case z.DOLLY:this.state=n.ZOOM;break;case z.ROTATE:this.state=n.ROTATE;break;case z.PAN:this.state=n.PAN;break;default:this.state=n.NONE}const o=this.keyState!==n.NONE?this.keyState:this.state;o===n.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr)):o===n.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._zoomEnd.copy(this._zoomStart)):o===n.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(q)}function me(e){const t=this.keyState!==n.NONE?this.keyState:this.state;t===n.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY))):t===n.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY)):t===n.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY))}function ue(){this.state=n.NONE,this.dispatchEvent(Q)}function _e(e){if(this.enabled!==!1&&this.noZoom!==!0){switch(e.preventDefault(),e.deltaMode){case 2:this._zoomStart.y-=e.deltaY*.025;break;case 1:this._zoomStart.y-=e.deltaY*.01;break;default:this._zoomStart.y-=e.deltaY*25e-5;break}this.dispatchEvent(q),this.dispatchEvent(Q)}}function fe(e){this.enabled!==!1&&e.preventDefault()}function ge(e){switch(this._trackPointer(e),this._pointers.length){case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);break;default:this.state=n.TOUCH_ZOOM_PAN;const t=this._pointers[0].pageX-this._pointers[1].pageX,o=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(t*t+o*o);const u=(this._pointers[0].pageX+this._pointers[1].pageX)/2,r=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(u,r)),this._panEnd.copy(this._panStart);break}this.dispatchEvent(q)}function ve(e){switch(this._trackPointer(e),this._pointers.length){case 1:this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY));break;default:const t=this._getSecondPointerPosition(e),o=e.pageX-t.x,u=e.pageY-t.y;this._touchZoomDistanceEnd=Math.sqrt(o*o+u*u);const r=(e.pageX+t.x)/2,i=(e.pageY+t.y)/2;this._panEnd.copy(this._getMouseOnScreen(r,i));break}}function we(e){switch(this._pointers.length){case 0:this.state=n.NONE;break;case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=n.TOUCH_ZOOM_PAN;for(let t=0;t<this._pointers.length;t++)if(this._pointers[t].pointerId!==e.pointerId){const o=this._pointerPositions[this._pointers[t].pointerId];this._moveCurr.copy(this._getMouseOnCircle(o.x,o.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Q)}const ye=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,be=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,xe=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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

}`,Ee=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,ft=e=>Math.pow(2,Math.ceil(Math.log2(e))),Pe=(e="morivis",t=1280,o="#ffffff",u="Arial, sans-serif")=>{const r=document.createElement("canvas"),i=r.getContext("2d");if(!i)throw new Error("Failed to get canvas context");i.font=`${t}px ${u}`,i.textAlign="left",i.textBaseline="top";const w=i.measureText(e),p=Math.ceil(w.width)+20,_=t+20,h=ft(p),a=ft(_);return r.width=h,r.height=a,i.clearRect(0,0,h,a),i.font=`${t}px ${u}`,i.textAlign="left",i.textBaseline="top",i.fillStyle=o,i.fillText(e,10,10),i.getImageData(0,0,r.width,r.height),r},K={time:{value:0},uColor:{value:new lt("rgb(252, 252, 252)")},uColor2:{value:new lt("rgb(0, 194, 36)")},resolution:{value:new g(window.innerWidth,window.innerHeight)}},G={screenCenter:{value:new g(.5,.5)},resolution:{value:new g(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new Xt(Pe())},uTextureResolution:{value:new g(1e3,750)}},Me=new wt({uniforms:K,vertexShader:Ee,fragmentShader:xe,transparent:!0}),Ce=async(e,t=.1)=>{const u=await(await fetch(e)).blob(),r=new Image;r.src=URL.createObjectURL(u),await new Promise((a,s)=>{r.onload=a,r.onerror=s});const i=document.createElement("canvas");i.width=r.width,i.height=r.height;const w=i.getContext("2d");if(!w)throw new Error("Failed to get canvas context");w.drawImage(r,0,0);const p=w.getImageData(0,0,i.width,i.height).data,_=p.length/4|0,h=new Float32Array(_);for(let a=0,s=0;a<p.length;a+=4,s++){const d=p[a],O=p[a+1],b=p[a+2],c=(-1e4+(d*256*256+O*256+b)*.1)*t;h[s]=c}return{width:i.width,height:i.height,data:h}},Te=async()=>{const{data:e,width:t,height:o}=await Ce("./terrainrgb.png",.15),u=1,r=1,i=new Bt,w=t*u/2,p=o*r/2,_=new Float32Array(t*o*3);for(let c=0;c<o;c++)for(let l=0;l<t;l++){const v=c*t+l,E=l*u-w,P=e[v],x=c*r-p,k=v*3;_[k]=E,_[k+1]=P,_[k+2]=x}i.setAttribute("position",new V(_,3));const h=new Float32Array(t*o*2);for(let c=0;c<o;c++)for(let l=0;l<t;l++){const v=c*t+l,E=l/(t-1),P=c/(o-1),x=v*2;h[x]=E,h[x+1]=P}i.setAttribute("uv",new V(h,2));const a=(t-1)*(o-1),s=new Uint32Array(a*6);let d=0;for(let c=0;c<o-1;c++)for(let l=0;l<t-1;l++){const v=c*t+l,E=v+t,P=v+1,x=E+1;s[d++]=v,s[d++]=E,s[d++]=P,s[d++]=E,s[d++]=x,s[d++]=P}i.setIndex(new V(s,1));const O=new yt(i,Me);O.name="dem",i.computeVertexNormals();const b=new $t().makeRotationY(Math.PI/-2);return i.applyMatrix4(b),O},Se=(e,t)=>{vt(t,!1),oe("/morivis/map")};var Oe=gt("<button>マップを見る</button>"),ke=gt('<div class="fixed h-dvh w-full bg-gray-900"><canvas class="absolute m-0 block h-full w-full overflow-hidden bg-gray-900 p-0"></canvas> <div class="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow font-bold text-white max-lg:text-[75px] lg:text-[100px] svelte-1xggvkh">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center px-8 opacity-90 max-lg:justify-center lg:justify-between"><div class="flex gap-3 max-lg:hidden"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white max-lg:hidden"><span class="select-none underline">利用規約</span></button></div></div>');function Ie(e,t){jt(t,!0);const[o,u]=Zt(),r=()=>H(ht,"$showInfoDialog",o),i=()=>H(Y,"$showTermsDialog",o),w=()=>H(Ut,"$isBlocked",o);let p=at(null),_,h,a,s,d,O=at(!0),b,c,l;const v=()=>{const m=window.innerWidth,f=window.innerHeight;K.resolution.value.set(m,f),a.setPixelRatio(window.devicePixelRatio),a.setSize(m,f),h.aspect=m/f,h.updateProjectionMatrix(),G.resolution.value.set(m,f),b&&(b.setSize(m,f),l.material.uniforms.resolution.value.set(m,f))};zt(async()=>{if(!C(p)||!C(p))return;const m={width:window.innerWidth,height:window.innerHeight};_=new pt,h=new Kt(75,window.innerWidth/window.innerHeight,.1,1e5);const et=-170*Math.PI/180,ot=180;h.position.x=ot*Math.sin(et),h.position.z=ot*Math.cos(et),h.position.y=90,_.add(h),c=new pt;const Tt=C(p).getContext("webgl2");s=new qt(h,C(p)),s.enableDamping=!0,s.enablePan=!1,s.enableZoom=!1,s.autoRotateSpeed=.5,s.autoRotate=!0,s.minDistance=100,s.maxDistance=500,s.maxPolarAngle=Math.PI/2-.35,d=new se(h,C(p)),d.noPan=!0,d.noRotate=!0,d.zoomSpeed=.2,b=new Qt(m.width,m.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:mt,minFilter:mt,wrapS:dt,wrapT:dt}),G.screenTexture.value=b.texture;const St=new Jt(2,2),Ot=new wt({fragmentShader:ye,vertexShader:be,uniforms:G});l=new yt(St,Ot),c.add(l),a=new te({canvas:C(p),context:Tt,alpha:!0}),a.setSize(window.innerWidth,window.innerHeight),a.setPixelRatio(Math.min(window.devicePixelRatio,2));const it=await Te();it?_.add(it):console.error("Failed to create DEM mesh");const kt=new ee,nt=()=>{requestAnimationFrame(nt),s.update(),d.update(),K.time.value=kt.getElapsedTime(),a.setRenderTarget(b),a.render(_,h),a.setRenderTarget(null),a.render(c,h),l.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};nt(),window.addEventListener("resize",v),v(),ie()||Y.set(!0)}),At(()=>{s.dispose(),d.dispose(),_.clear(),a.dispose(),b.dispose(),l.geometry.dispose(),window.removeEventListener("resize",v)});const E=()=>{ht.set(!r())},P=()=>{Y.set(!i())};var x=ke(),k=M(x);Lt(k,m=>vt(p,m),()=>C(p));var I=D(k,2),J=M(I),bt=D(M(J),2);{var xt=m=>{var f=Oe();f.__click=[Se,O],Rt(()=>{Ft(f,1,`bg-base lg:hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 transition-all duration-200 max-lg:text-lg lg:text-2xl lg:hover:text-white ${w()?"pointer-events-none":"pointer-events-auto"}`),f.disabled=w()}),Wt(3,f,()=>Ht,()=>({duration:300,axis:"y"})),st(m,f)};It(bt,m=>{!w()&&C(O)&&m(xt)})}T(J),T(I);var tt=D(I,2),Z=M(tt),U=M(Z),Et=M(U);rt(Et,{icon:"mdi:github",class:"h-8 w-8"}),T(U);var F=D(U,2);F.__click=E;var Pt=M(F);rt(Pt,{icon:"akar-icons:info-fill",class:"h-7 w-7"}),T(F),T(Z);var W=D(Z,2),Mt=M(W);Gt(Mt,{width:"230"}),T(W);var Ct=D(W,2);Ct.__click=P,T(tt),T(x),st(e,x),Nt(),u()}Dt(["click"]);export{Ie as component};
