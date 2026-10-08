var Ke=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function qe(A){return A&&A.__esModule&&Object.prototype.hasOwnProperty.call(A,"default")?A.default:A}var xe={exports:{}};/* @license
Papa Parse
v5.5.3
https://github.com/mholt/PapaParse
License: MIT
*/(function(A,T){((t,N)=>{A.exports=N()})(Ke,function t(){var N=typeof self<"u"?self:typeof window<"u"?window:N!==void 0?N:{},i,r=!N.document&&!!N.postMessage,s=N.IS_PAPA_WORKER||!1,c={},D=0,S={};function l(n){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},(function(e){var C=Ce(e);C.chunkSize=parseInt(C.chunkSize),e.step||e.chunk||(C.chunkSize=null),this._handle=new V(C),(this._handle.streamer=this)._config=C}).call(this,n),this.parseChunk=function(e,C){var a=parseInt(this._config.skipFirstNLines)||0;if(this.isFirstChunk&&0<a){let E=this._config.newline;E||(R=this._config.quoteChar||'"',E=this._handle.guessLineEndings(e,R)),e=[...e.split(E).slice(a)].join(E)}this.isFirstChunk&&y(this._config.beforeFirstChunk)&&(R=this._config.beforeFirstChunk(e))!==void 0&&(e=R),this.isFirstChunk=!1,this._halted=!1;var a=this._partialLine+e,R=(this._partialLine="",this._handle.parse(a,this._baseIndex,!this._finished));if(!this._handle.paused()&&!this._handle.aborted()){if(e=R.meta.cursor,a=(this._finished||(this._partialLine=a.substring(e-this._baseIndex),this._baseIndex=e),R&&R.data&&(this._rowCount+=R.data.length),this._finished||this._config.preview&&this._rowCount>=this._config.preview),s)N.postMessage({results:R,workerId:S.WORKER_ID,finished:a});else if(y(this._config.chunk)&&!C){if(this._config.chunk(R,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);this._completeResults=R=void 0}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(R.data),this._completeResults.errors=this._completeResults.errors.concat(R.errors),this._completeResults.meta=R.meta),this._completed||!a||!y(this._config.complete)||R&&R.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||R&&R.meta.paused||this._nextChunk(),R}this._halted=!0},this._sendError=function(e){y(this._config.error)?this._config.error(e):s&&this._config.error&&N.postMessage({workerId:S.WORKER_ID,error:e,finished:!1})}}function F(n){var e;(n=n||{}).chunkSize||(n.chunkSize=S.RemoteChunkSize),l.call(this,n),this._nextChunk=r?function(){this._readChunk(),this._chunkLoaded()}:function(){this._readChunk()},this.stream=function(C){this._input=C,this._nextChunk()},this._readChunk=function(){if(this._finished)this._chunkLoaded();else{if(e=new XMLHttpRequest,this._config.withCredentials&&(e.withCredentials=this._config.withCredentials),r||(e.onload=Se(this._chunkLoaded,this),e.onerror=Se(this._chunkError,this)),e.open(this._config.downloadRequestBody?"POST":"GET",this._input,!r),this._config.downloadRequestHeaders){var C,a=this._config.downloadRequestHeaders;for(C in a)e.setRequestHeader(C,a[C])}var R;this._config.chunkSize&&(R=this._start+this._config.chunkSize-1,e.setRequestHeader("Range","bytes="+this._start+"-"+R));try{e.send(this._config.downloadRequestBody)}catch(E){this._chunkError(E.message)}r&&e.status===0&&this._chunkError()}},this._chunkLoaded=function(){e.readyState===4&&(e.status<200||400<=e.status?this._chunkError():(this._start+=this._config.chunkSize||e.responseText.length,this._finished=!this._config.chunkSize||this._start>=(C=>(C=C.getResponseHeader("Content-Range"))!==null?parseInt(C.substring(C.lastIndexOf("/")+1)):-1)(e),this.parseChunk(e.responseText)))},this._chunkError=function(C){C=e.statusText||C,this._sendError(new Error(C))}}function d(n){(n=n||{}).chunkSize||(n.chunkSize=S.LocalChunkSize),l.call(this,n);var e,C,a=typeof FileReader<"u";this.stream=function(R){this._input=R,C=R.slice||R.webkitSlice||R.mozSlice,a?((e=new FileReader).onload=Se(this._chunkLoaded,this),e.onerror=Se(this._chunkError,this)):e=new FileReaderSync,this._nextChunk()},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk()},this._readChunk=function(){var R=this._input,E=(this._config.chunkSize&&(E=Math.min(this._start+this._config.chunkSize,this._input.size),R=C.call(R,this._start,E)),e.readAsText(R,this._config.encoding));a||this._chunkLoaded({target:{result:E}})},this._chunkLoaded=function(R){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(R.target.result)},this._chunkError=function(){this._sendError(e.error)}}function I(n){var e;l.call(this,n=n||{}),this.stream=function(C){return e=C,this._nextChunk()},this._nextChunk=function(){var C,a;if(!this._finished)return C=this._config.chunkSize,e=C?(a=e.substring(0,C),e.substring(C)):(a=e,""),this._finished=!e,this.parseChunk(a)}}function o(n){l.call(this,n=n||{});var e=[],C=!0,a=!1;this.pause=function(){l.prototype.pause.apply(this,arguments),this._input.pause()},this.resume=function(){l.prototype.resume.apply(this,arguments),this._input.resume()},this.stream=function(R){this._input=R,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError)},this._checkIsFinished=function(){a&&e.length===1&&(this._finished=!0)},this._nextChunk=function(){this._checkIsFinished(),e.length?this.parseChunk(e.shift()):C=!0},this._streamData=Se(function(R){try{e.push(typeof R=="string"?R:R.toString(this._config.encoding)),C&&(C=!1,this._checkIsFinished(),this.parseChunk(e.shift()))}catch(E){this._streamError(E)}},this),this._streamError=Se(function(R){this._streamCleanUp(),this._sendError(R)},this),this._streamEnd=Se(function(){this._streamCleanUp(),a=!0,this._streamData("")},this),this._streamCleanUp=Se(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError)},this)}function V(n){var e,C,a,R,E=Math.pow(2,53),L=-E,k=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,U=/^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/,P=this,J=0,u=0,K=!1,p=!1,f=[],O={data:[],errors:[],meta:{}};function w(X){return n.skipEmptyLines==="greedy"?X.join("").trim()==="":X.length===1&&X[0].length===0}function _(){if(O&&a&&(ne("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+S.DefaultDelimiter+"'"),a=!1),n.skipEmptyLines&&(O.data=O.data.filter(function(x){return!w(x)})),H()){let x=function(Z,Y){y(n.transformHeader)&&(Z=n.transformHeader(Z,Y)),f.push(Z)};var m=x;if(O)if(Array.isArray(O.data[0])){for(var X=0;H()&&X<O.data.length;X++)O.data[X].forEach(x);O.data.splice(0,1)}else O.data.forEach(x)}function G(x,Z){for(var Y=n.header?{}:[],v=0;v<x.length;v++){var g=v,te=x[v],te=((b,Q)=>(q=>(n.dynamicTypingFunction&&n.dynamicTyping[q]===void 0&&(n.dynamicTyping[q]=n.dynamicTypingFunction(q)),(n.dynamicTyping[q]||n.dynamicTyping)===!0))(b)?Q==="true"||Q==="TRUE"||Q!=="false"&&Q!=="FALSE"&&((q=>{if(k.test(q)&&(q=parseFloat(q),L<q&&q<E))return 1})(Q)?parseFloat(Q):U.test(Q)?new Date(Q):Q===""?null:Q):Q)(g=n.header?v>=f.length?"__parsed_extra":f[v]:g,te=n.transform?n.transform(te,g):te);g==="__parsed_extra"?(Y[g]=Y[g]||[],Y[g].push(te)):Y[g]=te}return n.header&&(v>f.length?ne("FieldMismatch","TooManyFields","Too many fields: expected "+f.length+" fields but parsed "+v,u+Z):v<f.length&&ne("FieldMismatch","TooFewFields","Too few fields: expected "+f.length+" fields but parsed "+v,u+Z)),Y}var z;O&&(n.header||n.dynamicTyping||n.transform)&&(z=1,!O.data.length||Array.isArray(O.data[0])?(O.data=O.data.map(G),z=O.data.length):O.data=G(O.data,0),n.header&&O.meta&&(O.meta.fields=f),u+=z)}function H(){return n.header&&f.length===0}function ne(X,G,z,m){X={type:X,code:G,message:z},m!==void 0&&(X.row=m),O.errors.push(X)}y(n.step)&&(R=n.step,n.step=function(X){O=X,H()?_():(_(),O.data.length!==0&&(J+=X.data.length,n.preview&&J>n.preview?C.abort():(O.data=O.data[0],R(O,P))))}),this.parse=function(X,G,z){var m=n.quoteChar||'"',m=(n.newline||(n.newline=this.guessLineEndings(X,m)),a=!1,n.delimiter?y(n.delimiter)&&(n.delimiter=n.delimiter(X),O.meta.delimiter=n.delimiter):((m=((x,Z,Y,v,g)=>{var te,b,Q,q;g=g||[",","	","|",";",S.RECORD_SEP,S.UNIT_SEP];for(var Ie=0;Ie<g.length;Ie++){for(var ae,de=g[Ie],Ae=0,ie=0,ee=0,Ne=(Q=void 0,new W({comments:v,delimiter:de,newline:Z,preview:10}).parse(x)),oe=0;oe<Ne.data.length;oe++)Y&&w(Ne.data[oe])?ee++:(ae=Ne.data[oe].length,ie+=ae,Q===void 0?Q=ae:0<ae&&(Ae+=Math.abs(ae-Q),Q=ae));0<Ne.data.length&&(ie/=Ne.data.length-ee),(b===void 0||Ae<=b)&&(q===void 0||q<ie)&&1.99<ie&&(b=Ae,te=de,q=ie)}return{successful:!!(n.delimiter=te),bestDelimiter:te}})(X,n.newline,n.skipEmptyLines,n.comments,n.delimitersToGuess)).successful?n.delimiter=m.bestDelimiter:(a=!0,n.delimiter=S.DefaultDelimiter),O.meta.delimiter=n.delimiter),Ce(n));return n.preview&&n.header&&m.preview++,e=X,C=new W(m),O=C.parse(e,G,z),_(),K?{meta:{paused:!0}}:O||{meta:{paused:!1}}},this.paused=function(){return K},this.pause=function(){K=!0,C.abort(),e=y(n.chunk)?"":e.substring(C.getCharIndex())},this.resume=function(){P.streamer._halted?(K=!1,P.streamer.parseChunk(e,!0)):setTimeout(P.resume,3)},this.aborted=function(){return p},this.abort=function(){p=!0,C.abort(),O.meta.aborted=!0,y(n.complete)&&n.complete(O),e=""},this.guessLineEndings=function(x,m){x=x.substring(0,1048576);var m=new RegExp(M(m)+"([^]*?)"+M(m),"gm"),z=(x=x.replace(m,"")).split("\r"),m=x.split(`
`),x=1<m.length&&m[0].length<z[0].length;if(z.length===1||x)return`
`;for(var Z=0,Y=0;Y<z.length;Y++)z[Y][0]===`
`&&Z++;return Z>=z.length/2?`\r
`:"\r"}}function M(n){return n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function W(n){var e=(n=n||{}).delimiter,C=n.newline,a=n.comments,R=n.step,E=n.preview,L=n.fastMode,k=null,U=!1,P=n.quoteChar==null?'"':n.quoteChar,J=P;if(n.escapeChar!==void 0&&(J=n.escapeChar),(typeof e!="string"||-1<S.BAD_DELIMITERS.indexOf(e))&&(e=","),a===e)throw new Error("Comment character same as delimiter");a===!0?a="#":(typeof a!="string"||-1<S.BAD_DELIMITERS.indexOf(a))&&(a=!1),C!==`
`&&C!=="\r"&&C!==`\r
`&&(C=`
`);var u=0,K=!1;this.parse=function(p,f,O){if(typeof p!="string")throw new Error("Input must be a string");var w=p.length,_=e.length,H=C.length,ne=a.length,X=y(R),G=[],z=[],m=[],x=u=0;if(!p)return Ae();if(L||L!==!1&&p.indexOf(P)===-1){for(var Z=p.split(C),Y=0;Y<Z.length;Y++){if(m=Z[Y],u+=m.length,Y!==Z.length-1)u+=C.length;else if(O)return Ae();if(!a||m.substring(0,ne)!==a){if(X){if(G=[],q(m.split(e)),ie(),K)return Ae()}else q(m.split(e));if(E&&E<=Y)return G=G.slice(0,E),Ae(!0)}}return Ae()}for(var v=p.indexOf(e,u),g=p.indexOf(C,u),te=new RegExp(M(J)+M(P),"g"),b=p.indexOf(P,u);;)if(p[u]===P)for(b=u,u++;;){if((b=p.indexOf(P,b+1))===-1)return O||z.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:G.length,index:u}),ae();if(b===w-1)return ae(p.substring(u,b).replace(te,P));if(P===J&&p[b+1]===J)b++;else if(P===J||b===0||p[b-1]!==J){v!==-1&&v<b+1&&(v=p.indexOf(e,b+1));var Q=Ie((g=g!==-1&&g<b+1?p.indexOf(C,b+1):g)===-1?v:Math.min(v,g));if(p.substr(b+1+Q,_)===e){m.push(p.substring(u,b).replace(te,P)),p[u=b+1+Q+_]!==P&&(b=p.indexOf(P,u)),v=p.indexOf(e,u),g=p.indexOf(C,u);break}if(Q=Ie(g),p.substring(b+1+Q,b+1+Q+H)===C){if(m.push(p.substring(u,b).replace(te,P)),de(b+1+Q+H),v=p.indexOf(e,u),b=p.indexOf(P,u),X&&(ie(),K))return Ae();if(E&&G.length>=E)return Ae(!0);break}z.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:G.length,index:u}),b++}}else if(a&&m.length===0&&p.substring(u,u+ne)===a){if(g===-1)return Ae();u=g+H,g=p.indexOf(C,u),v=p.indexOf(e,u)}else if(v!==-1&&(v<g||g===-1))m.push(p.substring(u,v)),u=v+_,v=p.indexOf(e,u);else{if(g===-1)break;if(m.push(p.substring(u,g)),de(g+H),X&&(ie(),K))return Ae();if(E&&G.length>=E)return Ae(!0)}return ae();function q(ee){G.push(ee),x=u}function Ie(ee){var Ne=0;return Ne=ee!==-1&&(ee=p.substring(b+1,ee))&&ee.trim()===""?ee.length:Ne}function ae(ee){return O||(ee===void 0&&(ee=p.substring(u)),m.push(ee),u=w,q(m),X&&ie()),Ae()}function de(ee){u=ee,q(m),m=[],g=p.indexOf(C,u)}function Ae(ee){if(n.header&&!f&&G.length&&!U){var Ne=G[0],oe=Object.create(null),ge=new Set(Ne);let Ve=!1;for(let Me=0;Me<Ne.length;Me++){let Re=Ne[Me];if(oe[Re=y(n.transformHeader)?n.transformHeader(Re,Me):Re]){let ue,Ge=oe[Re];for(;ue=Re+"_"+Ge,Ge++,ge.has(ue););ge.add(ue),Ne[Me]=ue,oe[Re]++,Ve=!0,(k=k===null?{}:k)[ue]=Re}else oe[Re]=1,Ne[Me]=Re;ge.add(Re)}Ve&&console.warn("Duplicate headers found and renamed."),U=!0}return{data:G,errors:z,meta:{delimiter:e,linebreak:C,aborted:K,truncated:!!ee,cursor:x+(f||0),renamedHeaders:k}}}function ie(){R(Ae()),G=[],z=[]}},this.abort=function(){K=!0},this.getCharIndex=function(){return u}}function $(n){var e=n.data,C=c[e.workerId],a=!1;if(e.error)C.userError(e.error,e.file);else if(e.results&&e.results.data){var R={abort:function(){a=!0,j(e.workerId,{data:[],errors:[],meta:{aborted:!0}})},pause:De,resume:De};if(y(C.userStep)){for(var E=0;E<e.results.data.length&&(C.userStep({data:e.results.data[E],errors:e.results.errors,meta:e.results.meta},R),!a);E++);delete e.results}else y(C.userChunk)&&(C.userChunk(e.results,R,e.file),delete e.results)}e.finished&&!a&&j(e.workerId,e.results)}function j(n,e){var C=c[n];y(C.userComplete)&&C.userComplete(e),C.terminate(),delete c[n]}function De(){throw new Error("Not implemented.")}function Ce(n){if(typeof n!="object"||n===null)return n;var e,C=Array.isArray(n)?[]:{};for(e in n)C[e]=Ce(n[e]);return C}function Se(n,e){return function(){n.apply(e,arguments)}}function y(n){return typeof n=="function"}return S.parse=function(n,e){var C=(e=e||{}).dynamicTyping||!1;if(y(C)&&(e.dynamicTypingFunction=C,C={}),e.dynamicTyping=C,e.transform=!!y(e.transform)&&e.transform,!e.worker||!S.WORKERS_SUPPORTED)return C=null,S.NODE_STREAM_INPUT,typeof n=="string"?(n=(a=>a.charCodeAt(0)!==65279?a:a.slice(1))(n),C=new(e.download?F:I)(e)):n.readable===!0&&y(n.read)&&y(n.on)?C=new o(e):(N.File&&n instanceof File||n instanceof Object)&&(C=new d(e)),C.stream(n);(C=(()=>{var a;return!!S.WORKERS_SUPPORTED&&(a=(()=>{var R=N.URL||N.webkitURL||null,E=t.toString();return S.BLOB_URL||(S.BLOB_URL=R.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ","(",E,")();"],{type:"text/javascript"})))})(),(a=new N.Worker(a)).onmessage=$,a.id=D++,c[a.id]=a)})()).userStep=e.step,C.userChunk=e.chunk,C.userComplete=e.complete,C.userError=e.error,e.step=y(e.step),e.chunk=y(e.chunk),e.complete=y(e.complete),e.error=y(e.error),delete e.worker,C.postMessage({input:n,config:e,workerId:C.id})},S.unparse=function(n,e){var C=!1,a=!0,R=",",E=`\r
`,L='"',k=L+L,U=!1,P=null,J=!1,u=((()=>{if(typeof e=="object"){if(typeof e.delimiter!="string"||S.BAD_DELIMITERS.filter(function(f){return e.delimiter.indexOf(f)!==-1}).length||(R=e.delimiter),typeof e.quotes!="boolean"&&typeof e.quotes!="function"&&!Array.isArray(e.quotes)||(C=e.quotes),typeof e.skipEmptyLines!="boolean"&&typeof e.skipEmptyLines!="string"||(U=e.skipEmptyLines),typeof e.newline=="string"&&(E=e.newline),typeof e.quoteChar=="string"&&(L=e.quoteChar),typeof e.header=="boolean"&&(a=e.header),Array.isArray(e.columns)){if(e.columns.length===0)throw new Error("Option columns is empty");P=e.columns}e.escapeChar!==void 0&&(k=e.escapeChar+L),e.escapeFormulae instanceof RegExp?J=e.escapeFormulae:typeof e.escapeFormulae=="boolean"&&e.escapeFormulae&&(J=/^[=+\-@\t\r].*$/)}})(),new RegExp(M(L),"g"));if(typeof n=="string"&&(n=JSON.parse(n)),Array.isArray(n)){if(!n.length||Array.isArray(n[0]))return K(null,n,U);if(typeof n[0]=="object")return K(P||Object.keys(n[0]),n,U)}else if(typeof n=="object")return typeof n.data=="string"&&(n.data=JSON.parse(n.data)),Array.isArray(n.data)&&(n.fields||(n.fields=n.meta&&n.meta.fields||P),n.fields||(n.fields=Array.isArray(n.data[0])?n.fields:typeof n.data[0]=="object"?Object.keys(n.data[0]):[]),Array.isArray(n.data[0])||typeof n.data[0]=="object"||(n.data=[n.data])),K(n.fields||[],n.data||[],U);throw new Error("Unable to serialize unrecognized input");function K(f,O,w){var _="",H=(typeof f=="string"&&(f=JSON.parse(f)),typeof O=="string"&&(O=JSON.parse(O)),Array.isArray(f)&&0<f.length),ne=!Array.isArray(O[0]);if(H&&a){for(var X=0;X<f.length;X++)0<X&&(_+=R),_+=p(f[X],X);0<O.length&&(_+=E)}for(var G=0;G<O.length;G++){var z=(H?f:O[G]).length,m=!1,x=H?Object.keys(O[G]).length===0:O[G].length===0;if(w&&!H&&(m=w==="greedy"?O[G].join("").trim()==="":O[G].length===1&&O[G][0].length===0),w==="greedy"&&H){for(var Z=[],Y=0;Y<z;Y++){var v=ne?f[Y]:Y;Z.push(O[G][v])}m=Z.join("").trim()===""}if(!m){for(var g=0;g<z;g++){0<g&&!x&&(_+=R);var te=H&&ne?f[g]:g;_+=p(O[G][te],g)}G<O.length-1&&(!w||0<z&&!x)&&(_+=E)}}return _}function p(f,O){var w,_;return f==null?"":f.constructor===Date?JSON.stringify(f).slice(1,25):(_=!1,J&&typeof f=="string"&&J.test(f)&&(f="'"+f,_=!0),w=f.toString().replace(u,k),(_=_||C===!0||typeof C=="function"&&C(f,O)||Array.isArray(C)&&C[O]||((H,ne)=>{for(var X=0;X<ne.length;X++)if(-1<H.indexOf(ne[X]))return!0;return!1})(w,S.BAD_DELIMITERS)||-1<w.indexOf(R)||w.charAt(0)===" "||w.charAt(w.length-1)===" ")?L+w+L:w)}},S.RECORD_SEP="",S.UNIT_SEP="",S.BYTE_ORDER_MARK="\uFEFF",S.BAD_DELIMITERS=["\r",`
`,'"',S.BYTE_ORDER_MARK],S.WORKERS_SUPPORTED=!r&&!!N.Worker,S.NODE_STREAM_INPUT=1,S.LocalChunkSize=10485760,S.RemoteChunkSize=5242880,S.DefaultDelimiter=",",S.Parser=W,S.ParserHandle=V,S.NetworkStreamer=F,S.FileStreamer=d,S.StringStreamer=I,S.ReadableStreamStreamer=o,N.jQuery&&((i=N.jQuery).fn.parse=function(n){var e=n.config||{},C=[];return this.each(function(E){if(!(i(this).prop("tagName").toUpperCase()==="INPUT"&&i(this).attr("type").toLowerCase()==="file"&&N.FileReader)||!this.files||this.files.length===0)return!0;for(var L=0;L<this.files.length;L++)C.push({file:this.files[L],inputElem:this,instanceConfig:i.extend({},e)})}),a(),this;function a(){if(C.length===0)y(n.complete)&&n.complete();else{var E,L,k,U,P=C[0];if(y(n.before)){var J=n.before(P.file,P.inputElem);if(typeof J=="object"){if(J.action==="abort")return E="AbortError",L=P.file,k=P.inputElem,U=J.reason,void(y(n.error)&&n.error({name:E},L,k,U));if(J.action==="skip")return void R();typeof J.config=="object"&&(P.instanceConfig=i.extend(P.instanceConfig,J.config))}else if(J==="skip")return void R()}var u=P.instanceConfig.complete;P.instanceConfig.complete=function(K){y(u)&&u(K,P.file,P.inputElem),R()},S.parse(P.file,P.instanceConfig)}}function R(){C.splice(0,1),a()}}),s&&(N.onmessage=function(n){n=n.data,S.WORKER_ID===void 0&&n&&(S.WORKER_ID=n.workerId),typeof n.input=="string"?N.postMessage({workerId:S.WORKER_ID,results:S.parse(n.input,n.config),finished:!0}):(N.File&&n.input instanceof File||n.input instanceof Object)&&(n=S.parse(n.input,n.config))&&N.postMessage({workerId:S.WORKER_ID,results:n,finished:!0})}),(F.prototype=Object.create(l.prototype)).constructor=F,(d.prototype=Object.create(l.prototype)).constructor=d,(I.prototype=Object.create(I.prototype)).constructor=I,(o.prototype=Object.create(l.prototype)).constructor=o,S})})(xe);var Ze=xe.exports,en=qe(Ze),nn=`"Code","Attribute","Acronym","Attributetype","Class"
1,Agency responsible for production,AGENCY,A,F
2,Beacon shape,BCNSHP,E,F
3,Building shape,BUISHP,E,F
4,Buoy shape,BOYSHP,E,F
5,Buried depth,BURDEP,F,F
6,Call sign,CALSGN,S,F
7,Category of airport/airfield,CATAIR,L,F
8,Category of anchorage,CATACH,L,F
9,Category of bridge,CATBRG,L,F
10,Category of built-up area,CATBUA,E,F
11,Category of cable,CATCBL,E,F
12,Category of canal,CATCAN,E,F
13,Category of cardinal mark,CATCAM,E,F
14,Category of checkpoint,CATCHP,E,F
15,Category of coastline,CATCOA,E,F
16,Category of control point,CATCTR,E,F
17,Category of conveyor,CATCON,E,F
18,Category of coverage,CATCOV,E,F
19,Category of crane,CATCRN,E,F
20,Category of dam,CATDAM,E,F
21,Category of distance mark,CATDIS,E,F
22,Category of dock,CATDOC,E,F
23,Category of dumping ground,CATDPG,L,F
24,Category of fence/wall,CATFNC,E,F
25,Category of ferry,CATFRY,E,F
26,Category of fishing  facility,CATFIF,E,F
27,Category of fog signal,CATFOG,E,F
28,Category of fortified structure,CATFOR,E,F
29,Category of gate,CATGAT,E,F
30,Category of harbour facility,CATHAF,L,F
31,Category of hulk,CATHLK,L,F
32,Category of ice,CATICE,E,F
33,Category of installation buoy,CATINB,E,F
34,Category of land region,CATLND,L,F
35,Category of landmark,CATLMK,L,F
36,Category of lateral mark,CATLAM,E,F
37,Category of light,CATLIT,L,F
38,Category of marine farm/culture,CATMFA,E,F
39,Category of military practice area,CATMPA,L,F
40,Category of mooring/warping facility,CATMOR,E,F
41,Category of navigation line,CATNAV,E,F
42,Category of obstruction,CATOBS,E,F
43,Category of offshore platform,CATOFP,L,F
44,Category of oil barrier,CATOLB,E,F
45,Category of pile,CATPLE,E,F
46,Category of pilot boarding place,CATPIL,E,F
47,Category of pipeline / pipe,CATPIP,L,F
48,Category of production area,CATPRA,E,F
49,Category of pylon,CATPYL,E,F
50,Category of quality of data,CATQUA,E,F
51,Category of radar station,CATRAS,E,F
52,Category of radar transponder beacon,CATRTB,E,F
53,Category of radio station,CATROS,L,F
54,Category of recommended track,CATTRK,E,F
55,Category of rescue station,CATRSC,L,F
56,Category of restricted area,CATREA,L,F
57,Category of road,CATROD,E,F
58,Category of runway,CATRUN,E,F
59,Category of sea area,CATSEA,E,F
60,Category of shoreline construction,CATSLC,E,F
61,"Category of signal station, traffic",CATSIT,L,F
62,"Category of signal station, warning",CATSIW,L,F
63,Category of silo/tank,CATSIL,E,F
64,Category of slope,CATSLO,E,F
65,Category of small craft facility,CATSCF,L,F
66,Category of special purpose mark,CATSPM,L,F
67,Category of Traffic Separation Scheme,CATTSS,E,F
68,Category of vegetation,CATVEG,L,F
69,Category of water turbulence,CATWAT,E,F
70,Category of weed/kelp,CATWED,E,F
71,Category of wreck,CATWRK,E,F
72,Category of zone of confidence data,CATZOC,E,F
73,Character spacing,$SPACE,E,$
74,Character specification,$CHARS,A,$
75,Colour,COLOUR,L,F
76,Colour pattern,COLPAT,L,F
77,Communication channel,COMCHA,A,F
78,Compass size,$CSIZE,F,$
79,Compilation date,CPDATE,A,F
80,Compilation scale,CSCALE,I,F
81,Condition,CONDTN,E,F
82,"Conspicuous, Radar",CONRAD,E,F
83,"Conspicuous, visual",CONVIS,E,F
84,Current velocity,CURVEL,F,F
85,Date end,DATEND,A,F
86,Date start,DATSTA,A,F
87,Depth range value 1,DRVAL1,F,F
88,Depth range value 2,DRVAL2,F,F
89,Depth units,DUNITS,E,F
90,Elevation,ELEVAT,F,F
91,Estimated range of transmission,ESTRNG,F,F
92,Exhibition condition of light,EXCLIT,E,F
93,Exposition of sounding,EXPSOU,E,F
94,Function,FUNCTN,L,F
95,Height,HEIGHT,F,F
96,Height/length units,HUNITS,E,F
97,Horizontal accuracy,HORACC,F,F
98,Horizontal clearance,HORCLR,F,F
99,Horizontal length,HORLEN,F,F
100,Horizontal width,HORWID,F,F
101,Ice factor,ICEFAC,F,F
102,Information,INFORM,S,F
103,Jurisdiction,JRSDTN,E,F
104,Justification - horizontal,$JUSTH,E,$
105,Justification - vertical,$JUSTV,E,$
106,Lifting capacity,LIFCAP,F,F
107,Light characteristic,LITCHR,E,F
108,Light visibility,LITVIS,L,F
109,Marks navigational - System of,MARSYS,E,F
110,Multiplicity of lights,MLTYLT,I,F
111,Nationality,NATION,A,F
112,Nature of construction,NATCON,L,F
113,Nature of surface,NATSUR,L,F
114,Nature of surface - qualifying terms,NATQUA,L,F
115,Notice to Mariners date,NMDATE,A,F
116,Object name,OBJNAM,S,F
117,Orientation,ORIENT,F,F
118,Periodic date end,PEREND,A,F
119,Periodic date start,PERSTA,A,F
120,Pictorial representation,PICREP,S,F
121,Pilot district,PILDST,S,F
122,Producing country,PRCTRY,A,F
123,Product,PRODCT,L,F
124,Publication reference,PUBREF,S,F
125,Quality of sounding measurement,QUASOU,L,F
126,Radar wave length,RADWAL,A,F
127,Radius,RADIUS,F,F
128,Recording date,RECDAT,A,F
129,Recording indication,RECIND,A,F
130,Reference year for magnetic variation,RYRMGV,A,F
131,Restriction,RESTRN,L,F
132,Scale maximum,SCAMAX,I,F
133,Scale minimum,SCAMIN,I,F
134,Scale value one,SCVAL1,I,F
135,Scale value two,SCVAL2,I,F
136,Sector limit one,SECTR1,F,F
137,Sector limit two,SECTR2,F,F
138,Shift parameters,SHIPAM,A,F
139,Signal frequency,SIGFRQ,I,F
140,Signal generation,SIGGEN,E,F
141,Signal group,SIGGRP,A,F
142,Signal period,SIGPER,F,F
143,Signal sequence,SIGSEQ,A,F
144,Sounding accuracy,SOUACC,F,F
145,Sounding distance - maximum,SDISMX,I,F
146,Sounding distance - minimum,SDISMN,I,F
147,Source date,SORDAT,A,F
148,Source indication,SORIND,A,F
149,Status,STATUS,L,F
150,Survey authority,SURATH,S,F
151,Survey date - end,SUREND,A,F
152,Survey date - start,SURSTA,A,F
153,Survey type,SURTYP,L,F
154,Symbol scaling factor,$SCALE,F,$
155,Symbolization code,$SCODE,A,$
156,Technique of sounding measurement,TECSOU,L,F
157,Text string,$TXSTR,S,$
158,Textual description,TXTDSC,S,F
159,Tidal stream - panel values,TS_TSP,A,F
160,"Tidal stream, current - time series values",TS_TSV,A,F
161,Tide - accuracy of water level,T_ACWL,E,F
162,Tide - high and low water values,T_HWLW,A,F
163,Tide - method of tidal prediction,T_MTOD,E,F
164,Tide - time and height differences,T_THDF,A,F
165,"Tide, current - time interval of values",T_TINT,I,F
166,Tide - time series values,T_TSVL,A,F
167,Tide - value of harmonic constituents,T_VAHC,A,F
168,Time end,TIMEND,A,F
169,Time start,TIMSTA,A,F
170,Tint,$TINTS,E,$
171,Topmark/daymark shape,TOPSHP,E,F
172,Traffic flow,TRAFIC,E,F
173,Value of annual change in magnetic variation,VALACM,F,F
174,Value of depth contour,VALDCO,F,F
175,Value of local magnetic anomaly,VALLMA,F,F
176,Value of magnetic variation,VALMAG,F,F
177,Value of maximum range,VALMXR,F,F
178,Value of nominal range,VALNMR,F,F
179,Value of sounding,VALSOU,F,F
180,Vertical accuracy,VERACC,F,F
181,Vertical clearance,VERCLR,F,F
182,"Vertical clearance, closed",VERCCL,F,F
183,"Vertical clearance, open",VERCOP,F,F
184,"Vertical clearance, safe",VERCSA,F,F
185,Vertical datum,VERDAT,E,F
186,Vertical length,VERLEN,F,F
187,Water level effect,WATLEV,E,F
188,Category of Tidal stream,CAT_TS,E,F
189,Positional accuracy units,PUNITS,E,F
190,Object class definition,CLSDEF,S,F
191,Object class name,CLSNAM,S,F
192,Symbol instruction,SYMINS,S,F
300,Information in national language,NINFOM,S,N
301,Object name in national language,NOBJNM,S,N
302,Pilot district in national language,NPLDST,S,N
303,Text string in national language,$NTXST,S,N
304,Textual description in national language,NTXTDS,S,N
400,Horizontal datum,HORDAT,E,S
401,Positional Accuracy,POSACC,F,S
402,Quality of position,QUAPOS,E,S
0,"###Codes in the 17xxx range come from past s57attributes_iw.csv (Inland Waterways)",###,S,F
17000,Category of Anchorage area,catach,L,F
17001,Category of distance mark,catdis,E,F
17002,Category of signal station trafficcatsit,catsit,L,F
17003,Category of signal station warning,catsiw,L,F
17004,Restriction,restrn,L,F
17005,Vertical datum,verdat,E,F
17006,Category of bridge,catbrg,L,F
17007,Category of ferry,catfry,L,F
17008,Category of harbour facilities,cathaf,L,F
17009,"Marks navigational  System of",marsys,E,F
17050,Additional mark,addmrk,L,F
17051,Category of bank,catbnk,E,F
17052,Category of notice mark,catnmk,E,F
17055,Class of dangerous cargo,clsdng,E,F
17056,Direction of impact,dirimp,L,F
17057,Distance from bank,disbk1,F,F
17058,Distance from bank,disbk2,F,F
17059,"Distance of impact, upstream",disipu,F,F
17060,"Distance of impact, downstream",disipd,F,F
17061,Elevation 1,eleva1,F,F
17062,Elevation 2,eleva2,F,F
17063,Function of notice mark,fnctnm,E,F
17064,Waterway distance,wtwdis,F,F
17065,Bunker vessel,bunves,E,F
17066,Category of berth,catbrt,L,F
17067,Category of bunker,catbun,L,F
17068,Category of CEMT class,catccl,L,F
17069,Category of communication,catcom,L,F
17070,Category of harbour area,cathbr,L,F
17071,Category of refuse dump,catrfd,L,F
17072,Category of terminal,cattml,L,F
17073,Communication,comctn,S,F
17074,"Horizontal clearance, length",horcll,F,F
17075,"Horizontal clearance, width",horclw,F,F
17076,Transshipping goods,trshgd,L,F
17077,UN Location Code,unlocd,S,F
17112,Category of waterway mark,catwwm,E,F
0,"###Codes in the 20xxx and 22xxx range come from past s57attributes_aml.csv (Additional_Military_Layers)",###,S,F
20484,"Abandonment Date","databa","A","?"
20485,"Attenuation","attutn","F","?"
20486,"Beam of Vessel","vesbem","F","?"
20487,"Bearing","bearng","F","?"
20488,"Blind Zone","blndzn","A","?"
20489,"Breaker Type","brktyp","E","?"
20490,"Density","bulkdn","F","?"
20491,"Burial Mechanism","brmchm","E","?"
20492,"Burial Percentage","brpctg","I","?"
20493,"Burial Period","brperd","I","?"
20494,"Burial Probability","brprob","E","?"
20495,"Cardinal Point Orientation","orcard","E","?"
20496,"Category of administration area","catadm","E","?"
20497,"Category of airspace restriction","catasr","E","?"
20498,"Category of bedrock","N/A","N/A","?"
20499,"Bottom Feature Classification","catbot","E","?"
20500,"Category of coastguard station","catcgs","E","?"
20501,"Category of controlled airspace","catcas","E","?"
20502,"Fishing Activity","catfsh","E","?"
20503,"Type of Imagery","catimg","L","?"
20504,"Category of marine management area","catmma","E","?"
20505,"Category of maritime safety information","catmsi","E","?"
20506,"Category of military exercise airspace ","catmea","E","?"
20507,"Category of patrol area","catpat","E","?"
20508,"Category of reporting/radio calling-in point","catrep","E","?"
20509,"Category of regulated airspace","N/A","N/A","?"
20510,"Category of territorial sea baseline","catsbl","E","?"
20511,"Trafficability","cattrf","E","?"
20512,"Command System","comsys","S","?"
20515,"Controlled airspace class designation","caircd","E","?"
20516,"Controlling authority","authty","S","?"
20517,"Current Scour Dimensions","scrdim","A","?"
20518,"Dangerous Marine and Land Life","dgmrlf","L","?"
20519,"Date Sunk","datsnk","A","?"
20520,"Debris Field","debfld","A","?"
20521,"Depth of Activity","depact","F","?"
20522,"Depth of Layer","deplyr","F","?"
20523,"Distance from Small Bottom Object","discon","F","?"
20524,"Diver’s Thrust Test Depth","dttdep","E","?"
20525,"Diver’s Thrust Test Number","dttnum","I","?"
20526,"Diving Activity","divact","E","?"
20527,"Draught of Vessel","vesdgh","F","?"
20528,"Exit Usability","exitus","E","?"
20529,"Field Name","fldnam","S","?"
20530,"First Detection Year","datfir","A","?"
20531,"First Sensor","senfir","E","?"
20532,"First Source","sorfir","E","?"
20533,"Foliar Index","folinx","F","?"
20534,"Gas Content","gascon","I","?"
20535,"General Water Depth","gendep","I","?"
20536,"Gradient","gradnt","E","?"
20537,"Grain Size","grnsiz","F","?"
20538,"Inclination","incltn","F","?"
20539,"Internal Data Record Identification Number","N/A","N/A","?"
20540,"Last Detection Year","datlst","A","?"
20541,"Last Sensor","senlst","E","?"
20542,"Last Source","sorlst","E","?"
20543,"Lay Platform","layptm","E","?"
20544,"Lay Reference Number","layrfn","S","?"
20545,"Lay Time","laytim","A","?"
20546,"Layer Number","laynum","I","?"
20547,"Legal Status","legsta","S","?"
20548,"Length of Vessel","veslen","F","?"
20549,"Magnetic Anomaly Detector (MAD) Signature","madsig","E","?"
20550,"Magnetic Intensity","magint","I","?"
20551,"Mean Shear Strength","msstrg","F","?"
20552,"Migration Direction","migdir","I","?"
20553,"Migration Speed","migspd","F","?"
20554,"Milec Density","milden","E","?"
20555,"Mine Index Mine Case","mnimnc","E","?"
20556,"Mine Index Mine Type","mnimnt","L","?"
20557,"Mine Reference Number","minern","S","?"
20558,"Mine-Hunting Classification","mhclas","E","?"
20559,"Minehunting System","mnhsys","S","?"
20560,"Minesweeping System","mnssys","S","?"
20561,"Mission Classification","miscls","E","?"
20562,"Mission Comments","miscom","S","?"
20563,"Mission Date","misdat","A","?"
20564,"Mission Name","misnme","S","?"
20565,"MWDC Reference Number","mwdcrn","S","?"
20566,"Nature of Geological Layer","natsed","E","?"
20567,"Navigation System","navsys","S","?"
20568,"NOMBO Density","nomden","E","?"
20569,"Not Found","notfnd","S","?"
20570,"Number of Previous Observations","nmprob","I","?"
20571,"Operator","oprtor","S","?"
20572,"Orientation of Best Observation","orbobn","F","?"
20573,"Origin of Data","orgdat","E","?"
20574,"Originator","orgntr","S","?"
20575,"Porosity","porsty","I","?"
20576,"Quality of Beach Data","quabch","A","?"
20577,"Re-entered Date","datren","A","?"
20578,"Re-suspended Date","datres","A","?"
20579,"Reverberation","revebn","E","?"
20580,"Safety Zone","N/A","N/A","?"
20581,"Sample Retained","samret","S","?"
20582,"Seabed Coverage","sbdcov","I","?"
20583,"Ships Speed","shpspd","F","?"
20584,"Sonar Frequency","snrfrq","E","?"
20585,"Sonar Range Scale","snrrsc","F","?"
20586,"Sonar Reflectivity","snrflc","E","?"
20587,"Sonar Signal Strength","sonsig","E","?"
20588,"Sound Velocity","sndvel","F","?"
20589,"Sounding Datum","soudat","E","?"
20590,"Spudded Date","datspd","A","?"
20592,"Steepest Face Orientation","stfotn","F","?"
20593,"Strength According to Richter Scale","ricsca","I","?"
20594,"Strength of Magnetic Anomaly","magany","E","?"
20595,"Suitability for ACV Use","stbacv","E","?"
20596,"Surf Height","srfhgt","F","?"
20597,"Surf Zone","srfzne","I","?"
20598,"Survey Date and Time","surdat","A","?"
20599,"Suspension Date","datsus","A","?"
20600,"Swell Height","swlhgt","F","?"
20601,"Tidal Range","tdlrng","F","?"
20602,"Time of Year","timeyr","L","?"
20603,"Tonnage","tonage","I","?"
20604,"Towed Body Depth","twdbdp","F","?"
20605,"Type of military activity","milact","L","?"
20606,"Type of Tonnage","typton","E","?"
20607,"Type of Wreck","typewk","E","?"
20608,"Underwater Reference Mark","unwrfm","E","?"
20609,"Unique ID from a Navigational Product","N/A","N/A","?"
20610,"Water Clarity","watclr","F","?"
20611,"Wavelength","wavlen","F","?"
20612,"Weight Bearing Capability","wbrcap","I","?"
20613,"Width (left)","lftwid","F","?"
20614,"Width (right)","rgtwid","F","?"
20615,"Contour Type","hypcat","E","?"
20616,"Sounding Velocity","souvel","E","?"
20617,"Access Restriction","accres","S","?"
20618,"Approach","apprch","S","?"
20619,"Category of Beach","catbch","E","?"
20620,"Clearance Percentage","clperc","I","?"
20621,"Communications","commns","L","?"
20622,"Confidence Level","conlev","F","?"
20624,"Exit Description","extdes","S","?"
20625,"Industry","indtry","S","?"
20626,"Landing Conditions","lndcon","S","?"
20627,"Leisure Activity","lsract","S","?"
20628,"Logistics","logtcs","L","?"
20629,"Manoeuvring","manvrg","S","?"
20630,"Mine Threat Density","mntden","I","?"
20631,"Multiple Contacts","mulcon","I","?"
20632,"Navigational Description","navdes","S","?"
20633,"Navigational Difficulty","navdif","E","?"
20634,"Number of Remaining Mines","numrmn","I","?"
20635,"Pier Contact Details","pierod","S","?"
20636,"Pier Description","pierdn","S","?"
20637,"Prairies Density","prsden","I","?"
20638,"Probability for Remaining Mines","prbrmn","F","?"
20639,"Remaining Mines Likely, Maximum Number","rmnlmn","I","?"
20640,"Self Protection (Air)","sfptna","E","?"
20641,"Self Protection (Near Defence)","sptnnd","E","?"
20642,"Self Protection (Surface)","sfptns","E","?"
20643,"Sensor Coverage","sencov","S","?"
20644,"Simple Initial Threat","sminth","F","?"
20645,"Target Reference Weight","tgrfwt","E","?"
20646,"Tidal Type","tdltyp","E","?"
20647,"Type of Resource Location","typres","E","?"
20648,"Undetectable Mines Ratio","undmnr","F","?"
20649,"Undetectable Mines Ratio with Burial","umnrwb","F","?"
20650,"Undetectable Mines Ratio without Burial","umrwob","F","?"
20651,"Weapon Coverage","wpncov","S","?"
20652,"On Sonar","onsonr","E","?"
20653,"HF Bottom Loss","hfbmls","F","?"
20654,"LF Bottom Loss","lfbmls","F","?"
20655,"Detection Probability","dtprob","F","?"
20656,"Disposal Probability","dsprob","F","?"
20657,"Classification Probability","clprob","F","?"
20658,"Characteristic Detection Width (A)","cswidt","I","?"
20659,"Characteristic Detection Probability (B)","csprob","F","?"
20660,"Zone Colour","znecol","E","?"
20661,"Reverberation Frequency","revfqy","F","?"
20662,"Reverberation Grazing Angle","revgan","F","?"
20663,"International Defence Organisation (IDO) status","secido","E","?"
20664,"Protective Marking","secpmk","E","?"
20665,"Owner Authority","secown","S","?"
20666,"Caveat ","seccvt","S","?"
20667,"Species","spcies","S","?"
20668,"Swept date","swpdat","A","?"
20669,"Runway length","rwylen","I","?"
20670,"Active period","actper","S","?"
20671,"Maximum altitude","maxalt","I","?"
20672,"Minimum altitude","minalt","I","?"
20673,"Maximum Flight Level","maxftl","I","?"
20674,"Minimum Flight Level","minftl","I","?"
20675,"Bottom Vertical Safety Separation","bverss","I","?"
20676,"Minimum Safe Depth","mindep","I","?"
20677,"Interpolated line characteristic","linech","E","?"
20678,"Identification","identy","S","?"
20679,"Route Classification","rclass","E","?"
20680,"Population","popltn","I","?"
20681,"Surface Threat","surtht","E","?"
20682,"Heading-Up Bearing","upbear","F","?"
20683,"Heading-Down Bearing","dnbear","F","?"
20684,"Ice Concentration","icencn","I","?"
20685,"Danger height","dgrhgt","I","?"
20686,"Depth Restriction","depres","S","?"
20687,"Area Category","arecat","E","?"
20688,"Existence of Restricted Area","exzres","E","?"
20689,"Target Strength","tarstg","I","?"
20690,"Qualification of Radar Coverage","quarad","I","?"
20691,"Contact Details","condet","S","?"
20692,"Limit of Anchors and Chains","limanc","F","?"
20693,"CCM Index","ccmidx","I","?"
20694,"Military Load Classification","mlclas","E","?"
20695,"MGS Type","mgstyp","E","?"
20696,"Ice Attribute Concentration Total","iceact","E","?"
20697,"Ice Stage of Development","icesod","E","?"
20698,"Ice Advisory Code","iceadc","S","?"
20699,"Number of Icebergs in Area","icebnm","I","?"
20700,"Ice Line Category","icelnc","E","?"
20701,"Ice Polynya Type","icepty","E","?"
20702,"Ice Polynya Status","icepst","E","?"
20703,"Ice Lead Type","icelty","E","?"
20704,"Ice Lead Status","icelst","E","?"
20705,"Iceberg Size","icebsz","E","?"
20706,"Iceberg Shape","icebsh","E","?"
20707,"Icedrift or Iceberg Direction","icebdr","E","?"
20708,"Icedrift or Iceberg Speed","icebsp","F","?"
20709,"Maximum Ice Thickness","icemax","F","?"
20710,"Minimum Ice Thickness","icemin","F","?"
20711,"Ice Ridge Development","icerdv","E","?"
20712,"Land Ice","icelnd","E","?"
20713,"Sea Direction","seadir","E","?"
20714,"Traffic density","traden","S","?"
20715,"Type of shipping","typshp","L","?"
20716,"Ice Coverage Type","icecvt","E","?"
20718,"Status of Small Bottom Object","staobj","L","?"
20719,"ICAO code","icaocd","S","?"
20720,"textual description","txtdes","S","?"
20721,"Object Reference Number","objtrn","S","?"
20722,"Object Shape","objshp","S","?"
22484,"Category of completeness","catcnf","E","?"
22485,"Error Ellipse","errell","A","?"
22486,"Object classes","N/A","N/A","?"
22487,"Security classification","N/A","N/A","?"
22488,"Vertical Datum Shift Parameter","vershf","F","?"
22489,"Absolute Vertical Accuracy","elvacc","F","?"
22490,"Reflection Coefficient","reflco","F","?"
22491,"Copyright statement","cpyrit","S","?"
0,"###40000 comes from past s57attributes_iw.csv (Inland Waterways)",###,S,F
40000,Update message,updmsg,S,F
`,tn=`"Code","ObjectClass","Acronym","Attribute_A","Attribute_B","Attribute_C","Class","Primitives"
1,Administration area (Named),ADMARE,JRSDTN;NATION;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
2,Airport / airfield,AIRARE,CATAIR;CONDTN;CONVIS;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
3,Anchor berth,ACHBRT,CATACH;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RADIUS;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
4,Anchorage area,ACHARE,CATACH;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
5,"Beacon, cardinal",BCNCAR,BCNSHP;CATCAM;COLOUR;COLPAT;CONDTN;CONVIS;CONRAD;DATEND;DATSTA;ELEVAT;HEIGHT;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
6,"Beacon, isolated danger",BCNISD,BCNSHP;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ELEVAT;HEIGHT;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
7,"Beacon, lateral",BCNLAT,BCNSHP;CATLAM;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ELEVAT;HEIGHT;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
8,"Beacon, safe water",BCNSAW,BCNSHP;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ELEVAT;HEIGHT;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
9,"Beacon, special purpose/general",BCNSPP,BCNSHP;CATSPM;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ELEVAT;HEIGHT;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
10,Berth,BERTHS,DATEND;DATSTA;DRVAL1;NOBJNM;OBJNAM;PEREND;PERSTA;QUASOU;SOUACC;STATUS;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
11,Bridge,BRIDGE,CATBRG;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HORACC;HORCLR;NATCON;NOBJNM;OBJNAM;VERACC;VERCCL;VERCLR;VERCOP;VERDAT;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
12,"Building, single",BUISGL,BUISHP;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;ELEVAT;FUNCTN;HEIGHT;NATCON;NOBJNM;OBJNAM;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
13,Built-up area,BUAARE,CATBUA;CONDTN;CONRAD;CONVIS;HEIGHT;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
14,"Buoy, cardinal",BOYCAR,BOYSHP;CATCAM;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
15,"Buoy, installation",BOYINB,BOYSHP;CATINB;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;PRODCT;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
16,"Buoy, isolated danger",BOYISD,BOYSHP;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
17,"Buoy, lateral",BOYLAT,BOYSHP;CATLAM;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
18,"Buoy, safe water",BOYSAW,BOYSHP;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
19,"Buoy, special purpose/general",BOYSPP,BOYSHP;CATSPM;COLOUR;COLPAT;CONRAD;DATEND;DATSTA;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
20,Cable area,CBLARE,CATCBL;DATEND;DATSTA;NOBJNM;OBJNAM;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
21,"Cable, overhead",CBLOHD,CATCBL;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ICEFAC;NOBJNM;OBJNAM;STATUS;VERACC;VERCLR;VERCSA;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
22,"Cable, submarine",CBLSUB,BURDEP;CATCBL;CONDTN;DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;STATUS;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
23,Canal,CANALS,CATCAN;CONDTN;DATEND;DATSTA;HORACC;HORCLR;HORWID;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
24,Canal bank,CANBNK,CONDTN;DATEND;DATSTA;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
25,Cargo transshipment area,CTSARE,DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
26,Causeway,CAUSWY,CONDTN;NATCON;NOBJNM;OBJNAM;STATUS;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
27,Caution area,CTNARE,DATEND;DATSTA;PEREND;PERSTA;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
28,Checkpoint,CHKPNT,CATCHP;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
29,Coastguard station,CGUSTA,DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
30,Coastline,COALNE,CATCOA;COLOUR;CONRAD;CONVIS;ELEVAT;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
31,Contiguous zone,CONZNE,DATEND;DATSTA;NATION;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
32,Continental shelf area,COSARE,NATION;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
33,Control point,CTRPNT,CATCTR;DATEND;DATSTA;ELEVAT;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
34,Conveyor,CONVYR,CATCON;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;LIFCAP;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERCLR;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
35,Crane,CRANES,CATCRN;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;HEIGHT;LIFCAP;NOBJNM;OBJNAM;ORIENT;RADIUS;STATUS;VERACC;VERCLR;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
36,Current - non - gravitational,CURENT,CURVEL;DATEND;DATSTA;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;,INFORM;NINFOM;SCAMAX;SCAMIN;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
37,Custom zone,CUSZNE,NATION;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
38,Dam,DAMCON,CATDAM;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;NATCON;NOBJNM;OBJNAM;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
39,Daymark,DAYMAR,CATSPM;COLOUR;COLPAT;DATEND;DATSTA;ELEVAT;HEIGHT;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;TOPSHP;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
40,Deep water route centerline,DWRTCL,CATTRK;DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;ORIENT;QUASOU;SOUACC;STATUS;TECSOU;TRAFIC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
41,Deep water route part,DWRTPT,DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;ORIENT;QUASOU;SOUACC;STATUS;TECSOU;TRAFIC;VERDAT;RESTRN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
42,Depth area,DEPARE,DRVAL1;DRVAL2;QUASOU;SOUACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
43,Depth contour,DEPCNT,VALDCO;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;hypcat;,G,Line;
44,Distance mark,DISMAR,CATDIS;DATEND;DATSTA;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
45,Dock area,DOCARE,CATDOC;CONDTN;DATEND;DATSTA;HORACC;HORCLR;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
46,Dredged area,DRGARE,DRVAL1;DRVAL2;NOBJNM;OBJNAM;QUASOU;RESTRN;SOUACC;TECSOU;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
47,Dry dock,DRYDOC,CONDTN;HORACC;HORCLR;HORLEN;HORWID;NOBJNM;OBJNAM;STATUS;DRVAL1;QUASOU;SOUACC;VERDAT;,INFORM;NINFOM;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
48,Dumping ground,DMPGRD,CATDPG;NOBJNM;OBJNAM;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
49,Dyke,DYKCON,CONDTN;CONRAD;DATEND;DATSTA;HEIGHT;NATCON;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
50,Exclusive Economic Zone,EXEZNE,NATION;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
51,Fairway,FAIRWY,DATEND;DATSTA;DRVAL1;NOBJNM;OBJNAM;ORIENT;QUASOU;RESTRN;SOUACC;STATUS;TRAFIC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
52,Fence/wall,FNCLNE,CATFNC;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;ELEVAT;HEIGHT;NATCON;NOBJNM;OBJNAM;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
53,Ferry route,FERYRT,CATFRY;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
54,Fishery zone,FSHZNE,NATION;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
55,Fishing facility,FSHFAC,CATFIF;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
56,Fishing ground,FSHGRD,NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
57,Floating dock,FLODOC,COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;DRVAL1;HORACC;HORCLR;HORLEN;HORWID;LIFCAP;NOBJNM;OBJNAM;STATUS;VERACC;VERLEN;VERDAT;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
58,Fog signal,FOGSIG,CATFOG;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;SIGFRQ;SIGGEN;SIGGRP;SIGPER;SIGSEQ;STATUS;VALMXR;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
59,Fortified structure,FORSTC,CATFOR;CONDTN;CONRAD;CONVIS;HEIGHT;NATCON;NOBJNM;OBJNAM;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
60,Free port area,FRPARE,NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
61,Gate,GATCON,CATGAT;CONDTN;DRVAL1;HORACC;HORCLR;NATCON;NOBJNM;OBJNAM;QUASOU;SOUACC;STATUS;VERACC;VERCLR;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
62,Gridiron,GRIDRN,HORACC;HORLEN;HORWID;NATCON;NOBJNM;OBJNAM;STATUS;VERACC;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
63,Harbour area (administrative),HRBARE,NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
64,Harbour facility,HRBFAC,CATHAF;CONDTN;DATEND;DATSTA;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
65,Hulk,HULKES,CATHLK;COLOUR;COLPAT;CONRAD;CONVIS;HORACC;HORLEN;HORWID;NOBJNM;OBJNAM;VERACC;VERLEN;CONDTN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
66,Ice area,ICEARE,CATICE;CONVIS;ELEVAT;HEIGHT;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
67,Incineration area,ICNARE,NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
68,Inshore traffic zone,ISTZNE,CATTSS;DATEND;DATSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
69,Lake,LAKARE,ELEVAT;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
70,Lake shore,LAKSHR,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
71,Land area,LNDARE,CONDTN;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
72,Land elevation,LNDELV,CONVIS;ELEVAT;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;
73,Land region,LNDRGN,CATLND;NATQUA;NATSUR;NOBJNM;OBJNAM;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
74,Landmark,LNDMRK,CATLMK;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;ELEVAT;FUNCTN;HEIGHT;NATCON;NOBJNM;OBJNAM;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
75,Light,LIGHTS,CATLIT;COLOUR;DATEND;DATSTA;EXCLIT;HEIGHT;LITCHR;LITVIS;MARSYS;MLTYLT;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;SECTR1;SECTR2;SIGGRP;SIGPER;SIGSEQ;STATUS;VERACC;VALNMR;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
76,Light float,LITFLT,COLOUR;COLPAT;CONRAD;CONVIS;DATEND;DATSTA;HORACC;HORLEN;HORWID;MARSYS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
77,Light vessel,LITVES,COLOUR;COLPAT;CONRAD;CONVIS;DATEND;DATSTA;HORACC;HORLEN;HORWID;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
78,Local magnetic anomaly,LOCMAG,NOBJNM;OBJNAM;VALLMA;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
79,Lock basin,LOKBSN,DATEND;DATSTA;HORACC;HORCLR;HORLEN;HORWID;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
80,Log pond,LOGPON,NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
81,Magnetic variation,MAGVAR,DATEND;DATSTA;RYRMGV;VALACM;VALMAG;,INFORM;NINFOM;SCAMAX;SCAMIN;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
82,Marine farm/culture,MARCUL,CATMFA;DATEND;DATSTA;EXPSOU;NOBJNM;OBJNAM;PEREND;PERSTA;QUASOU;RESTRN;SOUACC;STATUS;VALSOU;VERACC;VERDAT;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
83,Military practice area,MIPARE,CATMPA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
84,Mooring/warping facility,MORFAC,BOYSHP;CATMOR;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERDAT;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
85,Navigation line,NAVLNE,CATNAV;DATEND;DATSTA;ORIENT;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
86,Obstruction,OBSTRN,CATOBS;CONDTN;EXPSOU;HEIGHT;NATCON;NATQUA;NOBJNM;OBJNAM;PRODCT;QUASOU;SOUACC;STATUS;TECSOU;VALSOU;VERACC;VERDAT;VERLEN;WATLEV;NATSUR;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
87,Offshore platform,OFSPLF,CATOFP;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;NATCON;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
88,Offshore production area,OSPARE,CATPRA;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;NOBJNM;OBJNAM;PRODCT;RESTRN;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
89,Oil barrier,OILBAR,CATOLB;CONDTN;DATEND;DATSTA;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
90,Pile,PILPNT,CATPLE;COLOUR;COLPAT;CONDTN;CONVIS;DATEND;DATSTA;HEIGHT;NOBJNM;OBJNAM;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
91,Pilot boarding place,PILBOP,CATPIL;COMCHA;DATEND;DATSTA;NOBJNM;NPLDST;OBJNAM;PEREND;PERSTA;PILDST;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
92,Pipeline area,PIPARE,CONDTN;DATEND;DATSTA;NOBJNM;OBJNAM;PRODCT;RESTRN;STATUS;CATPIP;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
93,"Pipeline, overhead",PIPOHD,CATPIP;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERCLR;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
94,"Pipeline, submarine/on land",PIPSOL,BURDEP;CATPIP;CONDTN;DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERLEN;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;
95,Pontoon,PONTON,CONDTN;CONRAD;CONVIS;DATEND;DATSTA;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
96,Precautionary area,PRCARE,DATEND;DATSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
97,Production / storage area,PRDARE,CATPRA;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ELEVAT;HEIGHT;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
98,Pylon/bridge support,PYLONS,CATPYL;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;NATCON;NOBJNM;OBJNAM;VERACC;VERDAT;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
99,Radar line,RADLNE,NOBJNM;OBJNAM;ORIENT;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
100,Radar range,RADRNG,COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
101,Radar reflector,RADRFL,HEIGHT;STATUS;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
102,Radar station,RADSTA,CATRAS;DATEND;DATSTA;HEIGHT;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;VALMXR;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
103,Radar transponder beacon,RTPBCN,CATRTB;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RADWAL;SECTR1;SECTR2;SIGGRP;SIGSEQ;STATUS;VALMXR;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
104,Radio calling-in point,RDOCAL,COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;STATUS;TRAFIC;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;
105,Radio station,RDOSTA,CALSGN;CATROS;COMCHA;DATEND;DATSTA;ESTRNG;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;SIGFRQ;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
106,Railway,RAILWY,CONDTN;HEIGHT;NOBJNM;OBJNAM;STATUS;VERACC;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
107,Rapids,RAPIDS,NOBJNM;OBJNAM;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
108,Recommended route centerline,RCRTCL,CATTRK;DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;QUASOU;SOUACC;STATUS;TECSOU;TRAFIC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
109,Recommended track,RECTRC,CATTRK;DATEND;DATSTA;DRVAL1;DRVAL2;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;QUASOU;SOUACC;STATUS;TECSOU;TRAFIC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
110,Recommended Traffic Lane Part,RCTLPT,DATEND;DATSTA;ORIENT;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
111,Rescue station,RSCSTA,CATRSC;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;SCAMAX;SCAMIN;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
112,Restricted area,RESARE,CATREA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
113,Retro-reflector,RETRFL,COLOUR;COLPAT;DATEND;DATSTA;HEIGHT;MARSYS;PEREND;PERSTA;STATUS;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
114,River,RIVERS,NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
115,River bank,RIVBNK,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
116,Road,ROADWY,CATROD;CONDTN;NATCON;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
117,Runway,RUNWAY,CATRUN;CONDTN;CONVIS;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
118,Sand waves,SNDWAV,VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
119,Sea area / named water area,SEAARE,CATSEA;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
120,Sea-plane landing area,SPLARE,NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
121,Seabed area,SBDARE,COLOUR;NATQUA;NATSUR;WATLEV;OBJNAM;NOBJNM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
122,Shoreline Construction,SLCONS,CATSLC;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HEIGHT;HORACC;HORCLR;HORLEN;HORWID;NATCON;NOBJNM;OBJNAM;STATUS;VERACC;VERDAT;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
123,"Signal station, traffic",SISTAT,CATSIT;COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
124,"Signal station, warning",SISTAW,CATSIW;COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
125,Silo / tank,SILTNK,BUISHP;CATSIL;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;ELEVAT;HEIGHT;NATCON;NOBJNM;OBJNAM;PRODCT;STATUS;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
126,Slope topline,SLOTOP,CATSLO;COLOUR;CONRAD;CONVIS;ELEVAT;NATCON;NATQUA;NATSUR;NOBJNM;OBJNAM;VERACC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
127,Sloping ground,SLOGRD,CATSLO;COLOUR;CONRAD;CONVIS;NATCON;NATQUA;NATSUR;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
128,Small craft facility,SMCFAC,CATSCF;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
129,Sounding,SOUNDG,EXPSOU;NOBJNM;OBJNAM;QUASOU;SOUACC;TECSOU;VERDAT;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
130,Spring,SPRING,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
131,Square,SQUARE,CONDTN;NATCON;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
132,Straight territorial sea baseline,STSLNE,NATION;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
133,Submarine transit lane,SUBTLN,NOBJNM;OBJNAM;RESTRN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
134,Swept Area,SWPARE,DRVAL1;QUASOU;SOUACC;TECSOU;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
135,Territorial sea area,TESARE,NATION;RESTRN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
136,Tidal stream - harmonic prediction,TS_PRH,NOBJNM;OBJNAM;T_MTOD;T_VAHC;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
137,Tidal stream - non-harmonic prediction,TS_PNH,NOBJNM;OBJNAM;T_MTOD;T_THDF;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
138,Tidal stream panel data,TS_PAD,NOBJNM;OBJNAM;TS_TSP;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
139,Tidal stream - time series,TS_TIS,NOBJNM;OBJNAM;STATUS;TIMEND;TIMSTA;T_TINT;TS_TSV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
140,Tide - harmonic prediction,T_HMON,NOBJNM;OBJNAM;T_ACWL;T_MTOD;T_VAHC;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
141,Tide - non-harmonic prediction,T_NHMN,NOBJNM;OBJNAM;T_ACWL;T_MTOD;T_THDF;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
142,Tidal stream - time series,T_TIMS,NOBJNM;OBJNAM;T_HWLW;T_TINT;T_TSVL;TIMEND;TIMSTA;STATUS;T_ACWL;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
143,Tideway,TIDEWY,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;
144,Top mark,TOPMAR,COLOUR;COLPAT;DATEND;DATSTA;HEIGHT;MARSYS;PEREND;PERSTA;STATUS;TOPSHP;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
145,Traffic Separation Line,TSELNE,CATTSS;DATEND;DATSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
146,Traffic Separation Scheme  Boundary,TSSBND,CATTSS;DATEND;DATSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
147,Traffic Separation Scheme Crossing,TSSCRS,CATTSS;DATEND;DATSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
148,Traffic Separation Scheme  Lane part,TSSLPT,CATTSS;DATEND;DATSTA;ORIENT;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
149,Traffic Separation Scheme  Roundabout,TSSRON,CATTSS;DATEND;DATSTA;RESTRN;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
150,Traffic Separation Zone,TSEZNE,CATTSS;DATEND;DATSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
151,Tunnel,TUNNEL,BURDEP;CONDTN;HORACC;HORCLR;NOBJNM;OBJNAM;STATUS;VERACC;VERCLR;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
152,Two-way route  part,TWRTPT,CATTRK;DATEND;DATSTA;DRVAL1;DRVAL2;ORIENT;QUASOU;SOUACC;STATUS;TECSOU;TRAFIC;VERDAT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
153,Underwater rock / awash rock,UWTROC,EXPSOU;NATSUR;NATQUA;NOBJNM;OBJNAM;QUASOU;SOUACC;STATUS;TECSOU;VALSOU;VERDAT;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;
154,Unsurveyed area,UNSARE,,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
155,Vegetation,VEGATN,CATVEG;CONVIS;ELEVAT;HEIGHT;NOBJNM;OBJNAM;VERACC;VERDAT;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
156,Water turbulence,WATTUR,CATWAT;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;Area;
157,Waterfall,WATFAL,CONVIS;NOBJNM;OBJNAM;VERACC;VERLEN;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Line;
158,Weed/Kelp,WEDKLP,CATWED;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
159,Wreck,WRECKS,CATWRK;CONRAD;CONVIS;EXPSOU;HEIGHT;NOBJNM;OBJNAM;QUASOU;SOUACC;STATUS;TECSOU;VALSOU;VERACC;VERDAT;VERLEN;WATLEV;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
160,Tidal stream - flood/ebb,TS_FEB,CAT_TS;CURVEL;DATEND;DATSTA;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Point;Area;
161,Archipelagix Sea Lane,ARCSLN,DATEND;DATSTA;NATION;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Area;
162,Archipelagix Sea Lane axis,ASLXIS,DATEND;DATSTA;NATION;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;
163,New object,NEWOBJ,CLSDEF;CLSNAM;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;NATION;NOBJNM;OBJNAM;PEREND;PERSTA;RESTRN;STATUS;WATLEV;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;SYMINS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,G,Line;Area;Point;
300,Accuracy of data,M_ACCY,HORACC;POSACC;SOUACC;VERACC;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
301,Compilation scale of data,M_CSCL,CSCALE;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
302,Coverage,M_COVR,CATCOV;,INFORM;NINFOM;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
303,Horizontal datum of data,M_HDAT,HORDAT;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
304,Horizontal datum shift parameters,M_HOPA,HORDAT;SHIPAM;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
305,Nautical publication information,M_NPUB,,INFORM;NINFOM;NTXTDS;PICREP;PUBREF;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
306,Navigational system of marks,M_NSYS,MARSYS;ORIENT;,INFORM;NINFOM;NTXTDS;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
307,Production information,M_PROD,AGENCY;CPDATE;NATION;NMDATE;PRCTRY;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
308,Quality of data,M_QUAL,CATQUA;CATZOC;DRVAL1;DRVAL2;POSACC;SOUACC;SUREND;SURSTA;TECSOU;VERDAT;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
309,Sounding datum,M_SDAT,VERDAT;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
310,Survey reliability,M_SREL,QUAPOS;QUASOU;SCVAL1;SCVAL2;SDISMN;SDISMX;SURATH;SUREND;SURSTA;SURTYP;TECSOU;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
311,Units of measurement of data,M_UNIT,DUNITS;HUNITS;PUNITS;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
312,Vertical datum of data,M_VDAT,VERDAT;,INFORM;NINFOM;NTXTDS;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,M,Area;
400,Aggregation,C_AGGR,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,C,
401,Association,C_ASSO,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,C,
402,Stacked on/stacked under,C_STAC,,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,C,
500,Cartographic area,$AREAS,COLOUR;ORIENT;$SCODE;$TINTS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,$,
501,Cartographic line,$LINES,$SCODE;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,$,
502,Cartographic symbol,$CSYMB,ORIENT;$SCALE;$SCODE;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,$,
503,Compass,$COMPS,$CSIZE;RYRMGV;VALACM;VALMAG;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,$,
504,Text,$TEXTS,$CHARS;COLOUR;$JUSTH;$JUSTV;$NTXST;$SPACE;$TXSTR;,INFORM;NINFOM;NTXTDS;PICREP;SCAMAX;SCAMIN;TXTDSC;,RECDAT;RECIND;SORDAT;SORIND;,$,
0,"###Codes in the 17xxx range come from past s57objectclasses_iw.csv (Inland Waterways)",,,,,,
17000,Anchor berth,achbrt,catach;clsdng;comctn;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;RADIUS;restrn;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Area;
17001,Anchorage area,achare,catach;clsdng;comctn;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;restrn;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Area;
17002,Canal bank,canbnk,catbnk;CONRAD;DATEND;DATSTA;NATSUR;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Line;
17003,Depth area,depare,DRVAL1;DRVAL2;eleva1;eleva2;wtwdis;QUASOU;SOUACC;verdat;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Line;Area;
17004,Distance mark,dismar,catdis;wtwdis;unlocd;DATEND;DATSTA;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17005,Restricted area,resare,CATREA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;restrn;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17006,River bank,rivbnk,catbnk;CONRAD;NATSUR;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Line;
17007,Signal station traffic,sistat,catsit;COMCHA;DATEND;DATSTA;dirimp;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17008,Signal station warning,sistaw,catsiw;COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17009,Top Mark,topmar,COLOUR;COLPAT;HEIGHT;marsys;STATUS;TOPSHP;VERACC;verdat;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17010,Berth berths,berths,catbrt;clsdng;comctn;DATEND;DATSTA;DRVAL1;NOBJNM;OBJNAM;PEREND;PERSTA;QUASOU;SOUACC;STATUS;trshgd;verdat;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Line;Area;
17011,"Bridge","bridge",catbrg;comctn;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;HORACC;HORCLR;NATCON;NOBJNM;OBJNAM;TIMEND;TIMSTA;VERACC;VERCCL;VERCLR;VERCOP;verdat;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Line;Area;
17012,Cable overhead,cblohd,CATCBL;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;ICEFAC;NOBJNM;OBJNAM;STATUS;VERACC;VERCLR;VERCSA;verdat;,INFORM;NINFOM;NTXTDS;SCAMIN;TXTDSC;updmsg;RECDAT;RECIND;,SORDAT;SORIND;,G,Line;
17013,Ferry route,feryrt,catfry;comctn;DATEND;DATSTA;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;TIMEND;TIMSTA;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Line;Area;
17014,Harbour Area,hrbare,cathbr;comctn;NOBJNM;OBJNAM;STATUS;unlocd;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17015,Harbour Facilities,hrbfac,cathaf;CONDTN;DATEND;DATSTA;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;,INFORM;NINFOM;NTXTDS;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Area;
17016,Lock Basin,lokbsn,HORACC;horcll;horclw;HORLEN;HORWID;NOBJNM;OBJNAM;STATUS;TIMEND;TIMSTA;,INFORM;NINFOM;NTXTDS;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17017,Radio calling-in point,rdocal,catcom;comctn;COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;ORIENT;PEREND;PERSTA;STATUS;TRAFIC;dirimp;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Line;
17018,Navigational system of marks,m_nsys,marsys;ORIENT;,INFORM;NINFOM;NTXTDS;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17050,Notice mark,notmrk,catnmk;fnctnm;dirimp;disipd;disipu;disbk1;disbk2;addmrk;marsys;ORIENT;CONDTN;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17051,Waterway axis,wtwaxs,catccl;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Line;
17052,Waterway profile,wtwprf,wtwdis;HEIGHT;verdat;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Line;
17053,Bridge area,brgare,comctn;NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17054,Bunker station,bunsta,bunves;catbun;comctn;NOBJNM;OBJNAM;TIMEND;TIMSTA;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17055,Communication Area,comare,catcom;COMCHA;DATEND;DATSTA;NOBJNM;OBJNAM;STATUS;TIMEND;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17056,Harbour Basin,hrbbsn,HORACC;HORLEN;HORWID;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17057,Lock area,lokare,comctn;NOBJNM;OBJNAM;STATUS;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17058,Lock basin part,lkbspt,HORACC;horcll;horclw;HORLEN;HORWID;NOBJNM;OBJNAM;STATUS;TIMEND;TIMSTA;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17059,Port Area,prtare,comctn;NOBJNM;OBJNAM;STATUS;unlocd;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Area;
17060,Beacon water-way,bcnwtw,BCNSHP;catwwm;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;dirimp;ELEVAT;HEIGHT;marsys;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERACC;verdat;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17061,Buoy water-way,boywtw,BOYSHP;catwwm;COLOUR;COLPAT;CONDTN;CONRAD;CONVIS;DATEND;DATSTA;marsys;NATCON;NOBJNM;OBJNAM;PEREND;PERSTA;STATUS;VERLEN;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17062,Refuse dump,refdmp,catrfd;comctn;NOBJNM;OBJNAM;STATUS;TIMEND;TIMSTA;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17063,Route planning point,rtplpt,NOBJNM;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;
17064,Terminal,termnl,cattml;comctn;NOBJNM;OBJNAM;STATUS;TIMEND;TIMSTA;trshgd;unlocd;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Area;
17065,Turning basin,trnbsn,HORCLR;NOBJNM;STATUS;OBJNAM;,INFORM;NINFOM;NTXTDS;PICREP;SCAMIN;TXTDSC;updmsg;,SORDAT;SORIND;,G,Point;Area;
0,"###Codes in the 20xxx and 21xxx range come from past s57objectclasses_aml.csv (Additional_Military_Layers)",,,,,,
20484,"ATS Route Centreline","atsctl","authty;linech;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20485,"Airspace Restriction","airres + catasr","authty;catasr;linech;maxalt;maxftl;minalt;minftl;NOBJNM;OBJNAM;HUNITS;VERDAT","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20486,"Area of Imagery Coverage","imgare","bearng;catimg;ELEVAT;HUNITS;orgntr;SUREND;VERDAT","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20487,"Beach Exit","bchext","ccmidx;exitus;gradnt;HORCLR;HORLEN;HORWID;HUNITS;VERCSA;wbrcap","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;L"
20488,"Beach Profile","bchprf","bearng;gradnt;SUREND","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20489,"Beach Survey","bchare","accres;brktyp;ccmidx;dgmrlf;HORLEN;HORWID;HUNITS;quabch;orgntr;srfhgt;srfzne;stbacv;SUREND;SURSTA;swlhgt;tdlrng;tdltyp","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P   A   "
20490,"Bedrock area","bedare","N/A","N/A",,"G","A"
20491,"Bottom Feature","botmft + catbot","catbot;DUNITS;gradnt;HORLEN;HORWID;HUNITS;migspd;migdir;NOBJNM;OBJNAM;ORIENT;soudat;stfotn;VALSOU;VERLEN;WATLEV;wavlen","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;L;A"
20492,"Centre Line","centre","N/A","N/A",,"G","L"
20494,"Contact History","histob","orgntr;surdat;SUREND","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20495,"Controlled airspace","ctlasp + catcas","authty;catcas;caircd;linech;maxalt;maxftl;minalt;minftl;NOBJNM;OBJNAM;HUNITS;VERDAT","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L;A"
20496,"Diving Location","divloc","depact;divact;DUNITS;OBJNAM;NOBJNM;timeyr;watclr","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20497,"Drinking Water Location","watloc","N/A","N/A",,"G","P"
20498,"Drop Zone","drpzne","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20499,"Environmentally Sensitive Area","envare","authty;legsta;OBJNAM;NOBJNM;PEREND;PERSTA","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A;P"
20500,"Fishing Activity Area","fshare","catfsh;STATUS;timeyr","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20501,"Impact Scour","iscour","datfir;datlst;depwat;DUNITS;gendep;HORLEN;HORWID;HUNITS;NATQUA;NATSUR;NOBJNM;OBJNAM;orcard;ORIENT;QUASOU;senfir;senlst;sonsig;sorfir;sorlst;SOUACC;soudat;STATUS;TECSOU;VALSOU;VERLEN;WATLEV","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20502,"Landing Area","lngare","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20503,"Landing Place","lndplc","gradnt;STATUS;wbrcap","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20504,"Landing Point","lndpnt","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20505,"Landing Site","lndste","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20506,"Landing Strip","lndstp","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20507,"Landing Zone","lndzne","apprch;extdes;lndcon;OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20508,"Marine management area","marman + catmma","actper;authty;catmma;identy;linech;NOBJNM;OBJNAM;NATION;spcies;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20509,"Maritime Safety Information area","msiare","catmsi;condet;NATION;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20510,"MCM Area","mcmare","mhclas;milden;nomden","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20511,"Military exercise airspace","mexasp + catmea","actper;authty;catmea;linech;maxalt;maxftl;minalt;minftl;NOBJNM;OBJNAM;HUNITS;VERDAT","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20513,"Patrol area","patare + catpat","authty;catpat;identy;linech;NOBJNM;OBJNAM;NATION;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20514,"Q-Route Leg","qroute","actper;dnbear;lftwid;NATION;NOBJNM;OBJNAM;rclass;rgtwid;STATUS;TRAFIC;HUNITS;upbear","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20515,"Radio broadcast area","rdoare","NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20516,"Regulated airspace","regasp","N/A","N/A",,"G","A"
20517,"Geological Layer","sedlay","attutn;bulkdn;COLOUR;deplyr;dttdep;dttnum;DUNITS;gascon;grnsiz;hfbmls;laynum;lfbmls;mgstyp;reflco;migspd;migdir;msstrg;natsed;NATQUA;porsty;revebn;revfqy;revgan;samret;sndvel;snrflc;soudat;WATLEV;wbrcap","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20518,"Seismic Activity Area","seiare","bearng;ricsca","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20519,"Sensor Anomaly","senanm","datfir;datlst;DUNITS;gendep;HUNITS;madsig;magany;magint;NOBJNM;OBJNAM;orcard;ORIENT;QUASOU;scrdim;senfir;senlst;sonsig;sorfir;sorlst;soudat;SOUACC;STATUS;TECSOU;VALSOU;WATLEV","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20520,"Shelter Location","shlloc","OBJNAM;NOBJNM;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20521,"Superficial Sediment Deposits","seddep","N/A","N/A",,"G","A"
20522,"Trafficability Area","trfare","cattrf","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20523,"Trawl Scours","twlscr","HUNITS;HORWID;ORIENT","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L;A"
20524,"Turning point","turnpt","NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20525,"Viewpoint","viewpt","bearng;discon;DUNITS;shpspd;snrfrq;snrrsc;twdbdp","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20526,"Bottom Tactical Data Area","btdare","mntden;undmnr;umnrwb;umrwob","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20527,"Burial Probability Area","bprare","brmchm;brperd;brprob;tgrfwt","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20528,"Leisure Activity Area","lsrare","lsract;timeyr","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20529,"Performance Data Area","pfdare","clperc;clprob;csprob;cswidt;dsprob;dtprob","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20530,"Resource Location","resloc","typres;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20531,"Risk Data Area","rkdare","conlev;numrmn;prbrmn;rmnlmn;sminth;znecol","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20532,"Navigation system (NAVAID)","navaid + CATROS","actper;CALSGN;CATROS;COMCHA;NOBJNM;OBJNAM;SIGFRQ","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
20533,"Internal Waters Area ","intwtr","linech;NATION;RESTRN;STATUS","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20534,"Sea Ice","seaice","iceact;icecvt;icesod;icemax;icemin;icerdv;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20535,"Ice Advisory Area","iceadv","iceadc;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20536,"Iceberg Area","brgare","icebnm;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20537,"Land Ice","lndice","icelnd;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20538,"Ice Line","icelin","icelnc;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20539,"Ice Route","icerte","NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20540,"Ice Polynya","icepol","icepst;icepty;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","A"
20541,"Ice Lead","icelea","icelty;icelst;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L;A"
20542,"Iceberg","icebrg","icebsz;icebsh;icebdr;icebsp;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20543,"Ice Movement","icemov","icebsp;icebdr;NOBJNM;OBJNAM","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;A"
20544,"Traffic route","tfcrte","linech;NOBJNM;OBJNAM;PEREND;PERSTA;traden;TRAFIC;typshp","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","L"
20717,"User Defined","u_defd","txtdes","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P;L;A"
20718,"Small Bottom Object","smalbo","blndzn;brmchm;brpctg;COLOUR;comsys;datfir;datlst;depwat;DUNITS;gendep;HORLEN;HORWID;HUNITS;incltn;layptm;layrfn;laytim;madsig;magany;magint;minern;miscls;miscom;misdat;misnme;mnhsys;mnimnc;mnimnt;mnssys;mulcon;mwdcrn;NATCON;navsys;notfnd;nmprob;objtrn;objshp;onsonr;orbobn;orgdat;orgntr;ORIENT;QUASOU;scrdim;senfir;senlst;snrflc;soudat;stacon;surdat;SUREND;tarstg;TECSOU;unwrfm;VERLEN","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"G","P"
21484,"Completeness for the product specification","m_conf + catcnf","catcnf","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"M","A"
21485,"Security Classification Information","m_clas","","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"M","A"
21486,"Vertical Datum Shift Area","m_vers","vershf","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"M","P;A"
21487,"Defined Straight Lines","m_line","linech","AGENCY;CSCALE;elvacc;errell;HORACC;INFORM;NINFOM;NTXTDS;PICREP;POSACC;PRCTRY;PUBREF;RECDAT;QUAPOS;seccvt;secido;secown;secpmk;SORDAT;SORIND;TXTDSC;VERACC",,"M","N/A"
`;const Ye=A=>en.parse(A,{header:!0,skipEmptyLines:!0}).data,An=new Map(Ye(tn).map(A=>[Number(A.Code),{acronym:A.Acronym,name:A.ObjectClass}])),be=A=>An.get(A)??{acronym:`OBJL_${A}`,name:`Object class ${A}`},Tn=new Map(Ye(nn).map(A=>[Number(A.Code),A])),Nn=(A,T)=>{const t=Tn.get(A),N=Number(T);return[(t==null?void 0:t.Acronym)??`ATTR_${A}`,t&&["I","F","E"].includes(t.Attributetype)&&T.trim()!==""&&Number.isFinite(N)?N:T]},he=1024*1024,Cn=(A,T)=>{const t=[...new Set(A.flatMap(i=>i.files))];if(T.maxFiles!==void 0&&t.length>T.maxFiles)return{scope:"file-count",name:"",actual:t.length,limit:T.maxFiles};for(const i of t)if(T.maxFileBytes!==void 0&&i.size>T.maxFileBytes)return{scope:"file",name:i.name,actual:i.size,limit:T.maxFileBytes};for(const i of A){const r=[...new Set(i.files)].reduce((s,c)=>s+c.size,0);if(T.maxDatasetBytes!==void 0&&r>T.maxDatasetBytes)return{scope:"dataset",name:i.name,actual:r,limit:T.maxDatasetBytes}}const N=t.reduce((i,r)=>i+r.size,0);return T.maxBatchBytes!==void 0&&N>T.maxBatchBytes?{scope:"batch",name:"",actual:N,limit:T.maxBatchBytes}:null},Sn=(A,T)=>{const t=Cn(A,T);if(!t)return;if(t.scope==="file-count")throw new Error(`ファイル数は${t.limit}個以下にしてください`);const N=t.scope==="file"?t.name:t.scope==="dataset"?`${t.name}一式の合計`:"入力全体の合計";throw new Error(`${N}は${t.limit/he} MiB以下にしてください`)},re={extensions:[".000"],files:{optionalExtensions:Array.from({length:999},(A,T)=>`.${String(T+1).padStart(3,"0")}`)},limits:{maxFileBytes:64*he,maxDatasetBytes:128*he,maxFiles:1e3,maxOutputBytes:128*he,maxFeatures:5e5,maxVertices:5e6,maxSections:1e6}},Je=(A,T)=>A[0]===T[0]&&A[1]===T[1],Pe=A=>{let T=0;for(let t=1;t<A.length;t++)T+=A[t-1][0]*A[t][1]-A[t][0]*A[t-1][1];return T/2},rn=(A,T)=>{const t=D=>{const S=A.get(D);if(!S)throw new Error(`S-57の空間参照先が見つかりません: ${D}`);return S},N=D=>{const S=t(D);if(S.kind!==120||S.points.length!==1||S.points[0][2]!==void 0)throw new Error("S-57の接続点が不正です");return[S.points[0][0],S.points[0][1]]},i=D=>{const S=t(D.key);if(S.kind!==130||![1,2].includes(D.orientation))throw new Error("S-57のエッジ参照が不正です");const l=S.pointers.filter(I=>I.topology===1),F=S.pointers.filter(I=>I.topology===2);if(l.length!==1||F.length!==1||S.points.some(I=>I[2]!==void 0))throw new Error("S-57のエッジの始点・終点が不正です");T(S.points.length+2);const d=[N(l[0].key),...S.points.map(I=>[I[0],I[1]]),N(F[0].key)];for(let I=1;I<d.length;I++)if(Math.abs(d[I][0]-d[I-1][0])>180)throw new Error("日付変更線をまたぐS-57の線・面は未対応です。経度180度で分割してください");return D.orientation===2?d.reverse():d},r=(D,S)=>{const l=[];let F=[];for(const d of D){const I=i(d);if(F.length&&!Je(F[F.length-1],I[0])){if(S)throw new Error("S-57の面の境界がつながっていません");l.push(F),F=[]}for(let o=F.length?1:0;o<I.length;o++)F.push(I[o]);if(S&&Je(F[0],F[F.length-1])){if(F.length<4||Pe(F)===0)throw new Error("S-57に面積のない境界があります");l.push(F),F=[]}}if(F.length){if(S)throw new Error("S-57の面の境界が閉じていません");l.push(F)}return l};let s=0;const c=(D,S)=>{let l=!1;for(let F=0,d=D.length-1;F<D.length;d=F++){if(++s>re.limits.maxVertices*10)throw new Error("S-57の面の包含判定が処理上限を超えています");const[I,o]=D[F],[V,M]=D[d];o>S[1]!=M>S[1]&&S[0]<(V-I)*(S[1]-o)/(M-o)+I&&(l=!l)}return l};return{points:D=>D.flatMap(S=>{const l=t(S.key);if(![110,120].includes(l.kind)||!l.points.length)throw new Error("S-57の点参照が不正です");return T(l.points.length),l.points}),shape:(D,S)=>{if(D===2){const o=r(S,!1);return o.length===1?{type:"LineString",coordinates:o[0]}:{type:"MultiLineString",coordinates:o}}if(S.some(o=>![1,2,3].includes(o.usage)))throw new Error("S-57の面の境界種別が不正です");const l=r(S.filter(o=>o.usage!==2),!0),F=r(S.filter(o=>o.usage===2),!0);if(!l.length)throw new Error("S-57の面に外周がありません");const d=l.map(o=>[Pe(o)>0?o:o.reverse()]),I=d.map(o=>Math.abs(Pe(o[0])));for(const o of F){let V=-1;for(let M=0;M<d.length;M++)(V<0||I[M]<I[V])&&c(d[M][0],o[0])&&(V=M);if(V<0)throw new Error("S-57の内周を含む外周がありません");d[V].push(Pe(o)<0?o:o.reverse())}return d.length===1?{type:"Polygon",coordinates:d[0]}:{type:"MultiPolygon",coordinates:d}}}},ye=new TextDecoder("ascii"),Te=()=>{throw new Error("S-57のISO 8211レコードが欠損または不正です")},se=(A,T,t)=>{const N=ye.decode(A.subarray(T,T+t));return N.length!==t||!/^\d+$/.test(N)?Te():Number(N)},Qe=(A,T)=>{let t=0,N=0;for(;t<A.length;){A.length-t<24&&Te();const i=A.subarray(t,t+24),r=i[6]===76;if(N===0?!r:i[6]!==68)throw new Error("S-57のDDR／データレコードを確認できません（省略ヘッダー形式は未対応です）");r&&se(i,10,2)!==9&&Te();const s=se(i,12,5),c=se(i,20,1),D=se(i,21,1),S=se(i,23,1);(!c||!D||S!==4||s<25||t+s>A.length||A[t+s-1]!==30)&&Te();const l=S+c+D;(s-25)%l!==0&&Te();const F=new Map,d=[];let I=s;for(let M=t+24;M<t+s-1;M+=l){const W=ye.decode(A.subarray(M,M+S)),$=se(A,M+S,c),j=s+se(A,M+S+c,D);(!$||t+j+$>A.length)&&Te(),d.push({start:j,end:j+$,tag:W}),I=Math.max(I,j+$)}const o=se(i,0,5)||I;(o!==I||!d.length)&&Te();let V=s;for(const M of[...d].sort((W,$)=>W.start-$.start))M.start!==V&&Te(),V=M.end;for(const M of d){const W=F.get(M.tag)??[];W.push(A.subarray(t+M.start,t+M.end)),F.set(M.tag,W)}if(++N>re.limits.maxSections)throw new Error("S-57のレコード数が上限を超えています");T(F,r),t+=o}N||Te()},an={DSID:"b11,b14,2b11,3A,2A(8),R(4),b11,2A,b11,b12,A",DSSI:"3b11,8b14",DSPM:"b11,b14,3b11,b14,4b11,2b14,A",FRID:"b11,b14,2b11,2b12,b11",FOID:"b12,b14,b12",VRID:"b11,b14,b12,b11",FSPT:"B(40),3b11",VRPT:"B(40),4b11",SG2D:"2b24",SG3D:"3b24",ATTF:"b12,A",NATF:"b12,A",ATTV:"b12,A",FFPT:"B(64),b11,A",FFPC:"b11,2b12",FSPC:"b11,2b12",VRPC:"b11,2b12",SGCC:"b11,2b12"},ve=A=>A.replace(/\s/g,"").split(",").flatMap(T=>{const t=/^(\d*)(b[12][124]|[ABIR](?:\(\d*\))?)$/.exec(T);if(!t)throw new Error("S-57のDDRに未対応のフィールド形式があります");const N=Number(t[1]||1);return(N<1||N>32)&&Te(),Array(N).fill(t[2].replace(/\(\)/,""))}).join(","),We=(A,T=!1)=>{const t=new Set;for(const[N,i]of Object.entries(an)){const r=A.get(N);if(!r)continue;r.length!==1&&Te();const s=Oe(r[0]),D=ye.decode(s.subarray(9)).split("")[2];if(!(D!=null&&D.startsWith("("))||!D.endsWith(")")||ve(D.slice(1,-1))!==ve(i))throw new Error(`S-57の${N}は未対応の符号化です。バイナリENCを使用してください`);t.add(N)}if(!t.has("DSID")||!T&&(!t.has("DSPM")||!t.has("FRID")))throw new Error("S-57 ENCのフィールド定義を確認できませんでした");return t},Oe=(A,T=!1)=>{const t=T?2:1;return(A.length<t||A[A.length-t]!==30||T&&A.at(-1)!==0)&&Te(),A.subarray(0,-t)},ce=A=>{const T=new DataView(A.buffer,A.byteOffset,A.byteLength);let t=0;const N=r=>{t+r>A.length&&Te();const s=t;return t+=r,s};return{u8:()=>T.getUint8(N(1)),u16:()=>T.getUint16(N(2),!0),u32:()=>T.getUint32(N(4),!0),i32:()=>T.getInt32(N(4),!0),text:(r,s=0)=>{const c=t;if(r===void 0){const l=s===2?2:1;for(;t<A.length&&!(A[t]===31&&(l===1||A[t+1]===0));)N(l);r=t-c,N(l)}else N(r);const D=A.subarray(c,c+r);if(s===2)return r%2&&Te(),new TextDecoder("utf-16le",{fatal:!0}).decode(D);if(s===0&&D.some(l=>l>127))throw new Error("S-57のASCII文字列が不正です");let S="";for(const l of D)S+=String.fromCharCode(l);return S},position:()=>t,remaining:()=>A.length-t,end:()=>{t!==A.length&&Te()}}},h=A=>{throw new Error(`S-57の更新: ${A}`)},Ee=(A,T)=>{const t=A.get(T);return(t==null?void 0:t.length)!==1?h(`${T}が欠損または重複しています`):Oe(t[0])},me=(A,T)=>ce(Ee(A,T)),fe=A=>A.replace(/\.\d{3}$/,"").toLowerCase(),Rn=A=>{const T=me(A,"DSID");T.u8()!==10&&h("DSIDが不正です"),T.u32();const t=T.u8();T.u8();const N=T.text(),i=T.text(),r=T.position(),s=T.text(),c=T.position(),D=T.text(8),S=T.text(8),l=T.text(4),F=T.u8();T.text(),T.text();const d=T.u8(),I=T.u16();T.text(),T.end(),(!/^\d+$/.test(s)||Number(s)>999||!/^\d+$/.test(i))&&h("版・更新番号が不正です"),i==="0"&&h("セルを取り消す更新です。このセルは地図へ追加できません"),(l!=="03.1"||F!==1||d!==(t===1?1:2))&&h("ENCの基本・更新プロファイルが不正です");const o=me(A,"DSSI"),V=o.u8(),M=o.u8(),W=o.u8();for(let $=0;$<8;$++)o.u32();return o.end(),(![2,3].includes(V)||M>1||W>2)&&h("データ構造または文字コードが未対応です"),{name:N,edition:i,update:Number(s),purpose:t,agency:I,structure:V,ascii:M,national:W,applicationDate:D,issueDate:S,updateStart:r,updateEnd:c}},Fe=A=>{const T=A.has("FRID")?"FRID":"VRID";A.has("FRID")&&A.has("VRID")&&h("地物と空間レコードが混在しています");const t=me(A,T),N=t.u8(),i=t.u32();T==="FRID"&&(t.u8(),t.u8(),t.u16());const r=t.u16(),s=t.u8();return t.end(),(T==="FRID"?N!==100:![110,120,130].includes(N))&&h("レコード種別が不正です"),{tag:T,key:`${N}:${i}`,version:r,operation:s}},we=(A,T)=>A.length===T.length&&A.every((t,N)=>t===T[N]),He=["FSPC","FFPC","VRPC","SGCC"],on={FSPT:8,VRPT:9,SG2D:8,SG3D:12},Xe=(A,T,t=0)=>{const N=[];for(const i of A.get(T)??[]){const r=Oe(i,T==="NATF"&&t===2),s=on[T];if(s){r.length%s&&h(`${T}の項目長が不正です`);for(let c=0;c<r.length;c+=s)N.push(r.subarray(c,c+s))}else{const c=ce(r);for(;c.remaining();){const D=c.position();T==="FFPT"?(c.u16(),c.u32(),c.u16(),c.u8()):c.u16(),c.text(void 0,t),N.push(r.subarray(D,c.position()))}}}return N},Ue=(A,T=!1)=>{const t=A.reduce((r,s)=>r+s.length,T?2:1);t>re.limits.maxDatasetBytes&&h("更新後のフィールド容量が上限を超えています");const N=new Uint8Array(t);let i=0;for(const r of A)N.set(r,i),i+=r.length;return N[i]=30,N},Be=(A,T,t,N=!1)=>{t.length?A.set(T,[Ue(t,N)]):A.delete(T)},Le=(A,T,t,N)=>{if(!T.has(t))return;const i=new Map;for(const r of[A,T]){const s=new Set;for(const c of Xe(r,t,N)){const D=ce(c),S=D.u16(),l=D.text(void 0,N);s.has(S)&&h(`${t}の属性コードが重複しています`),s.add(S),r===T&&l===""?i.delete(S):i.set(S,c)}}Be(A,t,[...i.values()],t==="NATF"&&N===2)},pe=(A,T,t,N)=>{if(!T.has(t)&&!T.has(N))return;const i=Xe(A,t),r=Xe(T,t);if(!T.has(N)){(N!=="SGCC"||i.length||!r.length||Ee(A,"VRID")[0]!==130)&&h(`${t}の更新制御フィールド${N}が必要です`),Be(A,t,r);return}const s=me(T,N),c=s.u8(),D=s.u16()-1,S=s.u16();s.end(),(![1,2,3].includes(c)||!S||D<0||D>i.length||c!==1&&D+S>i.length)&&h(`${N}の更新位置・件数が範囲外です`),r.length!==(c===2?0:S)&&h(`${N}の件数と${t}の項目数が一致しません`);const l=i.slice(0,D);for(const F of r)l.push(F);for(let F=D+(c===1?0:S);F<i.length;F++)l.push(i[F]);Be(A,t,l)},Dn=(A,T,t)=>{const N=new Map(A),i=Fe(T),r=Ee(A,i.tag).slice(),s=Ee(T,i.tag),c=i.tag==="FRID"?9:5;we(r.subarray(0,c),s.subarray(0,c))||h(`${i.key}の識別情報が変わっています`),r.set(s.subarray(c,c+2),c),N.set(i.tag,[Ue([r])]),T.has("FOID")&&(!A.has("FOID")||!we(Ee(A,"FOID"),Ee(T,"FOID")))&&h("FOIDが基本セルと一致しません"),Le(N,T,"ATTF",t.ascii),Le(N,T,"NATF",t.national),Le(N,T,"ATTV",0),pe(N,T,"FSPT","FSPC"),pe(N,T,"FFPT","FFPC"),pe(N,T,"VRPT","VRPC");const D=["SG2D","SG3D"].filter(S=>A.has(S)||T.has(S));D.length>1&&h("2D・3D座標を混在させる更新は未対応です"),T.has("SGCC")&&!D.length&&h("SGCCの対象座標がありません");for(const S of D)pe(N,T,S,"SGCC");return N},sn=(A,T,t)=>{T.length+1>re.limits.maxFiles&&h("ファイル数が上限を超えています"),[A,...T.map(d=>d.bytes)].some(d=>d.length>re.limits.maxFileBytes)&&h("ファイル容量が64 MiBの上限を超えています"),A.length+T.reduce((d,I)=>d+I.bytes.length,0)>re.limits.maxDatasetBytes&&h("一式の容量が128 MiBの上限を超えています");let N=0;const i=(d,I)=>{let o=new Map,V=new Set,M,W;const $=[];return Qe(d,(j,De)=>{if(++N>re.limits.maxSections&&h("レコード数が上限を超えています"),De){o=j,V=We(j,I);return}for(const Ce of j.keys())Ce!=="0001"&&!V.has(Ce)&&h(`${Ce}は未対応またはDDRに定義がありません`);if(j.has("DSID"))M&&h("DSIDが重複しています"),M=j;else if(j.has("DSPM"))(W||I)&&h("DSPMの更新または重複は未対応です"),W=j;else{const Ce=Fe(j),Se=Ce.tag==="FRID"?["0001","FRID","FOID","ATTF","NATF","FFPT","FFPC","FSPT","FSPC"]:["0001","VRID","ATTV","VRPC","VRPT","SGCC","SG2D","SG3D"];for(const y of j.keys())Se.includes(y)||h(`${Ce.tag}内の${y}は未対応です`);$.push(j)}}),!M||!I&&!W?h("データセット情報が欠損しています"):{definitions:o,general:M,parameters:W,records:$,header:Rn(M)}},r=i(A,!1);r.header.purpose!==1&&h("基本ファイル（.000）が必要です");const s=new Map,c=new Set;for(const d of r.records){const I=Fe(d);(I.operation!==1||I.version<1||c.has(I.key)||He.some(o=>d.has(o)))&&h("基本セルのレコードが不正です"),s.set(I.key,d),c.add(I.key)}let D=r.header;const S=[...T].sort((d,I)=>Number(d.name.slice(-3))-Number(I.name.slice(-3)));for(const d of S){const I=i(d.bytes,!0),o=I.header;(o.purpose!==2||fe(o.name)!==fe(r.header.name)||fe(d.name)!==fe(o.name)||o.agency!==r.header.agency)&&h("更新ファイルのセル名・提供機関が基本セルと一致しません"),o.edition!==r.header.edition&&h("更新ファイルの版が基本セルと一致しません"),(!/\.\d{3}$/.test(d.name)||Number(d.name.slice(-3))!==o.update||/\.\d{3}$/.test(o.name)&&Number(o.name.slice(-3))!==o.update)&&h("ファイル名とDSIDの更新番号が一致しません"),o.update!==D.update+1&&h(`更新番号が連続していません。.${String(D.update+1).padStart(3,"0")}が必要です`),(o.structure!==r.header.structure||o.ascii!==r.header.ascii||o.national!==r.header.national)&&h("更新ファイルの構造・文字コードが基本セルと一致しません");for(const[V,M]of I.definitions)r.definitions.has(V)||r.definitions.set(V,M);for(const V of I.records){const M=Fe(V),W=s.get(M.key);M.operation===1?((c.has(M.key)||M.version!==1||He.some($=>V.has($)))&&h(`${M.key}の追加命令・レコード版が不正です`),s.set(M.key,V),c.add(M.key)):(W||h(`${M.key}の更新対象がありません`),M.version!==Fe(W).version+1&&h(`${M.key}のレコード版RVERが連続していません`),M.operation===2?([...V.keys()].some($=>$!=="0001"&&$!==M.tag)&&h("削除命令に余分なフィールドがあります"),s.delete(M.key)):M.operation===3?s.set(M.key,Dn(W,V,o)):h("レコード更新命令RUINが不正です"))}D=o}const l=Ee(r.general,"DSID"),F=l.slice(r.header.updateEnd);F.set(new TextEncoder().encode(D.issueDate),8),r.general.set("DSID",[Ue([l.subarray(0,r.header.updateStart),new TextEncoder().encode(`${D.update}`),F])]),t(r.definitions,!0),t(r.general,!1),t(r.parameters,!1);for(const d of s.values())t(d,!1)},B=A=>{throw new Error(`S-57の${A}`)},le=(A,T)=>{const t=A.get(T);if(t)return t.length!==1&&B(`${T}フィールドが重複しています`),ce(Oe(t[0]))},ke=(A,T,t)=>A.toString(16).padStart(4,"0")+T.toString(16).padStart(8,"0")+t.toString(16).padStart(4,"0"),_e=(A,T)=>{const t=[];for(const N of A.get(T)??[]){const i=ce(Oe(N));for(;i.remaining();){const r=i.u8(),s=i.u32(),c=i.u8(),D=i.u8(),S=T==="VRPT"?i.u8():255;i.u8(),t.push({key:`${r}:${s}`,orientation:c,usage:D,topology:S})}}return t},On=(A,T=[])=>{const t=re.limits;A.byteLength>t.maxFileBytes&&B("入力は64 MiBの上限を超えています");const N={name:"",edition:"",updateNumber:"",issueDate:"",scale:0,depthUnit:0,soundingDatum:0};let i=new Set,r=!1,s=!1,c=!1,D=0,S=0,l=0,F=0,d=0;const I=new Map,o=[],V=new Set,M=(e,C)=>{for(const a of["ATTF","NATF"]){const R=a==="NATF"?F:l;for(const E of e.get(a)??[]){const L=ce(Oe(E,R===2));for(;L.remaining();){const k=L.u16(),[U,P]=Nn(k,L.text(void 0,R));C[U]=P}}}};(e=>T.length?sn(A,T,e):Qe(A,e))((e,C)=>{if(C){i=We(e);return}for(const U of e.keys())["ARCC","CT2D","EL2D","C2IL","SGCC","VRPC","FSPC","FFPC"].includes(U)&&B("曲線または更新レコードは未対応です"),U!=="0001"&&!i.has(U)&&B(`${U}フィールドは未対応です`);const a=le(e,"DSID");if(a){r&&B("DSIDが重複しています"),r=!0,a.u8()!==10&&B("DSIDが不正です"),a.u32(),a.u8()!==1&&B("更新ファイルは未対応です"),a.u8(),N.name=a.text(),N.edition=a.text(),N.updateNumber=a.text(),a.text(8),N.issueDate=a.text(8);const U=a.text(4),P=a.u8();a.text(),a.text();const J=a.u8();a.u16(),a.text(),a.end(),(U.trim()!=="03.1"||P!==1||J!==1)&&B("S-57 3.1 ENC基本セル以外の製品仕様は未対応です")}const R=le(e,"DSSI");if(R){s&&B("DSSIが重複しています"),s=!0;const U=R.u8();U!==2&&U!==3&&B(`データ構造 DSTR=${U} は未対応です。Chain-node（2）またはPlanar graph（3）に対応しています`),l=R.u8(),F=R.u8(),(l>1||F>2)&&B("文字コードは未対応です");for(let P=0;P<8;P++)R.u32();R.end()}const E=le(e,"DSPM");E&&(c&&B("DSPMが重複しています"),c=!0,E.u8()!==20&&B("DSPMが不正です"),E.u32(),E.u8()!==2&&B("WGS84以外の測地系は未対応です"),E.u8(),N.soundingDatum=E.u8(),N.scale=E.u32(),N.depthUnit=E.u8(),E.u8(),E.u8(),E.u8()!==1&&B("経緯度以外の座標単位は未対応です"),D=E.u32(),S=E.u32(),(!D||!S)&&B("座標・測深倍率が不正です"),E.text(),E.end());const L=le(e,"VRID"),k=le(e,"FRID");if(!(!L&&!k)){if(L&&k&&B("空間・地物レコードの混在は未対応です"),(!r||!s||!c)&&B("データセット情報が欠損しています"),L){const U=L.u8(),P=L.u32();L.u16(),L.u8()!==1&&B("更新ファイルは未対応です"),L.end(),[110,120,130].includes(U)||B("空間レコード種別は未対応です");const J=`${U}:${P}`;I.has(J)&&B("空間レコードの識別子が重複しています"),e.has("SG2D")&&e.has("SG3D")&&B("2D・3D座標の混在は未対応です");const u=[];for(const K of["SG2D","SG3D"])for(const p of e.get(K)??[]){const f=ce(Oe(p));for(;f.remaining();){const O=f.i32()/D,w=f.i32()/D;(Math.abs(O)>90||Math.abs(w)>180)&&B("経緯度が範囲外です"),++d>t.maxVertices&&B("入力頂点数が上限を超えています"),u.push(K==="SG3D"?[w,O,f.i32()/S]:[w,O])}}I.set(J,{kind:U,points:u,pointers:_e(e,"VRPT")})}if(k){k.u8()!==100&&B("FRIDが不正です");const U=k.u32(),P=k.u8(),J=k.u8(),u=k.u16(),K=k.u16();k.u8()!==1&&B("更新ファイルは未対応です"),k.end(),[1,2,3,255].includes(P)||B("図形種別は未対応です"),V.has(U)&&B("地物の識別子が重複しています"),V.add(U),V.size>t.maxFeatures&&B("地物数が上限を超えています");const p=be(u),f={};M(e,f),Object.assign(f,{RCID:U,PRIM:P,GRUP:J,OBJL:u,OBJL_NAME:p.acronym,OBJL_DESCRIPTION:p.name,RVER:K});const O=le(e,"FOID");if(O){const _=O.u16(),H=O.u32(),ne=O.u16();O.end(),Object.assign(f,{AGEN:_,FIDN:H,FIDS:ne,LNAM:ke(_,H,ne)})}const w=[];for(const _ of e.get("FFPT")??[]){const H=ce(Oe(_));for(;H.remaining();){const ne=ke(H.u16(),H.u32(),H.u16());w.push({LNAM:ne,RIND:H.u8(),COMT:H.text()})}}w.length&&(f.FFPT=JSON.stringify(w)),o.push({primitive:P,properties:f,pointers:_e(e,"FSPT")})}}}),(!r||!s||!c)&&B("データセット情報が欠損しています");let $=0;const j=rn(I,e=>{$+=e,$>t.maxVertices&&B("出力頂点数が上限を超えています")}),De=[];let Ce=0,Se=42;const y=new Map,n=(e,C)=>{const a={type:"Feature",geometry:e,properties:C};De.length>=t.maxFeatures&&B("出力地物数が上限を超えています"),Se+=new TextEncoder().encode(JSON.stringify(a)).byteLength+1,Se>t.maxOutputBytes&&B("出力は128 MiBの上限を超えています"),De.push(a);const R=Number(C.OBJL),E=y.get(R)??{code:R,...be(R),count:0};E.count++,y.set(R,E)};for(const{primitive:e,properties:C,pointers:a}of o){if(e===255){Ce++;continue}if(a.length||B("地物の空間参照が欠損しています"),e===1)for(const[R,E,L]of j.points(a))n({type:"Point",coordinates:[R,E]},L===void 0?{...C}:{...C,DEPTH:L,DEPTH_UNIT:N.depthUnit,SOUNDING_DATUM:N.soundingDatum});else n(j.shape(e,a),C)}return{geojson:{type:"FeatureCollection",features:De},metadata:N,classes:[...y.values()].sort((e,C)=>e.code-C.code),omittedNonSpatialCount:Ce,warnings:[]}},cn=(A,T)=>T.some(t=>A.toLowerCase().endsWith(t));[...re.extensions,...re.files.optionalExtensions].join(",");const $e=A=>cn(A.name,re.extensions),ze=A=>/\.(?!000$)\d{3}$/i.test(A.name)&&!/(?:^|[/\\])CATALOG\.031$/i.test(A.name),je=A=>$e(A)||ze(A),En=A=>{if(!je(A))throw new Error("S-57の基本ファイル（.000）と更新ファイル（.001以降）を選択してください");if(!A.size)throw new Error("S-57ファイルが空です");if(A.size>re.limits.maxFileBytes)throw new Error("S-57は64 MiB以下にしてください")},In=A=>(A.morivisRelativePath||A.webkitRelativePath||A.name).replaceAll("\\","/").replace(/^\.\//,"").replace(/\.\d{3}$/,"").toLowerCase(),Mn=A=>{const T=new Map;for(const t of A.filter(je)){En(t);const N=In(t),i=T.get(N)??[];i.push(t),T.set(N,i)}return[...T.values()].map(t=>{const N=t.find($e);if(!N)throw new Error(`更新ファイルには同じ名前の基本ファイル（.000）が必要です: ${t[0].name}`);const i=t.map(r=>Number(r.name.slice(-3)));if(new Set(i).size!==t.length)throw new Error(`S-57の基本ファイル・更新番号が重複しています: ${N.name}`);return Sn([{name:N.name,files:t}],re.limits),{base:N,updates:t.filter(ze).sort((r,s)=>Number(r.name.slice(-3))-Number(s.name.slice(-3)))}})};self.onmessage=async({data:A})=>{try{const[T]=Mn([A.dataset.base,...A.dataset.updates]),t=new Uint8Array(await T.base.arrayBuffer()),N=await Promise.all(T.updates.map(async r=>({name:r.name,bytes:new Uint8Array(await r.arrayBuffer())}))),i=On(t,N);if(N.length&&i.metadata.name.replace(/\.\d{3}$/,"").toLowerCase()!==T.base.name.replace(/\.000$/i,"").toLowerCase())throw new Error("S-57のファイル名と基本セル内のデータ名が一致しません");postMessage({result:i})}catch(T){postMessage({error:T instanceof Error?T.message:String(T)})}};
