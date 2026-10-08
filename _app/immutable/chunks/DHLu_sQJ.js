var z=Object.defineProperty;var D=(n,e,t)=>e in n?z(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var u=(n,e,t)=>D(n,typeof e!="symbol"?e+"":e,t);import{S as A,z as B,T as F,U as G,V as j}from"./BZ1drkj_.js";import{f as M}from"./DM3t6mdL.js";import{au as V,X as _,av as E,j as R,N as k,D as I,t as O,aw as L,q as w,ap as b,V as g,a6 as Z,ax as U,ay as C,f as $,g as H,az as J,H as X,b as y,ad as N,aA as W,C as q,a as Y,aq as K}from"./CRJLgPfV.js";const T=`
uniform vec2 voxelAnchor;
uniform mat4 voxelFlat, voxelGlobe;
uniform float voxelTransition;
uniform vec4 voxelClip;
vec3 spherePosition(vec3 local) {
	vec2 merc = local.xy + voxelAnchor;
	float lon = merc.x * 6.28318530718 - 3.14159265359;
	float lat = 2.0 * atan(exp(3.14159265359 * (1.0 - 2.0 * merc.y))) - 1.57079632679;
	return vec3(sin(lon)*cos(lat), sin(lat), cos(lon)*cos(lat)) * (1.0 + local.z*6.28318530718*cos(lat));
}
vec4 projectPosition(vec3 local) {
	return mix(voxelFlat * vec4(local, 1.0), voxelGlobe * vec4(spherePosition(local), 1.0), voxelTransition);
}`,Q=`
precision highp float;
in vec3 position;
uniform vec3 boxMin, boxMax;
out vec3 exitPoint;
${T}
void main() {
	exitPoint = position + 0.5;
	gl_Position = projectPosition(mix(boxMin, boxMax, exitPoint));
}`,ee=`
precision highp float;
precision highp sampler3D;
uniform sampler3D volumeTexture;
uniform sampler2D paletteTexture;
uniform vec3 boxMin, boxMax, rayOrigin;
uniform vec4 geoBounds;
uniform vec2 heights, valueRange;
uniform float threshold, density, opacity, heightScale;
in vec3 exitPoint;
out vec4 outColor;
${T}
void main() {
	vec3 direction = normalize(exitPoint - rayOrigin);
	vec3 inv = 1.0 / mix(vec3(0.000001), direction, greaterThan(abs(direction), vec3(0.000001)));
	vec3 a = -rayOrigin * inv, b = (1.0 - rayOrigin) * inv;
	vec3 nearBounds = min(a,b), farBounds = max(a,b);
	float start = max(0.0, max(nearBounds.x, max(nearBounds.y, nearBounds.z)));
	float end = min(farBounds.x, min(farBounds.y, farBounds.z));
	if (end <= start) discard;
	float stepSize = (end-start) / 256.0;
	vec4 sum = vec4(0.0);
	float firstDepth = 1.0;
	for (int i=0; i<256; i++) {
		vec3 unit = rayOrigin + direction * (start + (float(i)+0.5)*stepSize);
		vec3 local = mix(boxMin, boxMax, unit);
		if (voxelTransition > 0.99 && dot(vec4(spherePosition(local),1.0), voxelClip) < 0.0) continue;
		float latitude = 2.0*atan(exp(3.14159265359*(1.0-2.0*(local.y+voxelAnchor.y)))) - 1.57079632679;
		float meters = local.z * 40030228.88407185 * cos(latitude) / heightScale;
		vec3 uv = vec3(unit.x, (degrees(latitude)-geoBounds.y)/(geoBounds.w-geoBounds.y), (meters-heights.x)/(heights.y-heights.x));
		if (any(lessThan(uv,vec3(0.0))) || any(greaterThan(uv,vec3(1.0)))) continue;
		float value = texture(volumeTexture, uv).r;
		if (value <= 0.0 || value < threshold) continue;
		float normalized = clamp((value-valueRange.x)/max(0.000001,valueRange.y-valueRange.x),0.0,1.0);
		float alpha = 1.0-exp(-density*stepSize*4.0*max(normalized,0.05));
		if (sum.a == 0.0) {
			vec4 clip = projectPosition(local);
			firstDepth = clamp(clip.z/clip.w*0.5+0.5,0.0,1.0);
		}
		sum.rgb += (1.0-sum.a)*alpha*texture(paletteTexture,vec2(normalized,0.5)).rgb;
		sum.a += (1.0-sum.a)*alpha;
		if (sum.a > 0.98) break;
	}
	if (sum.a <= 0.0) discard;
	// MapLibre reserves part of the depth range for 2D layers.
	gl_FragDepth = gl_DepthRange.near + firstDepth * gl_DepthRange.diff;
	outColor = vec4(sum.rgb/sum.a, sum.a*opacity);
}`,te=new A,S=n=>(1-Math.asinh(Math.tan(n*Math.PI/180))/Math.PI)/2,ae=(n,e,t,a,o)=>{var h;if(n.dimensions.some(f=>f>o))throw new Error("ボリュームの寸法がGPUの3Dテクスチャ上限を超えています。overview配列を選んでください");const r=new V(n.values,...n.dimensions);r.format=_,r.type=E,r.minFilter=r.magFilter=a?R:k,r.needsUpdate=!0;const i=new I(new Uint8Array(256*4),256,1,O);i.minFilter=i.magFilter=R;const s=new L({glslVersion:U,vertexShader:Q,fragmentShader:ee,transparent:!0,depthWrite:!1,side:Z,uniforms:{...t,volumeTexture:{value:r},paletteTexture:{value:i},boxMin:{value:new g},boxMax:{value:new g},rayOrigin:{value:new g},geoBounds:{value:new b(...n.bounds.slice(0,4))},heights:{value:new w(n.bounds[4],n.bounds[5])},valueRange:{value:new w},threshold:{value:0},density:{value:2},opacity:{value:1},heightScale:{value:1}}}),l=new C(1,1,1,8,8,1),c=new $(l,s);return c.frustumCulled=!1,{kind:"volume",overview:e,data:n,mesh:c,material:s,texture:r,colors:i,bytes:n.values.byteLength*2+256*4*2+l.getAttribute("position").count*32+(((h=l.index)==null?void 0:h.array.byteLength)??0)}},P=(n,e)=>{const{data:t,material:a,colors:o}=n,r=a.uniforms,[i,s,l,c,h,f]=t.bounds,d=v=>1/(4003022888407185e-8*Math.cos(v*Math.PI/180)),x=[d(s),d(c),d(Math.max(s,Math.min(c,0)))];r.boxMin.value.set((i+180)/360-t.anchor[0],S(c)-t.anchor[1],h*Math.min(...x)*e.heightScale),r.boxMax.value.set((l+180)/360-t.anchor[0],S(s)-t.anchor[1],f*Math.max(...x)*e.heightScale),r.heightScale.value=e.heightScale,r.threshold.value=e.threshold,r.density.value=e.density,r.opacity.value=e.opacity,r.valueRange.value.set(e.min,e.max);const m=te.createColorArray(e.colorMap),p=o.image.data;for(let v=0;v<256;v++)p[v*4]=m[v*3],p[v*4+1]=m[v*3+1],p[v*4+2]=m[v*3+2],p[v*4+3]=255;o.needsUpdate=!0},oe=(n,e)=>{const t=new b(0,0,1,0).applyMatrix4(e.voxelFlat.value.clone().invert());t.multiplyScalar(1/t.w);const a=new g(t.x,t.y,t.z);if(e.voxelTransition.value>0){const r=new b(0,0,1,0).applyMatrix4(e.voxelGlobe.value.clone().invert());r.multiplyScalar(1/r.w);const i=Math.hypot(r.x,r.y,r.z),s=Math.asin(Math.max(-1,Math.min(1,r.y/i)));let l=(Math.atan2(r.x,r.z)+Math.PI)/(2*Math.PI);l+=Math.round(e.voxelAnchor.value.x-l);const c=new g(l-e.voxelAnchor.value.x,S(Math.max(-85,Math.min(85,s*180/Math.PI)))-e.voxelAnchor.value.y,(i-1)/(2*Math.PI*Math.cos(s)));a.lerp(c,e.voxelTransition.value)}const o=n.material.uniforms;o.rayOrigin.value.copy(a).sub(o.boxMin.value).divide(new g().subVectors(o.boxMax.value,o.boxMin.value))},re=n=>{n.texture.dispose(),n.colors.dispose(),n.mesh.geometry.dispose(),n.material.dispose()},ie=new A,se=n=>(n+180)/360;class he{constructor(){u(this,"specs",[]);u(this,"runtimes",new Map);u(this,"map",null);u(this,"renderer",null);u(this,"geometry",(()=>{const e=new C(1,1,1),t=e.getAttribute("normal"),a=new Float32Array(t.count*3);for(let o=0;o<t.count;o++){const r=t.getZ(o)>0?1:t.getZ(o)<0?.65:t.getX(o)!==0?.78:.9;a.fill(r,o*3,o*3+3)}return e.setAttribute("color",new H(a,3)),e})());u(this,"camera",new J);u(this,"scene",new X);u(this,"activeJobs",0);u(this,"max3DTextureSize",0);u(this,"linear3DFiltering",!1);u(this,"uniforms",{voxelAnchor:{value:new w},voxelFlat:{value:new y},voxelGlobe:{value:new y},voxelTransition:{value:0},voxelClip:{value:new b}});u(this,"setSpecs",e=>{this.specs=e;const t=new Set(e.map(a=>a.id));for(const[a,o]of this.runtimes){const r=e.find(i=>i.id===a);(!t.has(a)||(r==null?void 0:r.url)!==o.spec.url||(r==null?void 0:r.arrayPath)!==o.spec.arrayPath||(r==null?void 0:r.type)!==o.spec.type)&&(this.releaseRuntime(o),this.runtimes.delete(a))}if(this.map){for(const a of e){let o=this.runtimes.get(a.id);if(!o)o={spec:a,regions:new Map,jobs:new Map,desired:new Map,failed:new Set,abort:new AbortController},this.runtimes.set(a.id,o),this.initialize(o);else if(JSON.stringify(o.spec)!==JSON.stringify(a)){o.spec=a;for(const r of o.regions.values())r.kind==="volume"?P(r,a):this.updateMesh(r,a)}}this.refresh()}});u(this,"initialize",async e=>{var t;try{const a=e.spec,o=await B({entryId:a.id,url:a.url,arrayPath:a.arrayPath});if(e.abort.signal.aborted)return;if(!((t=o.gpm)!=null&&t.height))throw new Error("このZarrにはボクセル表示用の地域・高度情報がありません");e.layout=o.gpm,this.refresh()}catch(a){e.abort.signal.aborted||this.report(a)}});u(this,"report",e=>{var t;return(t=this.map)==null?void 0:t.fire("error",{error:e instanceof Error?e:new Error(String(e))})});u(this,"refresh",()=>{if(!this.map)return;const e=this.map.getBounds(),t=this.map.getCenter();for(const a of this.runtimes.values()){if(!a.layout)continue;const o=a.layout,r=a.spec.visible&&a.spec.opacity>0?o.regions.filter(({bounds:i})=>{const s=(i.west+i.east)/2,l=Math.round((t.lng-s)/360)*360;return i.east+l>=e.getWest()&&i.west+l<=e.getEast()&&i.north>=e.getSouth()&&i.south<=e.getNorth()}).sort((i,s)=>{const l=c=>Math.abs(((c.bounds.west+c.bounds.east)/2-t.lng+540)%360-180)+Math.abs((c.bounds.south+c.bounds.north)/2-t.lat);return l(i)-l(s)}):[];a.desired=new Map(r.map((i,s)=>[i.index,!!o.overviewPath&&(this.map.getZoom()<5||s>=M.limits.maxDetailVoxelRegions)]));for(const[i,s]of a.jobs)a.desired.has(i)||s.abort();for(const[i,s]of a.regions)a.desired.has(i)||(this.releaseRegion(s),a.regions.delete(i))}this.pump(),this.map.triggerRepaint()});u(this,"pump",()=>{var e;if(this.map)for(const t of this.runtimes.values())for(const[a,o]of t.desired){if(this.activeJobs>=M.limits.maxConcurrentVoxelReads)return;if(((e=t.regions.get(a))==null?void 0:e.overview)===o||t.jobs.has(a)||t.failed.has(`${a}/${o}`))continue;const r=new AbortController;t.jobs.set(a,r),this.activeJobs++,this.load(t,a,o,r)}});u(this,"load",async(e,t,a,o)=>{var r,i;try{const s=e.spec;if(s.type==="volume"){const m=await F({entryId:s.id,url:s.url,arrayPath:s.arrayPath,region:t,overview:a},o.signal);if(e.abort.signal.aborted||o.signal.aborted||e.desired.get(t)!==a)return;this.checkMemory(m.values.byteLength*2+64*1024,e,t);const p=ae(m,a,this.uniforms,this.linear3DFiltering,this.max3DTextureSize);P(p,e.spec);const v=e.regions.get(t);v&&this.releaseRegion(v),e.regions.set(t,p),(r=this.map)==null||r.triggerRepaint();return}const l=await G({entryId:s.id,url:s.url,arrayPath:s.arrayPath,region:t,overview:a},o.signal);if(e.abort.signal.aborted||o.signal.aborted||e.desired.get(t)!==a)return;const c=l.cells.length/7*104;this.checkMemory(c,e,t);const h=new N({vertexColors:!0,toneMapped:!1});h.onBeforeCompile=m=>{Object.assign(m.uniforms,this.uniforms),m.vertexShader=`uniform vec2 voxelAnchor; uniform mat4 voxelFlat; uniform mat4 voxelGlobe; uniform float voxelTransition; uniform vec4 voxelClip; varying float voxelHorizon;
${m.vertexShader}`.replace("#include <project_vertex>",`
					vec4 local = instanceMatrix * vec4(transformed, 1.0);
					local = modelMatrix * local;
					vec2 merc = local.xy + voxelAnchor;
					float lon = merc.x * 6.28318530718 - 3.14159265359;
					float lat = 2.0 * atan(exp(3.14159265359 * (1.0 - 2.0 * merc.y))) - 1.57079632679;
					vec3 sphere = vec3(sin(lon)*cos(lat), sin(lat), cos(lon)*cos(lat)) * (1.0 + local.z*6.28318530718*cos(lat));
					voxelHorizon = voxelTransition > 0.99 ? dot(vec4(sphere,1.0), voxelClip) : 1.0;
					vec4 mvPosition = local;
					gl_Position = mix(voxelFlat * local, voxelGlobe * vec4(sphere,1.0), voxelTransition);
				`),m.fragmentShader=`varying float voxelHorizon;
${m.fragmentShader}`.replace("void main() {","void main() { if (voxelHorizon < 0.0) discard;")},h.customProgramCacheKey=()=>"morivis-geozarr-voxel-v1";const f=new W(this.geometry,h,l.cells.length/7);f.frustumCulled=!1;const d={kind:"voxel",bytes:c,overview:a,data:l,mesh:f,material:h};this.updateMesh(d,e.spec);const x=e.regions.get(t);x&&this.releaseRegion(x),e.regions.set(t,d),(i=this.map)==null||i.triggerRepaint()}catch(s){!e.abort.signal.aborted&&!o.signal.aborted&&(e.failed.add(`${t}/${a}`),this.report(s))}finally{e.jobs.get(t)===o&&e.jobs.delete(t),this.activeJobs--,this.pump()}});u(this,"checkMemory",(e,t,a)=>{var r;let o=e-(((r=t.regions.get(a))==null?void 0:r.bytes)??0);for(const i of this.runtimes.values())for(const s of i.regions.values())o+=s.bytes;if(o>M.limits.maxExpandedBytes)throw new Error("Zarrの3D描画のメモリ上限に達しました。表示範囲を狭めるかoverview配列を選んでください")});u(this,"updateMesh",({mesh:e,material:t,data:a},o)=>{const r=new y,i=new q,s=ie.createColorArray(o.colorMap);let l=0;for(let c=0;c<a.cells.length;c+=7){const h=a.cells,f=h[c+6];if(f<o.threshold)continue;r.makeScale(h[c+3],h[c+4],h[c+5]).setPosition(h[c],h[c+1],h[c+2]),e.setMatrixAt(l,r);const d=Math.round(Math.max(0,Math.min(1,(f-o.min)/Math.max(1e-9,o.max-o.min)))*255)*3;e.setColorAt(l++,i.setRGB(s[d]/255,s[d+1]/255,s[d+2]/255,Y))}e.count=l,e.scale.z=o.heightScale,e.instanceMatrix.needsUpdate=!0,e.instanceColor&&(e.instanceColor.needsUpdate=!0),t.opacity=o.opacity,t.transparent=o.opacity<1,t.depthWrite=!0,t.needsUpdate=!0});u(this,"createLayer",()=>({id:j,type:"custom",renderingMode:"3d",onAdd:(e,t)=>{this.map=e,this.max3DTextureSize=t.getParameter(t.MAX_3D_TEXTURE_SIZE),this.linear3DFiltering=!!t.getExtension("OES_texture_float_linear"),this.renderer=new K({canvas:e.getCanvas(),context:t}),this.renderer.autoClear=!1,e.on("moveend",this.refresh),this.setSpecs(this.specs)},render:(e,t)=>{if(!this.renderer||!this.map)return;const a=t.defaultProjectionData;this.uniforms.voxelGlobe.value.fromArray(a.mainMatrix),this.uniforms.voxelTransition.value=a.projectionTransition,this.uniforms.voxelClip.value.fromArray(a.clippingPlane);for(const o of this.runtimes.values())if(!(!o.spec.visible||o.spec.opacity<=0))for(const r of o.regions.values()){const[i,s]=r.data.anchor,l=Math.round(se(this.map.getCenter().lng)-i);this.uniforms.voxelAnchor.value.set(i+l,s),this.uniforms.voxelFlat.value.fromArray(a.projectionTransition>0?a.fallbackMatrix:a.mainMatrix).multiply(new y().makeTranslation(i+l,s,0)),r.kind==="volume"&&oe(r,this.uniforms),this.scene.add(r.mesh),this.renderer.resetState(),this.renderer.render(this.scene,this.camera),this.scene.remove(r.mesh)}this.renderer.resetState()},onRemove:()=>this.releaseRenderer()}));u(this,"releaseRegion",e=>{if(e.kind==="volume"){re(e);return}e.mesh.dispose(),e.material.dispose()});u(this,"releaseRuntime",e=>{e.abort.abort();for(const t of e.jobs.values())t.abort();for(const t of e.regions.values())this.releaseRegion(t);e.regions.clear(),e.desired.clear()});u(this,"releaseRenderer",()=>{var e,t;(e=this.map)==null||e.off("moveend",this.refresh);for(const a of this.runtimes.values())this.releaseRuntime(a);this.runtimes.clear(),(t=this.renderer)==null||t.dispose(),this.renderer=null,this.map=null});u(this,"dispose",()=>{this.releaseRenderer(),this.specs=[],this.geometry.dispose()})}}export{j as GEOZARR_VOXEL_LAYER_ID,he as GeoZarrVoxelLayerManager};
