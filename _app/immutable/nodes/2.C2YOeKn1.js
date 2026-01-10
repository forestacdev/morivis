import"../chunks/CWj6FrbW.js";import{ae as jt,p as zt,o as At,af as Nt,f as wt,aa as k,a as at,b as Rt,c as M,q as C,a7 as rt,K as ht,r as T,t as Lt}from"../chunks/Dd4CGWiK.js";import{b as It,i as Zt,s as Ut,a as H}from"../chunks/H7Pt7YBJ.js";import{I as ct,b as lt,c as Y,i as Ft,d as Wt,t as Ht,e as Yt}from"../chunks/BfmghNf_.js";import{C as Vt,M as z,V as w,a as g,Q as Xt,b as pt,c as dt,d as Bt,S as yt,B as $t,e as V,f as bt,g as Kt,F as Gt,h as mt,P as qt,O as Qt,W as Jt,i as ut,N as _t,j as te,k as ee,l as oe}from"../chunks/z6G5bZx8.js";import{g as ie}from"../chunks/DcTSlovi.js";import{c as ne}from"../chunks/BOVylflK.js";const X={type:"change"},q={type:"start"},Q={type:"end"},ft=1e-6,n={NONE:-1,ROTATE:0,ZOOM:1,PAN:2,TOUCH_ROTATE:3,TOUCH_ZOOM_PAN:4},A=new g,S=new g,se=new w,N=new w,B=new w,j=new Xt,gt=new w,R=new w,$=new w,L=new w;class ae extends Vt{constructor(t,o=null){super(t,o),this.enabled=!0,this.screen={left:0,top:0,width:0,height:0},this.rotateSpeed=1,this.zoomSpeed=1.2,this.panSpeed=.3,this.noRotate=!1,this.noZoom=!1,this.noPan=!1,this.staticMoving=!1,this.dynamicDampingFactor=.2,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.keys=["KeyA","KeyS","KeyD"],this.mouseButtons={LEFT:z.ROTATE,MIDDLE:z.DOLLY,RIGHT:z.PAN},this.state=n.NONE,this.keyState=n.NONE,this.target=new w,this._lastPosition=new w,this._lastZoom=1,this._touchZoomDistanceStart=0,this._touchZoomDistanceEnd=0,this._lastAngle=0,this._eye=new w,this._movePrev=new g,this._moveCurr=new g,this._lastAxis=new w,this._zoomStart=new g,this._zoomEnd=new g,this._panStart=new g,this._panEnd=new g,this._pointers=[],this._pointerPositions={},this._onPointerMove=he.bind(this),this._onPointerDown=re.bind(this),this._onPointerUp=ce.bind(this),this._onPointerCancel=le.bind(this),this._onContextMenu=ge.bind(this),this._onMouseWheel=fe.bind(this),this._onKeyDown=de.bind(this),this._onKeyUp=pe.bind(this),this._onTouchStart=ve.bind(this),this._onTouchMove=we.bind(this),this._onTouchEnd=ye.bind(this),this._onMouseDown=me.bind(this),this._onMouseMove=ue.bind(this),this._onMouseUp=_e.bind(this),this._target0=this.target.clone(),this._position0=this.object.position.clone(),this._up0=this.object.up.clone(),this._zoom0=this.object.zoom,o!==null&&(this.connect(),this.handleResize()),this.update()}connect(){window.addEventListener("keydown",this._onKeyDown),window.addEventListener("keyup",this._onKeyUp),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerCancel),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="none"}disconnect(){window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("keyup",this._onKeyUp),this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerCancel),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}handleResize(){const t=this.domElement.getBoundingClientRect(),o=this.domElement.ownerDocument.documentElement;this.screen.left=t.left+window.pageXOffset-o.clientLeft,this.screen.top=t.top+window.pageYOffset-o.clientTop,this.screen.width=t.width,this.screen.height=t.height}update(){this._eye.subVectors(this.object.position,this.target),this.noRotate||this._rotateCamera(),this.noZoom||this._zoomCamera(),this.noPan||this._panCamera(),this.object.position.addVectors(this.target,this._eye),this.object.isPerspectiveCamera?(this._checkDistances(),this.object.lookAt(this.target),this._lastPosition.distanceToSquared(this.object.position)>ft&&(this.dispatchEvent(X),this._lastPosition.copy(this.object.position))):this.object.isOrthographicCamera?(this.object.lookAt(this.target),(this._lastPosition.distanceToSquared(this.object.position)>ft||this._lastZoom!==this.object.zoom)&&(this.dispatchEvent(X),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom)):console.warn("THREE.TrackballControls: Unsupported camera type.")}reset(){this.state=n.NONE,this.keyState=n.NONE,this.target.copy(this._target0),this.object.position.copy(this._position0),this.object.up.copy(this._up0),this.object.zoom=this._zoom0,this.object.updateProjectionMatrix(),this._eye.subVectors(this.object.position,this.target),this.object.lookAt(this.target),this.dispatchEvent(X),this._lastPosition.copy(this.object.position),this._lastZoom=this.object.zoom}_panCamera(){if(S.copy(this._panEnd).sub(this._panStart),S.lengthSq()){if(this.object.isOrthographicCamera){const t=(this.object.right-this.object.left)/this.object.zoom/this.domElement.clientWidth,o=(this.object.top-this.object.bottom)/this.object.zoom/this.domElement.clientWidth;S.x*=t,S.y*=o}S.multiplyScalar(this._eye.length()*this.panSpeed),N.copy(this._eye).cross(this.object.up).setLength(S.x),N.add(se.copy(this.object.up).setLength(S.y)),this.object.position.add(N),this.target.add(N),this.staticMoving?this._panStart.copy(this._panEnd):this._panStart.add(S.subVectors(this._panEnd,this._panStart).multiplyScalar(this.dynamicDampingFactor))}}_rotateCamera(){L.set(this._moveCurr.x-this._movePrev.x,this._moveCurr.y-this._movePrev.y,0);let t=L.length();t?(this._eye.copy(this.object.position).sub(this.target),gt.copy(this._eye).normalize(),R.copy(this.object.up).normalize(),$.crossVectors(R,gt).normalize(),R.setLength(this._moveCurr.y-this._movePrev.y),$.setLength(this._moveCurr.x-this._movePrev.x),L.copy(R.add($)),B.crossVectors(L,this._eye).normalize(),t*=this.rotateSpeed,j.setFromAxisAngle(B,t),this._eye.applyQuaternion(j),this.object.up.applyQuaternion(j),this._lastAxis.copy(B),this._lastAngle=t):!this.staticMoving&&this._lastAngle&&(this._lastAngle*=Math.sqrt(1-this.dynamicDampingFactor),this._eye.copy(this.object.position).sub(this.target),j.setFromAxisAngle(this._lastAxis,this._lastAngle),this._eye.applyQuaternion(j),this.object.up.applyQuaternion(j)),this._movePrev.copy(this._moveCurr)}_zoomCamera(){let t;this.state===n.TOUCH_ZOOM_PAN?(t=this._touchZoomDistanceStart/this._touchZoomDistanceEnd,this._touchZoomDistanceStart=this._touchZoomDistanceEnd,this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pt.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")):(t=1+(this._zoomEnd.y-this._zoomStart.y)*this.zoomSpeed,t!==1&&t>0&&(this.object.isPerspectiveCamera?this._eye.multiplyScalar(t):this.object.isOrthographicCamera?(this.object.zoom=pt.clamp(this.object.zoom/t,this.minZoom,this.maxZoom),this._lastZoom!==this.object.zoom&&this.object.updateProjectionMatrix()):console.warn("THREE.TrackballControls: Unsupported camera type")),this.staticMoving?this._zoomStart.copy(this._zoomEnd):this._zoomStart.y+=(this._zoomEnd.y-this._zoomStart.y)*this.dynamicDampingFactor)}_getMouseOnScreen(t,o){return A.set((t-this.screen.left)/this.screen.width,(o-this.screen.top)/this.screen.height),A}_getMouseOnCircle(t,o){return A.set((t-this.screen.width*.5-this.screen.left)/(this.screen.width*.5),(this.screen.height+2*(this.screen.top-o))/this.screen.width),A}_addPointer(t){this._pointers.push(t)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let o=0;o<this._pointers.length;o++)if(this._pointers[o].pointerId==t.pointerId){this._pointers.splice(o,1);return}}_trackPointer(t){let o=this._pointerPositions[t.pointerId];o===void 0&&(o=new g,this._pointerPositions[t.pointerId]=o),o.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const o=t.pointerId===this._pointers[0].pointerId?this._pointers[1]:this._pointers[0];return this._pointerPositions[o.pointerId]}_checkDistances(){(!this.noZoom||!this.noPan)&&(this._eye.lengthSq()>this.maxDistance*this.maxDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.maxDistance)),this._zoomStart.copy(this._zoomEnd)),this._eye.lengthSq()<this.minDistance*this.minDistance&&(this.object.position.addVectors(this.target,this._eye.setLength(this.minDistance)),this._zoomStart.copy(this._zoomEnd)))}}function re(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e))}function he(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function ce(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchEnd(e):this._onMouseUp(),this._removePointer(e),this._pointers.length===0&&(this.domElement.releasePointerCapture(e.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp)))}function le(e){this._removePointer(e)}function pe(){this.enabled!==!1&&(this.keyState=n.NONE,window.addEventListener("keydown",this._onKeyDown))}function de(e){this.enabled!==!1&&(window.removeEventListener("keydown",this._onKeyDown),this.keyState===n.NONE&&(e.code===this.keys[n.ROTATE]&&!this.noRotate?this.keyState=n.ROTATE:e.code===this.keys[n.ZOOM]&&!this.noZoom?this.keyState=n.ZOOM:e.code===this.keys[n.PAN]&&!this.noPan&&(this.keyState=n.PAN)))}function me(e){let t;switch(e.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case z.DOLLY:this.state=n.ZOOM;break;case z.ROTATE:this.state=n.ROTATE;break;case z.PAN:this.state=n.PAN;break;default:this.state=n.NONE}const o=this.keyState!==n.NONE?this.keyState:this.state;o===n.ROTATE&&!this.noRotate?(this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr)):o===n.ZOOM&&!this.noZoom?(this._zoomStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._zoomEnd.copy(this._zoomStart)):o===n.PAN&&!this.noPan&&(this._panStart.copy(this._getMouseOnScreen(e.pageX,e.pageY)),this._panEnd.copy(this._panStart)),this.dispatchEvent(q)}function ue(e){const t=this.keyState!==n.NONE?this.keyState:this.state;t===n.ROTATE&&!this.noRotate?(this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY))):t===n.ZOOM&&!this.noZoom?this._zoomEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY)):t===n.PAN&&!this.noPan&&this._panEnd.copy(this._getMouseOnScreen(e.pageX,e.pageY))}function _e(){this.state=n.NONE,this.dispatchEvent(Q)}function fe(e){if(this.enabled!==!1&&this.noZoom!==!0){switch(e.preventDefault(),e.deltaMode){case 2:this._zoomStart.y-=e.deltaY*.025;break;case 1:this._zoomStart.y-=e.deltaY*.01;break;default:this._zoomStart.y-=e.deltaY*25e-5;break}this.dispatchEvent(q),this.dispatchEvent(Q)}}function ge(e){this.enabled!==!1&&e.preventDefault()}function ve(e){switch(this._trackPointer(e),this._pointers.length){case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(this._pointers[0].pageX,this._pointers[0].pageY)),this._movePrev.copy(this._moveCurr);break;default:this.state=n.TOUCH_ZOOM_PAN;const t=this._pointers[0].pageX-this._pointers[1].pageX,o=this._pointers[0].pageY-this._pointers[1].pageY;this._touchZoomDistanceEnd=this._touchZoomDistanceStart=Math.sqrt(t*t+o*o);const u=(this._pointers[0].pageX+this._pointers[1].pageX)/2,s=(this._pointers[0].pageY+this._pointers[1].pageY)/2;this._panStart.copy(this._getMouseOnScreen(u,s)),this._panEnd.copy(this._panStart);break}this.dispatchEvent(q)}function we(e){switch(this._trackPointer(e),this._pointers.length){case 1:this._movePrev.copy(this._moveCurr),this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY));break;default:const t=this._getSecondPointerPosition(e),o=e.pageX-t.x,u=e.pageY-t.y;this._touchZoomDistanceEnd=Math.sqrt(o*o+u*u);const s=(e.pageX+t.x)/2,i=(e.pageY+t.y)/2;this._panEnd.copy(this._getMouseOnScreen(s,i));break}}function ye(e){switch(this._pointers.length){case 0:this.state=n.NONE;break;case 1:this.state=n.TOUCH_ROTATE,this._moveCurr.copy(this._getMouseOnCircle(e.pageX,e.pageY)),this._movePrev.copy(this._moveCurr);break;case 2:this.state=n.TOUCH_ZOOM_PAN;for(let t=0;t<this._pointers.length;t++)if(this._pointers[t].pointerId!==e.pointerId){const o=this._pointerPositions[this._pointers[t].pointerId];this._moveCurr.copy(this._getMouseOnCircle(o.x,o.y)),this._movePrev.copy(this._moveCurr);break}break}this.dispatchEvent(Q)}const be=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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
}`,xe=`varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}`,Ee=`#ifdef GL_FRAGMENT_PRECISION_HIGH
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

}`,Pe=`varying vec2 vUv;// fragmentShaderに渡すためのvarying変数
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
}`,vt=e=>Math.pow(2,Math.ceil(Math.log2(e))),Me=(e="morivis",t=1280,o="#ffffff",u="Arial, sans-serif")=>{const s=document.createElement("canvas"),i=s.getContext("2d");if(!i)throw new Error("Failed to get canvas context");i.font=`${t}px ${u}`,i.textAlign="left",i.textBaseline="top";const x=i.measureText(e),p=Math.ceil(x.width)+20,_=t+20,h=vt(p),r=vt(_);return s.width=h,s.height=r,i.clearRect(0,0,h,r),i.font=`${t}px ${u}`,i.textAlign="left",i.textBaseline="top",i.fillStyle=o,i.fillText(e,10,10),i.getImageData(0,0,s.width,s.height),s},G={time:{value:0},uColor:{value:new dt("rgb(252, 252, 252)")},uColor2:{value:new dt("rgb(0, 194, 36)")},resolution:{value:new g(window.innerWidth,window.innerHeight)}},K={screenCenter:{value:new g(.5,.5)},resolution:{value:new g(window.innerWidth,window.innerHeight)},screenTexture:{value:null},uTexture:{value:new Bt(Me())},uTextureResolution:{value:new g(1e3,750)}},Ce=new yt({uniforms:G,vertexShader:Pe,fragmentShader:Ee,transparent:!0}),Te=async(e,t=.1)=>{const u=await(await fetch(e)).blob(),s=new Image;s.src=URL.createObjectURL(u),await new Promise((r,a)=>{s.onload=r,s.onerror=a});const i=document.createElement("canvas");i.width=s.width,i.height=s.height;const x=i.getContext("2d");if(!x)throw new Error("Failed to get canvas context");x.drawImage(s,0,0);const p=x.getImageData(0,0,i.width,i.height).data,_=p.length/4|0,h=new Float32Array(_);for(let r=0,a=0;r<p.length;r+=4,a++){const d=p[r],O=p[r+1],y=p[r+2],c=(-1e4+(d*256*256+O*256+y)*.1)*t;h[a]=c}return{width:i.width,height:i.height,data:h}},Se=async()=>{const{data:e,width:t,height:o}=await Te("./terrainrgb.png",.15),u=1,s=1,i=new $t,x=t*u/2,p=o*s/2,_=new Float32Array(t*o*3);for(let c=0;c<o;c++)for(let l=0;l<t;l++){const b=c*t+l,v=l*u-x,E=e[b],P=c*s-p,D=b*3;_[D]=v,_[D+1]=E,_[D+2]=P}i.setAttribute("position",new V(_,3));const h=new Float32Array(t*o*2);for(let c=0;c<o;c++)for(let l=0;l<t;l++){const b=c*t+l,v=l/(t-1),E=c/(o-1),P=b*2;h[P]=v,h[P+1]=E}i.setAttribute("uv",new V(h,2));const r=(t-1)*(o-1),a=new Uint32Array(r*6);let d=0;for(let c=0;c<o-1;c++)for(let l=0;l<t-1;l++){const b=c*t+l,v=b+t,E=b+1,P=v+1;a[d++]=b,a[d++]=v,a[d++]=E,a[d++]=v,a[d++]=P,a[d++]=E}i.setIndex(new V(a,1));const O=new bt(i,Ce);O.name="dem",i.computeVertexNormals();const y=new Kt().makeRotationY(Math.PI/-2);return i.applyMatrix4(y),O};var Oe=wt("<button>マップを見る</button>"),De=wt('<div class="fixed h-dvh w-full bg-gray-900"><canvas class="absolute m-0 block h-full w-full overflow-hidden bg-gray-900 p-0"></canvas> <div class="pointer-events-none absolute top-0 left-0 z-10 h-full w-full"><div class="flex h-full w-full flex-col items-center justify-center"><span class="c-text-shadow font-bold text-white max-lg:text-[75px] lg:text-[100px] svelte-1uha8ag">morivis</span> <!></div></div> <div class="absolute bottom-8 flex w-full items-center px-8 opacity-90 max-lg:justify-center lg:justify-between"><div class="flex gap-3 max-lg:hidden"><a class="pointer-events-auto flex cursor-pointer items-center text-white" href="https://github.com/forestacdev/morivis" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex cursor-pointer items-center text-white"><!></button></div> <a class="pointer-events-auto shrink-0 cursor-pointer [&amp;_path]:fill-white" href="https://www.forest.ac.jp/" target="_blank" rel="noopener noreferrer"><!></a> <button class="pointer-events-auto flex shrink-0 cursor-pointer items-center p-2 text-white max-lg:hidden"><span class="underline select-none">利用規約</span></button></div></div>');function Ie(e,t){zt(t,!0);const o=()=>H(lt,"$showInfoDialog",i),u=()=>H(Y,"$showTermsDialog",i),s=()=>H(Ft,"$isBlocked",i),[i,x]=Ut();let p=rt(null),_,h,r,a,d,O=rt(!0),y,c,l;const b=()=>{ht(O,!1),ie("/morivis/map")},v=()=>{const m=window.innerWidth,f=window.innerHeight;G.resolution.value.set(m,f),r.setPixelRatio(window.devicePixelRatio),r.setSize(m,f),h.aspect=m/f,h.updateProjectionMatrix(),K.resolution.value.set(m,f),y&&(y.setSize(m,f),l.material.uniforms.resolution.value.set(m,f))};At(async()=>{if(!C(p)||!C(p))return;const m={width:window.innerWidth,height:window.innerHeight};_=new mt,h=new qt(75,window.innerWidth/window.innerHeight,.1,1e5);const ot=-170*Math.PI/180,it=180;h.position.x=it*Math.sin(ot),h.position.z=it*Math.cos(ot),h.position.y=90,_.add(h),c=new mt;const St=C(p).getContext("webgl2");a=new Qt(h,C(p)),a.enableDamping=!0,a.enablePan=!1,a.enableZoom=!1,a.autoRotateSpeed=.5,a.autoRotate=!0,a.minDistance=100,a.maxDistance=500,a.maxPolarAngle=Math.PI/2-.35,d=new ae(h,C(p)),d.noPan=!0,d.noRotate=!0,d.zoomSpeed=.2,y=new Jt(m.width,m.height,{depthBuffer:!1,stencilBuffer:!1,magFilter:_t,minFilter:_t,wrapS:ut,wrapT:ut}),K.screenTexture.value=y.texture;const Ot=new te(2,2),Dt=new yt({fragmentShader:be,vertexShader:xe,uniforms:K});l=new bt(Ot,Dt),c.add(l),r=new ee({canvas:C(p),context:St,alpha:!0}),r.setSize(window.innerWidth,window.innerHeight),r.setPixelRatio(Math.min(window.devicePixelRatio,2));const nt=await Se();nt?_.add(nt):console.error("Failed to create DEM mesh");const kt=new oe,st=()=>{requestAnimationFrame(st),a.update(),d.update(),G.time.value=kt.getElapsedTime(),r.setRenderTarget(y),r.render(_,h),r.setRenderTarget(null),r.render(c,h),l.material.uniforms.resolution.value.set(window.innerWidth,window.innerHeight)};st(),window.addEventListener("resize",v),v(),ne()||Y.set(!0)}),Nt(()=>{a.dispose(),d.dispose(),_.clear(),r.dispose(),y.dispose(),l.geometry.dispose(),window.removeEventListener("resize",v)});const E=()=>{lt.set(!o())},P=()=>{Y.set(!u())};var D=De(),J=M(D);It(J,m=>ht(p,m),()=>C(p));var I=k(J,2),tt=M(I),xt=k(M(tt),2);{var Et=m=>{var f=Oe();f.__click=b,Lt(()=>{Wt(f,1,`bg-base lg:hover:bg-main pointer-events-auto shrink-0 cursor-pointer rounded-full px-8 py-4 transition-all duration-200 max-lg:text-lg lg:text-2xl lg:hover:text-white ${s()?"pointer-events-none":"pointer-events-auto"}`),f.disabled=s()}),Ht(3,f,()=>Yt,()=>({duration:300,axis:"y"})),at(m,f)};Zt(xt,m=>{!s()&&C(O)&&m(Et)})}T(tt),T(I);var et=k(I,2),Z=M(et),U=M(Z),Pt=M(U);ct(Pt,{icon:"mdi:github",class:"h-8 w-8"}),T(U);var F=k(U,2);F.__click=E;var Mt=M(F);ct(Mt,{icon:"akar-icons:info-fill",class:"h-7 w-7"}),T(F),T(Z);var W=k(Z,2),Ct=M(W);Gt(Ct,{width:"230"}),T(W);var Tt=k(W,2);Tt.__click=P,T(et),T(D),at(e,D),Rt(),x()}jt(["click"]);export{Ie as component};
