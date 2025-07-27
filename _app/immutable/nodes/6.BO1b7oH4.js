import{t as _,a as y}from"../chunks/DGlbTQzB.js";import{i as M}from"../chunks/Dp_yTXRz.js";import{p as B,o as C,f as z,d as F,a as D,g as i,m as W,b as U}from"../chunks/BhGCRYfc.js";import{d as k}from"../chunks/B3cittMl.js";import{b as L}from"../chunks/B4D6-wy9.js";import{T as H,S as j,P as G,O,W as q,a as E,b as V,M as Z}from"../chunks/BU1-WxVn.js";import{T as I}from"../chunks/ClwP2i3y.js";var J=(p,u,e)=>u(e.b),K=_('<canvas class="h-full w-full"></canvas> <button class="absolute bottom-4 right-4 rounded bg-amber-50 px-4 py-2">フェード切り替え</button>',1);function ae(p,u){B(u,!1);let e=W(null);const f={a:"https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010026.webp",b:"https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010027.webp",c:"https://raw.githubusercontent.com/forestacdev/360photo-data-webp/refs/heads/main/webp/R0010028.webp"},o={textureA:{value:null},textureB:{value:null},fadeStartTime:{value:0},fadeSpeed:{value:2},time:{value:0}};let m;C(()=>{if(!i(e)){console.error("Canvas element is not defined");return}m=new H;const r=m.load(f.a);o.textureA.value=r,o.textureB.value=r;const t=new j,a=new G(75,window.innerWidth/window.innerHeight,.1,1e5);a.position.set(100,100,100),t.add(a);const d=i(e).getContext("webgl2"),n=new O(a,i(e));n.enableDamping=!0,n.enablePan=!1,n.enableZoom=!1,n.autoRotate=!0,n.autoRotateSpeed=2.5;const l=new I(a,i(e));l.noPan=!0,l.noRotate=!0,l.zoomSpeed=.2;const c=new q({canvas:i(e),context:d,alpha:!0});c.setSize(window.innerWidth,window.innerHeight),c.setPixelRatio(Math.min(window.devicePixelRatio,2));const P=new E(50,32,32),T=new V({uniforms:o,fragmentShader:`
				uniform sampler2D textureA;
				uniform sampler2D textureB;
				uniform float fadeStartTime;
				uniform float fadeSpeed;
				uniform float time;
				varying vec2 vUv;
				
				void main() {
					vec4 colorA = texture2D(textureA, vUv);
					vec4 colorB = texture2D(textureB, vUv);
					
					// フェード進行度を計算（0.0 = B表示、1.0 = A表示）
					float fadeProgress = (time - fadeStartTime) * fadeSpeed;
					fadeProgress = clamp(fadeProgress, 0.0, 1.0);
					
					// スムーズステップでより自然なフェード
					float smoothFade = smoothstep(0.0, 1.0, fadeProgress);
					
					// フェードが開始されていない場合（fadeStartTime <= 0.0）はAのみ表示
					float shouldFade = step(0.001, fadeStartTime);
					
					gl_FragColor = mix(colorA, mix(colorB, colorA, smoothFade), shouldFade);
				}
			`,vertexShader:`
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`}),A=new Z(P,T);t.add(A);const R=()=>{const s=window.innerWidth,b=window.innerHeight;c.setPixelRatio(window.devicePixelRatio),c.setSize(s,b),a.aspect=s/b,a.updateProjectionMatrix()};window.addEventListener("resize",R);const h=()=>{requestAnimationFrame(h),o.time.value=performance.now()*.001;const s=n.target;n.update(),l.target.set(s.x,s.y,s.z),l.update(),c.render(t,a)};h()});const x=r=>new Promise((t,a)=>{m.load(r,d=>{t(d)},void 0,d=>{a(d)})}),g=async r=>{try{const t=await x(r);o.textureB.value=o.textureA.value,o.textureA.value=t,o.fadeStartTime.value=performance.now()*.001}catch(t){console.error("フェード付きテクスチャの読み込みに失敗しました:",t)}};M();var v=K(),w=z(v);L(w,r=>U(e,r),()=>i(e));var S=F(w,2);S.__click=[J,g,f],y(p,v),D()}k(["click"]);export{ae as component};
