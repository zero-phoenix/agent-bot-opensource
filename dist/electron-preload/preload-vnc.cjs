"use strict";!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof globalThis?globalThis:"undefined"!=typeof self?self:{},n=(new e.Error).stack;n&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[n]="5f181dd0-4c36-4699-a171-4780c60ecb66",e._sentryDebugIdIdentifier="sentry-dbid-5f181dd0-4c36-4699-a171-4780c60ecb66")}catch(e){}}();
"use strict";var ge=Object.defineProperty;var Dn=Object.getOwnPropertyDescriptor;var Fn=Object.getOwnPropertyNames;var Vn=Object.prototype.hasOwnProperty;var Un=(e,t)=>()=>(e&&(t=e(e=0)),t);var ze=(e,t)=>{for(var r in t)ge(e,r,{get:t[r],enumerable:!0})},Bn=(e,t,r,o)=>{if(t&&typeof t=="object"||typeof t=="function")for(let i of Fn(t))!Vn.call(e,i)&&i!==r&&ge(e,i,{get:()=>t[i],enumerable:!(o=Dn(t,i))||o.enumerable});return e};var jn=e=>Bn(ge({},"__esModule",{value:!0}),e);var n=Un(()=>{});var Ao={};ze(Ao,{installVncPreload:()=>Ln});module.exports=jn(Ao);n();n();n();var Y=require("electron");n();var Je=["ready","failed","stuck","aborted"];var Hn=1048576,$n=1024e3,Gn=1e4,Wn=100,Kn=1.1,qn=1.25;function Xe(e){let t=i=>typeof i=="number"&&Number.isInteger(i)&&i>=0&&i<=e,r=i=>t(i)?i:void 0,o=i=>{let a=Math.min(Math.max(Math.round(i),0),e);return t(a)?a:o(0)};return{parse:r,to:o}}function Qe(e,t){let r=[0,1],o=1;for(;;){let i=Math.max(o+1,Math.round(o*e));if(i>t)return r;r.push(i),o=i}}var Yn=Qe(Kn,Hn),zn=Qe(qn,$n);function Ze(e){let t=new Set(e),r=a=>typeof a=="number"&&t.has(a),o=a=>r(a)?a:void 0,i=a=>{let c=e.findLast(l=>l<=a)??0;return r(c)?c:i(0)};return{parse:o,to:i}}var et=Ze(Yn),tt=Ze(zn),nt=Xe(Gn),rt=Xe(Wn),Po=et.parse,No=et.to,Lo=tt.parse,Do=tt.to,Fo=nt.parse,Vo=nt.to,Uo=rt.parse,Bo=rt.to;n();n();n();n();function H(e,t){return t-e}var ot=2147483647,L={now:()=>Date.now(),monotonicNow:()=>performance.now(),schedule(e,t,r){Xn(e);let o=!0,i=e,a,c=()=>{let l=Math.min(i,ot);i-=l,a=globalThis.setTimeout(()=>{if(o){if(i>0){c();return}o=!1,t()}},l),r?.keepEventLoopAlive!==!0&&Jn(a)&&a.unref()};return c(),{dispose(){o&&(o=!1,globalThis.clearTimeout(a))}}}};function Jn(e){return typeof e=="object"&&e!==null&&"unref"in e&&typeof e.unref=="function"}function Xn(e){if(!Number.isFinite(e)||e<0)throw new RangeError("delayMs must be a finite non-negative number")}n();var le=()=>{};function st(e,t,r){return{policyName:e,reason:t,errorClass:r instanceof Error?r.name:typeof r}}var W=class extends Error{constructor(t){super(`Deadline exceeded for ${t}`),this.code="deadline_exceeded",this.name="DeadlineExceededError",this.policyName=t}};function Qn(e){let t=!0;return queueMicrotask(()=>{t&&(t=!1,e())}),{dispose(){t=!1}}}function he(e){X(e.name);let t=e.clock??L,r=e.boundary==="microtask"?Qn:o=>t.schedule(0,o);return{name:e.name,settled(){return new Promise(o=>{r(o)})},arm:r}}function K(e){X(e.name),Re(e.timeoutMs,"timeoutMs");let t=e.clock??L;return{name:e.name,async run(r,o){if(o?.aborted)throw it(o,e.name);let i=new AbortController,a=()=>{},c=new Promise((f,E)=>{a=E}),l=()=>{},p=new Promise((f,E)=>{l=E}),u=()=>{};if(o!=null){let f=()=>{let E=it(o,e.name);l(E),i.abort(E)};o.addEventListener("abort",f,{once:!0}),u=()=>o.removeEventListener("abort",f)}let m=t.schedule(e.timeoutMs,()=>{let f=new W(e.name);a(f),i.abort(f)});try{return await Promise.race([r(i.signal),c,p])}finally{m.dispose(),u()}}}}var Zn={none:0,equal:1/2,full:1};function at(e,t){let r=Zn[e];return()=>r>0?1+r*t():1}function it(e,t){return e.reason??er(t)}function er(e){let t=new Error(`Operation aborted for ${e}`);return t.name="AbortError",t}var tr=/^[a-z0-9]+([-.][a-z0-9]+)*$/;function X(e){if(!tr.test(e))throw new TypeError(`name must be lowercase segments joined by "-" or ".", got ${JSON.stringify(e)}`)}function Re(e,t){if(!Number.isFinite(e)||e<0)throw new RangeError(`${t} must be a finite non-negative number`)}n();function Q(e){X(e.name);let{intervalMs:t,retry:r}=e;lt(e.name,t,"intervalMs");let o=e.unfocusedIntervalMs??t;ct(e.name,o,t,"unfocusedIntervalMs");let i=e.hiddenIntervalMs===void 0?o:e.hiddenIntervalMs;i!==null&&ct(e.name,i,t,"hiddenIntervalMs");let a={focused:t,unfocused:o,hidden:i},c=e.clock??L,l=e.report??le,p=e.activity??nr,u=()=>a[p.read()],m=at(e.jitter??"none",e.random??Math.random);return{name:e.name,start(f,E){let d={state:"ticking",followUp:!1},b=0,_=()=>{},B=new Promise(h=>{_=h}),v=()=>{},C=q,A=()=>{d.state==="waiting"&&d.handle.dispose()},F=h=>d.state==="stopped"?!1:(A(),d={state:"stopped"},C.dispose(),v(),_(h),!0),D=()=>{F({policyName:e.name,reason:"disposed"})},g=h=>{F({policyName:e.name,reason:"tick-failed",cause:h})&&l(st(e.name,"tick-failed",h))},y=()=>{if(d.state==="stopped")return;A(),d={state:"ticking",followUp:!1};let h;try{h=f()}catch(N){V({outcome:"failed",cause:N});return}h.then(()=>V({outcome:"succeeded"}),N=>V({outcome:"failed",cause:N}))},R=(h,N)=>{let J=u();if(J===null){d={state:"waiting",wait:h,handle:q};return}let Ye=J*h.spread-H(h.anchor,N);if(Ye<=0){y();return}d={state:"waiting",wait:h,handle:c.schedule(Ye,y)}},O=()=>{let h=c.monotonicNow();R({kind:"cadence",anchor:h,spread:m()},h)},x=h=>{if(u()===null){d={state:"waiting",wait:{kind:"retry-due"},handle:q};return}let N=h.schedule(b),J={kind:"retry"};d={state:"waiting",wait:J,handle:N},N.elapsed.then(()=>{if(!(d.state!=="waiting"||d.wait!==J)){if(u()===null){d={state:"waiting",wait:{kind:"retry-due"},handle:q};return}y()}},()=>{})},V=h=>{if(d.state==="ticking"){if(h.outcome==="failed"){if(r===void 0){g(h.cause);return}b+=1,x(r);return}if(b=0,d.followUp){y();return}O()}},ce=()=>{if(d.state!=="waiting")return;let{wait:h}=d;if(h.kind==="cadence"){d.handle.dispose(),R(h,c.monotonicNow());return}let N=u()===null;if(h.kind==="retry"&&N){d.handle.dispose(),d={state:"waiting",wait:{kind:"retry-due"},handle:q};return}h.kind==="retry-due"&&!N&&y()},qe={dispose:D,stopped:B,poke:()=>{if(d.state!=="stopped"){if(d.state==="ticking"){d={state:"ticking",followUp:!0};return}y()}}};return E?.aborted?(D(),qe):(E!=null&&(E.addEventListener("abort",D,{once:!0}),v=()=>E.removeEventListener("abort",D)),C=p.subscribe(ce),e.leading??!0?y():O(),qe)}}}var q={dispose(){}},nr={read:()=>"focused",subscribe:()=>q};function lt(e,t,r){if(Re(t,r),t===0)throw new RangeError(`${e}: ${r} must be greater than 0`)}function ct(e,t,r,o){if(lt(e,t,o),t<r)throw new RangeError(`${e}: ${o} must be at least intervalMs`)}n();n();n();n();var ir=Symbol("external"),dt=class{url;constructor(t){this.url=t}[ir](){return"external"}};var sr=Symbol("handled"),_e=class{constructor(){this[sr]=()=>"handled"}},xi=new _e;var Z=/^[a-z][a-z0-9-]{0,31}$/,Se=/^[a-z][a-z0-9-]{0,31}:[a-z0-9-]+(\/[a-z0-9-]+)*$/,ar=Object.freeze({workspace:Object.freeze({idPrefix:"view"}),overlay:Object.freeze({idPrefix:"overlay"})}),wi=Object.freeze({text:"",value:void 0});n();var ut=["workspace","overlay"];function cr(e,t){return Object.fromEntries(e.map(r=>[r,t(r)]))}var Mi=cr(ut,()=>"single");var Ii=Object.freeze({}),Pi=Object.freeze({}),Ni=Object.freeze({}),Li=Object.freeze({});var Di=Object.freeze([]);var be={declaration:"entrypoint.ts",eagerBoundaries:["loading.tsx","error.tsx"],lazyViews:["view.tsx","layout.tsx"]},lr=`{${be.eagerBoundaries.map(e=>e.slice(0,-4)).join(",")}}.tsx`,dr=`{${be.lazyViews.map(e=>e.slice(0,-4)).join(",")}}.tsx`;n();n();n();function M(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}n();n();n();n();n();n();n();n();n();n();n();n();n();n();var ft=Object.freeze({sampled:!1,sampleRate:0,additionalArguments:Object.freeze([])});n();n();n();n();n();var _r=/^[a-z0-9]+-[0-9]+$/;function mt(e){return _r.test(e)}var Sr=2**32;function yt(e){return Number.isInteger(e)&&e>=0&&e<Sr}var ee=2,Et=["click","keydown","pointerdown","wheel","input"],gt=["open","close"];var ht=["button","link","menuitem","menuitemcheckbox","menuitemradio","option","tab","checkbox","radio","switch","slider","textbox","searchbox","combobox","listbox","treeitem","gridcell","row","dialog","alertdialog","log","region","status"],Rt=["immediate","user-blocking","normal","idle"],_t=["mount","update"],ve=["layout","passive"],St=["view","layout"],Te=["default","transition"],ke=["open","restore","prepare","intent"],bt=["returned","resolved","rejected","threw"],vt=["value","redirect","rejected","aborted"],Tt=["chunk_load","preload","render","availability"],kt=["open","prepare","facts","history"],xe=["quiet","cap","superseded"],xt=["presented",...xe];n();n();n();var Ra=BigInt(127),_a=BigInt(7);var Sa=64*1024,ba=new TextEncoder;n();var k=e=>typeof e=="string",te=e=>typeof e=="boolean",S=e=>typeof e=="number"&&Number.isFinite(e),w=e=>typeof e=="number"&&Number.isInteger(e)&&e>=0,At=e=>typeof e=="string"&&mt(e),we=e=>typeof e=="number"&&yt(e),br=e=>e===ee,de=e=>S(e)&&e>=0,vr=e=>S(e)&&e>0&&e<=1;function T(e){let t=new Set(e);return r=>typeof r=="string"&&t.has(r)}function Ae(e){return t=>t===null||e(t)}function ue(e){return t=>Array.isArray(t)&&t.every(e)}function ne(e,t,r={}){if(!M(e))return!1;for(let o of Object.keys(e))if(!Object.hasOwn(t,o)&&!Object.hasOwn(r,o))return!1;for(let[o,i]of Object.entries(t))if(!i(e[o]))return!1;for(let[o,i]of Object.entries(r))if(e[o]!==void 0&&!i(e[o]))return!1;return!0}function Oe(e,t={}){return r=>{if(!M(r)||typeof r.kind!="string")return!1;let o=Object.hasOwn(e,r.kind)?e[r.kind]:void 0,i=Object.hasOwn(t,r.kind)?t[r.kind]:void 0;return o!=null&&ne(r,{kind:k,...o},i)}}var Ce=e=>typeof e=="string"&&Z.test(e),Ot=e=>typeof e=="string"&&Se.test(e),Tr=e=>!M(e)||!ne(e,{surface:k,entrypointId:k})?!1:e.surface==="shell"?e.entrypointId==="":Ce(e.surface)&&Ot(e.entrypointId),kr=Oe({navigation:{action:T(gt),surface:Ce,entrypointId:Ot,startMs:S},selection:{startMs:S},interaction:{event:T(Et),startMs:S}},{navigation:{absorbedInputs:w},interaction:{route:Tr,target:e=>ne(e,{component:we},{role:T(ht)})}}),xr=Oe({render:{component:we,phase:T(_t),compiled:te,baseMs:S},commit:{priority:T(Rt)},effects:{boundary:k,passiveMs:S},"component-effects":{component:we,phase:T(ve)}}),wr=Oe({settle:{entrypointId:k,chunk:T(St),cached:te},preload:{entrypointId:k,cause:T(ke),outcome:T(bt)},loader:{entrypointId:k,cause:T(ke),outcome:T(vt)},fallback:{entrypointId:k,boundary:k,revealed:te,held:te},"entrypoint-error":{entrypointId:k,surface:k,phase:T(Tt),source:Ae(T(["loader"]))},availability:{cause:T(kt),paths:w,policies:w},presented:{ticket:w,entrypointId:k,surface:Ce,commitClass:T(Te)},publish:{store:k,commit:T(Te),version:w,listeners:w},rpc:{edge:k,method:k,ok:te,failureCode:Ae(k)},event:{event:k,interactionId:w,inputDelayMs:S,processingMs:S},"long-animation-frame":{blockingMs:S,renderMs:S,styleAndLayoutMs:S,scripts:w}}),Ct=e=>ne(e,{id:w,parent:Ae(w),startMs:S,durationMs:S,selfMs:S,detail:xr}),Mt=e=>ne(e,{startMs:S,durationMs:S,detail:wr}),It={version:br,lastCommitMs:de,commitCount:w,renderSelfMs:de,sampleRate:vr},Oa={...It,id:At,root:kr,endMs:S,closedBy:T(xe),spans:ue(Ct),folded:w,dropped:w},Ca={ticket:w,measures:ue(Mt),presentedMs:de,dismissedMs:de},Ma={...It,id:At,startMs:S,endMs:S,closedBy:T(xt),spans:ue(Ct),measures:ue(Mt),folded:w,dropped:w};n();n();n();n();n();var $r=new Map([["enabled","enabled"],["enabled_on","enabled"],["enabled_force","enabled"],["enabled_force_on","enabled"],["enabled_readback","enabled"],["disabled_software","disabled_software"],["unavailable_software","disabled_software"]]);function Vt(e){let t=!1;return e.once("gpu-info-update",()=>{t=!0}),()=>e.isHardwareAccelerationEnabled()?t?$r.get(e.getGPUFeatureStatus().gpu_compositing)??"unknown":"unknown":"disabled_software"}n();var Gr=1024*1024,wc=Gr/2;n();n();n();n();n();var Wr=864e5,qc=30*Wr;var Yc=[...Je,"pending"];n();n();n();var ml=256*1024;n();n();var Kr=["dune_session_id","dune_app","app_version","app_built_at","track","platform","arch","gpu_compositing","dune_install_id","dune_row_id"],Ll=new Set(["dune_signal","dune_reason",...Kr]);n();n();var Ul=BigInt(1e3);var Kl=he({name:"otlp.encode"});var Td=process.type==="browser"?Vt(Y.app):()=>"unknown";function Ut(e){return{invoke:(t,r)=>e.invoke(t,r),on:(t,r)=>{let o=(i,a)=>{r(a)};return e.on(t,o),()=>{e.off(t,o)}}}}function Bt(e){return e!=null?Ut(e.ipcRenderer):Ut(Y.ipcRenderer)}n();n();n();n();n();function re(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}function qr(e){return e===null?"null":Array.isArray(e)?"array":typeof e}function jt(e,t,r){return{ok:!1,path:e,expected:t,received:qr(r)}}function Yr(e){return e.optional===!0}function Ht(e,t){return{expects:e,check:t,"~standard":{version:1,vendor:"dune",validate:r=>{let o=t(r,[]);return o.ok?{value:o.value}:{issues:[{message:`must be ${o.expected}, got ${o.received}`,path:o.path}]}}}}}function zr(e,t,r){if(!re(t))return jt(r,"object",t);let o=[];for(let[i,a]of Object.entries(e)){let c=Object.hasOwn(t,i)?t[i]:void 0;if(c===void 0&&Yr(a))continue;let l=a.check(c,[...r,i]);if(!l.ok)return l;o.push([i,l.value])}return{ok:!0,value:Object.fromEntries(o)}}function Me(){return Ht("string",(e,t)=>typeof e=="string"?{ok:!0,value:e}:jt(t,"string",e))}function oe(e){return{...Ht("object",(r,o)=>zr(e,r,o)),fields:Object.freeze({...e})}}function Jr(e){let t=e["~standard"];return typeof t=="object"&&t!==null&&t.version===1&&typeof t.validate=="function"}var pe=class extends Error{constructor(t){super(`rpcMethod().args: field "${t}" is not an rpc field validator; pass rpc* combinators or one Standard Schema v1 value.`),this.name="RpcMethodDeclarationError"}};function fe(){return{noArgs:{schema:null},args:e=>{if(Jr(e))return{schema:e};for(let[t,r]of Object.entries(e))if(typeof r?.check!="function")throw new pe(t);return{schema:oe(e)}}}}function Ie(e,t){return Object.freeze({kind:"rpc-edge",edge:e,methods:t.methods,hasEvents:t.events!=null})}n();n();var Xr="__DUNE_DEVTOOLS_HOOK__";function Qr(e){return re(e)&&e.version===1&&typeof e.register=="function"}function $t(e=globalThis){let t=re(e)?e[Xr]:void 0;return Qr(t)?t:null}var Wt="edge/unknown-method",Pe="edge/transport-failed";var Kt="edge/handler-failed";var U=class extends Error{code;detail;constructor(t){super(`${t.code}: ${t.detail}`),this.name="EdgeCallFailure",this.code=t.code,this.detail=t.detail}};function Gt(e){return typeof e!="object"||e==null||!("ok"in e)?!1:typeof e.ok=="boolean"}function Zr(e,t){return`dune-rpc:${e}:m:${t}`}function qt(e,t){return`dune-rpc:${e}:e:${t}`}function eo(e){return`dune-rpc:${e}:probe`}var tu=oe({});function Ne(e,t,r={}){let o={},i=r.measures??null,a=async(p,u)=>{let m=u instanceof Error?u.message:String(u),f;try{f=await t.invoke(eo(e.edge),p)}catch{return new U({code:Pe,detail:m})}return Gt(f)&&!f.ok&&f.failure.code===Wt?new U(f.failure):new U({code:Pe,detail:m})},c=async(p,u)=>{let m;try{m=await t.invoke(Zr(e.edge,p),u)}catch(f){throw await a(p,f)}if(!Gt(m))throw new U({code:Kt,detail:"The edge replied outside its envelope."});if(m.ok)return m.value;throw new U(m.failure)},l=(p,u)=>{if(i==null)return c(p,u);let m=i.now(),f=(E,d)=>{i.record({startMs:m,durationMs:i.now()-m,detail:{kind:"rpc",edge:e.edge,method:p,ok:E,failureCode:d}})};return c(p,u).then(E=>(f(!0,null),E),E=>{throw f(!1,E instanceof U?E.code:null),E})};for(let[p,{schema:u}]of Object.entries(e.methods))o[p]=u===null?()=>l(p,{}):m=>l(p,m);return e.hasEvents&&(o.subscribe=p=>{let u=[];for(let[m,f]of Object.entries(p))f!=null&&u.push(t.on(qt(e.edge,m),f));return()=>{for(let m of u)m()}}),$t()?.register({kind:"rpc-edge",role:"bridge",declaration:e,trust:[]}),o}n();n();n();n();var Le=[{code:"KeyA",keysym:97,forceShift:!1},{code:"KeyC",keysym:99,forceShift:!1},{code:"KeyV",keysym:118,forceShift:!0},{code:"KeyX",keysym:120,forceShift:!1},{code:"KeyZ",keysym:122,forceShift:!1}],me=65507,ye=65505,De=[[65511,"MetaLeft"],[65512,"MetaRight"],[65513,"AltLeft"],[65514,"AltRight"],[65515,"SuperLeft"],[65516,"SuperRight"]];function Fe(){let e="",t="";return{shouldSendHostText(r){return r.length>0&&r!==e&&r!==t},commitHostText(r){e=r},resolveVmText(r){return r.length===0||r===e||r===t?null:(t=r,r)}}}n();var Yt=Ie("box-vnc",{methods:{readClipboard:fe().noArgs,writeClipboard:fe().args({text:Me()})}});n();var zt="sand:vnc-host-key";n();var Jt="sand:vnc-interactive",Xt="sand:vnc-accepts-input";n();n();function Ve(e){return typeof e=="object"&&e!==null&&!Array.isArray(e)}var Qt="sand:vnc-liveness",Ue=1e4,Zt=3;n();var Be="sand:vnc-viewer-visible";n();n();var j=[{member:"keyEvent",modulePath:"./core/rfb.js"},{member:"QEMUExtendedKeyEvent",modulePath:"./core/rfb.js"},{member:"pointerEvent",modulePath:"./core/rfb.js"},{member:"_damage",modulePath:"./core/display.js"},{member:"_recvMessage",modulePath:"./core/websock.js"},{member:"fbUpdateRequest",modulePath:"./core/rfb.js"},{member:"flip",modulePath:"./core/display.js"}];var en={low:6,high:8,raiseAtMbps:15,lowerBelowMbps:11,maxEstimateMbps:30,sampleWeight:.25,sampleMinBytes:96*1024,sampleMinMessages:3,raiseHoldMs:1e4,maxRaiseHoldMs:16e4};function to(e){return{estimateMbps:null,raiseNotBeforeMs:0,raiseHoldMs:e.raiseHoldMs}}function no(e,{quality:t,link:r,sampleMbps:o,nowMs:i}){let a=r.estimateMbps==null?o:r.estimateMbps+e.sampleWeight*(o-r.estimateMbps),c=Math.min(a,e.maxEstimateMbps);return t>e.low&&c<e.lowerBelowMbps?{quality:e.low,estimateMbps:c,raiseNotBeforeMs:i+r.raiseHoldMs,raiseHoldMs:Math.min(r.raiseHoldMs*2,e.maxRaiseHoldMs)}:t<e.high&&c>=e.raiseAtMbps&&i>=r.raiseNotBeforeMs?{...r,quality:e.high,estimateMbps:c}:{...r,quality:t,estimateMbps:c}}var je="__sandVncAdaptiveQuality";function ro(e,t,r,o,i,a){let c=a.guestWindow();if(c[i]!=null)return Promise.resolve();let l=g=>typeof g=="function",p=g=>{let y=typeof g=="object"&&g!=null&&"data"in g?g.data:null;return y instanceof ArrayBuffer?y.byteLength:0},u={bytes:0,messages:0,firstAtMs:0,lastAtMs:0},m=o,f=!1,E=!1,d=()=>null,b=[],_=(g,y,R,O)=>{b.push(()=>{g[y]===O&&(g[y]=R)})},B=g=>{let y=a.now();u.messages===0&&(u.firstAtMs=y),u.messages+=1,u.bytes+=p(g),u.lastAtMs=y},v={remove(){c[i]===v&&delete c[i],E=!0;for(let y of b.splice(0))y();let g=d();g!=null&&typeof g.qualityLevel=="number"&&g.qualityLevel!==e.low&&(g.qualityLevel=e.low)}};c[i]=v;let C=()=>{let g=u;u={bytes:0,messages:0,firstAtMs:0,lastAtMs:0};let y=d(),R=g.lastAtMs-g.firstAtMs;if(y==null||g.bytes<e.sampleMinBytes||g.messages<e.sampleMinMessages||R<=0)return;let O=g.bytes*8/(R*1e3),x=r(e,{quality:y.qualityLevel,link:m,sampleMbps:O,nowMs:g.lastAtMs});m=x,x.quality!==y.qualityLevel&&(f=x.quality>y.qualityLevel,y.qualityLevel=x.quality)},A=g=>{let y=g?._sock,R=y?._websocket;if(!(y?.readyState==="open"||y?.readyState==="connecting")||R==null||typeof R.onmessage!="function")return;let x=R.onmessage,V=function(ce){return B(ce),x.call(this,ce)};R.onmessage=V,_(R,"onmessage",x,V)},F=Promise.all([a.ui(),a.websock()]).then(([g,y])=>{if(E)return;d=()=>g.default?.rfb;let R=y.default?.prototype,O=R?.[t.receiveMember];if(R!=null&&l(O)){let x=function(...V){return B(V[0]),O.apply(this,V)};R[t.receiveMember]=x,_(R,t.receiveMember,O,x)}A(d())}),D=a.rfb().then(g=>{if(E)return;let y=g.default?.messages,R=y?.[t.requestMember];if(y==null||!l(R))return;let O=function(...x){return C(),f&&x[1]===!0&&(f=!1,x[1]=!1),R.apply(this,x)};y[t.requestMember]=O,_(y,t.requestMember,R,O)});return Promise.all([F,D])}function tn(){let e=j[4],t=j[5],r={receiveMember:e.member,requestMember:t.member},o=to(en);return`(${ro.toString()})(${JSON.stringify(en)}, ${JSON.stringify(r)}, ${no.toString()}, ${JSON.stringify(o)}, ${JSON.stringify(je)}, {
    now: () => performance.now(),
    websock: () => import(${JSON.stringify(e.modulePath)}),
    rfb: () => import(${JSON.stringify(t.modulePath)}),
    ui: () => import("./app/ui.js"),
    guestWindow: () => window,
  })`}function nn(){return`window.${je} && window.${je}.remove()`}n();function rn(e){return`
    import("./app/ui.js")
      .then(function (m) {
        var rfb = m && m.default && m.default.rfb;
        var text = ${JSON.stringify(e)};
        if (rfb && typeof rfb.clipboardPasteFrom === "function" && text) {
          rfb.clipboardPasteFrom(text);
          return true;
        }
        return false;
      })
      .catch(function () {
        return false;
      });
  `}function on(e,t){return t&&e.length>0?e:null}n();function sn(){return`import("./app/ui.js").then(
  (module) => {
    const ui = module?.default;
    if (
      typeof ui?.connect !== "function" ||
      typeof ui.getSetting !== "function" ||
      ui.getSetting("reconnect") !== true ||
      ui.connected === true ||
      ui.rfb !== undefined
    ) {
      return false;
    }
    ui.inhibitReconnect = false;
    ui.connect();
    return true;
  },
  () => false,
)`}n();n();var He="__sandVncFrameStamp";var z="__sandVncFrameHold";function an(e){let t=j[5],r=j[6];return`
    (function () {
      if (window.${z}) return;
      var pace = ${JSON.stringify(e)};
      var hold = { isHeld: false, request: null, minIntervalMs: pace.minIntervalMs, pacedAt: -Infinity, receivedBytes: 0, unpacedLeft: 0, isPastFirstRequest: false, timer: null };
      var countedChannels = new WeakSet();
      function countReceivedBytes(sock) {
        var channel = sock && sock._websocket;
        if (!channel || typeof channel.onmessage !== "function" || countedChannels.has(channel)) return;
        countedChannels.add(channel);
        var receive = channel.onmessage;
        channel.onmessage = function (event) {
          hold.receivedBytes += (event.data && event.data.byteLength) || 0;
          return receive.apply(this, arguments);
        };
      }
      function flush() {
        var request = hold.request;
        if (hold.isHeld || request == null) return;
        var isIncremental = request.args[1] === true;
        var wait = isIncremental ? hold.pacedAt + hold.minIntervalMs - performance.now() : 0;
        var isUnpaced = wait > 0 && request.followsSmallUpdate && hold.unpacedLeft > 0;
        if (wait > 0 && !isUnpaced) {
          if (hold.timer == null) {
            hold.timer = setTimeout(function () {
              hold.timer = null;
              flush();
            }, Math.ceil(wait));
          }
          return;
        }
        clearTimeout(hold.timer);
        hold.timer = null;
        hold.request = null;
        if (isUnpaced) hold.unpacedLeft -= 1;
        else if (isIncremental) {
          if (hold.isPastFirstRequest) hold.pacedAt = performance.now();
          hold.isPastFirstRequest = true;
        }
        request.send.apply(request.messages, request.args);
      }
      hold.set = function (isHeld) {
        hold.isHeld = isHeld;
        if (isHeld) return;
        hold.pacedAt = -Infinity;
        flush();
      };
      hold.pace = function (minIntervalMs) {
        hold.minIntervalMs = minIntervalMs;
        flush();
      };
      window.${z} = hold;
      var paced = import(${JSON.stringify(t.modulePath)}).then(function (m) {
        var messages = m && m.default && m.default.messages;
        if (!messages || typeof messages.${t.member} !== "function") {
          throw new Error("noVNC RFB lacks messages.${t.member}");
        }
        var send = messages.${t.member};
        messages.${t.member} = function (sock, incremental) {
          if (incremental !== true) hold.isPastFirstRequest = false;
          countReceivedBytes(sock);
          var updateBytes = hold.receivedBytes;
          hold.receivedBytes = 0;
          if (updateBytes >= pace.largeUpdateBytes) hold.unpacedLeft = pace.smallUpdatesAfterLarge;
          hold.request = {
            send: send,
            messages: this,
            args: arguments,
            followsSmallUpdate: updateBytes < pace.smallUpdateBytes,
          };
          flush();
        };
      });
      var stamped = import(${JSON.stringify(r.modulePath)}).then(function (m) {
        var display = m && m.default && m.default.prototype;
        if (!display || typeof display.${r.member} !== "function") {
          throw new Error("noVNC Display lacks prototype.${r.member}");
        }
        var draw = display.${r.member};
        display.${r.member} = function () {
          window.${He} = Math.random();
          return draw.apply(this, arguments);
        };
        window.${He} = Math.random();
      });
      return Promise.all([paced, stamped]);
    })();
  `}function cn(e){return`window.${z} && window.${z}.set(${e})`}function ln(e){return`window.${z} && window.${z}.pace(${e.minIntervalMs})`}n();var oo="sandVncImeInput",ie="__sandVncImeField";function dn(){return`
    (function () {
      if (window.${ie}) return;
      var isRemoved = false;
      var teardown = function () {};
      window.${ie} = {
        remove: function () {
          isRemoved = true;
          delete window.${ie};
          teardown();
        },
      };

      var FIELD_ID = ${JSON.stringify(oo)};
      var XK_RETURN = 65293;
      var ui = null;
      var keysyms = null;

      function liveRfb() {
        var rfb = ui && ui.rfb;
        return rfb && typeof rfb.sendKey === "function" ? rfb : null;
      }

      function keysymOf(codepoint) {
        if (codepoint === 0x0a || codepoint === 0x0d) return XK_RETURN;
        if (codepoint < 0x20) return null;
        return keysyms.lookup(codepoint);
      }

      function sendText(text) {
        var rfb = liveRfb();
        if (!rfb) return;
        var chars = Array.from(text);
        for (var i = 0; i < chars.length; i++) {
          var keysym = keysymOf(chars[i].codePointAt(0));
          if (keysym === null) continue;
          rfb.sendKey(keysym, null, true);
          rfb.sendKey(keysym, null, false);
        }
      }

      function isViewerCanvas(node) {
        return node instanceof HTMLCanvasElement && node.closest("#noVNC_container") !== null;
      }

      function hostImeOwnsPhysicalKey(e) {
        if (e.ctrlKey || e.metaKey) return false;
        if (e.key === "Shift" || e.key === "Alt") return false;
        return e.isComposing || e.keyCode === 229 || e.key === "Process" || e.key === "Dead";
      }

      function install(Keyboard) {
        if (isRemoved) return;
        var field = document.createElement("textarea");
        field.id = FIELD_ID;
        field.tabIndex = -1;
        field.setAttribute("aria-label", "Remote desktop keyboard input");
        field.setAttribute("autocapitalize", "off");
        field.setAttribute("autocomplete", "off");
        field.setAttribute("autocorrect", "off");
        field.setAttribute("spellcheck", "false");
        field.style.cssText =
          "position:fixed;left:0;top:0;width:1px;height:1px;margin:0;padding:0;border:0;" +
          "opacity:0;overflow:hidden;resize:none;pointer-events:none;";
        document.body.appendChild(field);

        field.addEventListener(
          "keydown",
          function (e) {
            if (!hostImeOwnsPhysicalKey(e)) return;
            if (e.key === "Tab") e.preventDefault();
            e.stopImmediatePropagation();
          },
          true,
        );

        var keyboard = new Keyboard(field);
        keyboard.onkeyevent = function (keysym, code, down) {
          var rfb = liveRfb();
          if (rfb) rfb.sendKey(keysym, code, down);
        };
        keyboard.grab();

        function moveCandidateWindowAnchorTo(e) {
          if (!isViewerCanvas(e.target)) return;
          field.style.left = e.clientX + "px";
          field.style.top = e.clientY + "px";
        }

        field.addEventListener("compositionend", function (e) {
          if (typeof e.data === "string") sendText(e.data);
          field.value = "";
        });
        field.addEventListener("beforeinput", function (e) {
          if (e.isComposing || e.inputType === "insertCompositionText") return;
          e.preventDefault();
          if (e.inputType === "insertText" && typeof e.data === "string") {
            sendText(e.data);
          } else if (e.inputType === "insertLineBreak" || e.inputType === "insertParagraph") {
            sendText("\\n");
          }
        });
        field.addEventListener("input", function (e) {
          if (!e.isComposing) field.value = "";
        });

        function focusFieldForCanvas(e) {
          if (isViewerCanvas(e.target)) field.focus({ preventScroll: true });
        }
        document.addEventListener("focus", focusFieldForCanvas, true);
        document.addEventListener("mousedown", moveCandidateWindowAnchorTo, true);

        if (isViewerCanvas(document.activeElement)) field.focus({ preventScroll: true });

        teardown = function () {
          keyboard.ungrab();
          document.removeEventListener("focus", focusFieldForCanvas, true);
          document.removeEventListener("mousedown", moveCandidateWindowAnchorTo, true);
          var hadFocus = document.activeElement === field;
          field.remove();
          var canvas = document.querySelector("#noVNC_container canvas");
          if (hadFocus && canvas) canvas.focus({ preventScroll: true });
        };
      }

      return Promise.all([
        import("./app/ui.js"),
        import("./core/input/keyboard.js"),
        import("./core/input/keysymdef.js"),
      ]).then(function (modules) {
        ui = modules[0] && modules[0].default;
        var Keyboard = modules[1] && modules[1].default;
        keysyms = modules[2] && modules[2].default;
        if (!ui || !keysyms || typeof Keyboard !== "function") {
          throw new Error("noVNC modules lack Keyboard, keysymdef, or UI");
        }
        if (document.body) {
          install(Keyboard);
        } else {
          document.addEventListener("DOMContentLoaded", function () { install(Keyboard); }, { once: true });
        }
      });
    })();
  `}function un(){return`window.${ie} && window.${ie}.remove()`}n();var $="__sandVncLivenessBeacon";function pn(){let[e,t,r,o,i]=j;return`
    (function () {
      if (window.${$}) return;
      var counters = { keys: 0, clicks: 0, moves: 0, drawOps: 0, inBytes: 0 };
      var restores = [];
      function isInstalled() {
        return window.${$} === counters;
      }
      function restoreOnRemove(owner, member, original) {
        var wrapper = owner[member];
        restores.push(function () {
          if (owner[member] === wrapper) owner[member] = original;
        });
      }
      Object.defineProperty(counters, "remove", {
        value: function () {
          if (isInstalled()) delete window.${$};
          restores.splice(0).forEach(function (restore) { restore(); });
        },
      });
      window.${$} = counters;
      var PRIMARY_BUTTON_MASK_BITS = 0x07;
      var lastButtonMask = 0;
      function countInBytes(e) {
        counters.inBytes += (e && e.data && e.data.byteLength) || 0;
      }
      import(${JSON.stringify(e.modulePath)}).then(function (m) {
        if (!isInstalled()) return;
        var messages = m.default.messages;
        var keyEvent = messages.${e.member};
        messages.${e.member} = function (sock, keysym, down) {
          if (down) counters.keys += 1;
          return keyEvent.apply(this, arguments);
        };
        restoreOnRemove(messages, "${e.member}", keyEvent);
        if (typeof messages.${t.member} === "function") {
          var qemuKeyEvent = messages.${t.member};
          messages.${t.member} = function (sock, keysym, down) {
            if (down) counters.keys += 1;
            return qemuKeyEvent.apply(this, arguments);
          };
          restoreOnRemove(messages, "${t.member}", qemuKeyEvent);
        }
        var pointerEvent = messages.${r.member};
        messages.${r.member} = function (sock, x, y, mask) {
          if (mask & ~lastButtonMask & PRIMARY_BUTTON_MASK_BITS) counters.clicks += 1;
          else counters.moves += 1;
          lastButtonMask = mask;
          return pointerEvent.apply(this, arguments);
        };
        restoreOnRemove(messages, "${r.member}", pointerEvent);
      }).catch(function () {});
      import(${JSON.stringify(o.modulePath)}).then(function (m) {
        if (!isInstalled()) return;
        var display = m.default.prototype;
        var damage = display.${o.member};
        display.${o.member} = function () {
          counters.drawOps += 1;
          return damage.apply(this, arguments);
        };
        restoreOnRemove(display, "${o.member}", damage);
      }).catch(function () {});
      Promise.all([import(${JSON.stringify(i.modulePath)}), import("./app/ui.js")]).then(function (modules) {
        if (!isInstalled()) return;
        var websock = modules[0].default.prototype;
        var recvMessage = websock.${i.member};
        websock.${i.member} = function (e) {
          countInBytes(e);
          return recvMessage.apply(this, arguments);
        };
        restoreOnRemove(websock, "${i.member}", recvMessage);
        var ui = modules[1].default;
        var sock = ui && ui.rfb && ui.rfb._sock;
        var channel = sock && sock._websocket;
        var isOpen = sock && (sock.readyState === "open" || sock.readyState === "connecting");
        if (!isOpen || !channel || typeof channel.onmessage !== "function") return;
        var receive = channel.onmessage;
        channel.onmessage = function (e) {
          countInBytes(e);
          return receive.apply(this, arguments);
        };
        restoreOnRemove(channel, "onmessage", receive);
      }).catch(function () {});
    })();
  `}function fn(){return`JSON.stringify(window.${$} || null)`}function mn(){return`window.${$} && window.${$}.remove()`}function se(e){return typeof e=="number"&&Number.isFinite(e)&&e>=0}function yn(e){if(typeof e!="string")return null;let t=JSON.parse(e);return!Ve(t)||!se(t.keys)||!se(t.clicks)||!se(t.moves)||!se(t.drawOps)||!se(t.inBytes)?null:{keys:t.keys,clicks:t.clicks,moves:t.moves,drawOps:t.drawOps,inBytes:t.inBytes}}function En(){let e=null,t=[],r=null,o=!1;function i(){e=null,t=[],r=null,o=!1}function a(l,p){i(),e=p,r=l}function c(l,p){if(e==null)return a(l,p),null;let u={atMs:l,keys:p.keys-e.keys,clicks:p.clicks-e.clicks,moves:p.moves-e.moves,drawOps:p.drawOps-e.drawOps,inBytes:p.inBytes-e.inBytes};if(u.keys<0||u.clicks<0||u.moves<0||u.drawOps<0||u.inBytes<0)return a(l,p),null;e=p,t.push(u);let m=l-Ue;if(t=t.filter(v=>v.atMs>m),u.drawOps>0&&(o=!1),o||r==null||l-r<Ue)return null;let f=0,E=0,d=0,b=0,_=0;for(let v of t)f+=v.keys,E+=v.clicks,d+=v.moves,b+=v.drawOps,_+=v.inBytes;if(f+E<Zt||b>0||_>0)return null;o=!0;let B=t.find(v=>v.keys+v.clicks>0);return{phase:"post_connect",stallMs:l-(B?.atMs??l),keys:f,clicks:E,moves:d,inBytes:_}}return{sample:c,reset:i}}n();function gn(){let e=!1;return{isVisible:()=>e,update(t){let r=t===!0,o=r&&!e;return e=r,o}}}var We={};ze(We,{getErrorMessage:()=>I,getIpcRenderer:()=>Ee,getWebFrame:()=>An,installSandBrowserPreload:()=>mo,processOutput:()=>P});n();n();var hn="sand:mouse-history-navigation";function $e(e){return e===3?-1:e===4?1:null}function Ge(e){e.preventDefault(),e.stopPropagation(),e.stopImmediatePropagation()}function Rn(e,t){let r=!1,o=c=>{let l=$e(c.button);l==null||c.isTrusted===!1||(r=!0,Ge(c),t(l))},i=c=>{!r||$e(c.button)==null||Ge(c)},a=c=>{!r||$e(c.button)==null||(Ge(c),r=!1)};return e.addEventListener("mousedown",o,!0),e.addEventListener("mouseup",i,!0),e.addEventListener("auxclick",a,!0),()=>{e.removeEventListener("mousedown",o,!0),e.removeEventListener("mouseup",i,!0),e.removeEventListener("auxclick",a,!0)}}n();var _n=6e4;function Sn(e){return e.policy.run(()=>e.call).catch(t=>{throw t instanceof W?(e.reportStall({method:e.method,since:e.since}),e.buildStallError()):t})}n();function I(e){return e instanceof Error?e.message:void 0}var P={warn(...e){console.warn("[sand-webview-preload]",...e)}};var bn=[".okta.com",".okta-emea.com",".oktapreview.com",".duosecurity.com",".login.microsoftonline.com",".onelogin.com",".auth0.com",".pingidentity.com",".rippling.com"];var vn=!1,kn=null,xn=null;function wn(){if(!vn){vn=!0;try{let e=require("electron");kn=e.ipcRenderer??null,xn=e.webFrame??null}catch(e){P.warn("electron module unavailable",I(e))}}}function Ee(){return wn(),kn}function An(){return wn(),xn}function io(e){if(typeof e!="string"||e.length===0)return!1;for(let t=0;t<bn.length;t++)if(e.endsWith(bn[t]))return!0;return!1}function so(){let e=An();if(e==null||typeof location>"u"||!io(location.hostname))return;e.executeJavaScript(`
    (function () {
      var permissions = navigator && navigator.permissions;
      if (!permissions || typeof permissions.query !== "function") return;
      if (permissions.__sandLocalNetworkPolyfill) return;
      permissions.__sandLocalNetworkPolyfill = true;
      var originalQuery = permissions.query.bind(permissions);
      permissions.query = function (descriptor) {
        var name = descriptor && descriptor.name;
        if (name === "local-network-access" || name === "local-network") {
          var status = new EventTarget();
          Object.defineProperties(status, {
            name: { value: name },
            state: { value: "granted" },
            onchange: { value: null, writable: true },
          });
          return Promise.resolve(status);
        }
        return originalQuery(descriptor);
      };
    })();
  `).catch(r=>{P.warn("local network polyfill injection failed",I(r))})}function ao(){try{return new DOMException("Passkey request stalled","NotAllowedError")}catch{let t=new Error("Passkey request stalled");return t.name="NotAllowedError",t}}var co=K({name:"sand-webview-passkey-stall",timeoutMs:_n});function Tn(e,t,r){return function(...i){let a=Date.now(),c;try{let l=r.apply(navigator.credentials,i);c=Promise.resolve(l)}catch(l){return Promise.reject(l)}return Sn({policy:co,method:t,since:a,call:c,reportStall:l=>{try{e.sendToHost("sand:browser-passkey-stalled",l)}catch(p){P.warn("passkey stall send failed",I(p))}},buildStallError:ao})}}function lo(){if(typeof navigator>"u")return;let e=Ee();if(e!=null&&navigator.credentials){if(typeof navigator.credentials.create=="function"){let t=navigator.credentials.create.bind(navigator.credentials);navigator.credentials.create=Tn(e,"create",t)}if(typeof navigator.credentials.get=="function"){let t=navigator.credentials.get.bind(navigator.credentials);navigator.credentials.get=Tn(e,"get",t)}}}function uo(){typeof window>"u"||window.__sandDialogOverridesApplied!==!0&&(window.alert=function(){},window.confirm=function(){return!0},window.prompt=function(){return null},window.__sandDialogOverridesApplied=!0)}function po(){let e=Ee();if(e==null)return;let t=e;if(typeof window>"u"||typeof location>"u")return;let r=location.origin;function o(){try{t.sendToHost("sand:browser-popup-closed",{url:location.href})}catch(i){P.warn("popup-closed send failed",I(i))}}window.addEventListener("beforeunload",o),window.addEventListener("pagehide",o),window.addEventListener("pageshow",function(a){if(!(!a||a.persisted!==!0)&&location.origin===r)try{t.sendToHost("sand:browser-origin-return",{origin:r,currentUrl:location.href})}catch(c){P.warn("origin-return send failed",I(c))}})}function fo(){let e=Ee();e==null||typeof window>"u"||Rn(window,t=>{e.send(hn,t)})}function mo(){try{fo()}catch(e){P.warn("mouse history install failed",I(e))}try{so()}catch(e){P.warn("local network polyfill install failed",I(e))}try{lo()}catch(e){P.warn("webauthn polyfill install failed",I(e))}try{uo()}catch(e){P.warn("dialog stubs install failed",I(e))}try{po()}catch(e){P.warn("ipc wiring install failed",I(e))}}function In(e){return t=>{e.warn(`vnc policy ${t.policyName} stopped`,t.reason,t.errorClass)}}function yo(e){let t=e.getIpcRenderer();return t==null?null:Ne(Yt,Bt({ipcRenderer:t}))}var Ke={minIntervalMs:500,largeUpdateBytes:8*1024,smallUpdateBytes:1024,smallUpdatesAfterLarge:4},On={...Ke,minIntervalMs:0},ae="__sandVncMacKeys";function G(){return typeof location<"u"&&location.pathname.endsWith("/vnc.html")}function Eo(){if(!G())return!1;try{return new URLSearchParams(location.search).get("sandInteractive")==="1"}catch{return!1}}function Cn(e){let t=[],r=e;return{isOn:()=>r,turn(o){if(o===r)return;r=o;let i=o?t:t.slice().reverse();for(let a of i)a.stop?.(),a.stop=o?a.start():null},whileOn(o){t.push({start:o,stop:r?o():null})}}}function go(e){let t=Eo(),r=!0,o=Cn(t),i=Cn(t);return e!=null&&G()&&(e.on(Jt,(a,c)=>{typeof c=="boolean"&&(t=c,c?(o.turn(!0),i.turn(r)):(i.turn(!1),o.turn(!1)))}),e.on(Xt,(a,c)=>{typeof c=="boolean"&&(r=c,i.turn(t&&r))}),typeof window<"u"&&window.addEventListener("pagehide",()=>{i.turn(!1),o.turn(!1)},{once:!0})),{interactivity:o,input:i}}function Mn(){if(typeof document>"u")return null;let e=document.getElementById("noVNC_clipboard_text");return e instanceof HTMLTextAreaElement?e:null}function ho({getErrorMessage:e,getWebFrame:t,processOutput:r}){if(typeof location>"u"||!location.pathname.endsWith("/vnc.html"))return;let o=`
    #noVNC_control_bar,
    #noVNC_control_bar_handle,
    #noVNC_control_bar_anchor,
    #noVNC_status,
    .noVNC_logo {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }
    :root:not(.noVNC_loading):not(.noVNC_connecting):not(.noVNC_disconnecting):not(.noVNC_reconnecting) #noVNC_transition{display:none!important}
  `;try{t()?.insertCSS(o)}catch(a){r.warn("noVNC CSS injection failed",e(a))}function i(){document.getElementById("noVNC_control_bar")?.classList.remove("noVNC_open")}typeof document>"u"||(i(),document.addEventListener("DOMContentLoaded",i,{once:!0}),window.addEventListener("load",i,{once:!0}))}function Ro(e,t){let{getErrorMessage:r,getIpcRenderer:o,getWebFrame:i,processOutput:a}=e,c=o(),l=yo(e);if(c==null||l==null)return;let p=l;if(typeof window>"u"||typeof document>"u"||!G())return;let u=500,m=200,f=Fe(),E=0,d=gn();c.on(Be,(C,A)=>{d.update(A)&&t.isOn()&&_()});function b(){if(!d.isVisible())return;let C=Mn();if(C==null)return;let A=f.resolveVmText(C.value);A!=null&&p.writeClipboard({text:A}).catch(F=>{a.warn("vnc clipboard write failed",r(F))})}function _(){if(!d.isVisible())return;let C=Date.now();C-E<m||(E=C,p.readClipboard().then(A=>{if(!f.shouldSendHostText(A))return;let F=i();F?.executeJavaScript(rn(A)).then(D=>{let g=on(A,D===!0);if(g==null)return;f.commitHostText(g);let y=Mn();y!=null&&(y.value=g)}).catch(D=>{a.warn("vnc clipboard paste failed",r(D))})}).catch(A=>{a.warn("vnc clipboard read failed",r(A))}))}let B=Q({name:"vnc-clipboard-mirror",intervalMs:u,report:In(a)}),v=()=>{document.visibilityState==="visible"&&_()};t.whileOn(()=>{let C=B.start(async()=>{b()});return window.addEventListener("focus",_),document.addEventListener("mousedown",_,!0),document.addEventListener("visibilitychange",v),_(),()=>{C.dispose(),window.removeEventListener("focus",_),document.removeEventListener("mousedown",_,!0),document.removeEventListener("visibilitychange",v)}})}function _o({getErrorMessage:e,getIpcRenderer:t,processOutput:r},o){let i=t();if(i==null||typeof document>"u"||!G())return;let a=new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"]),c=l=>{if(a.has(l.key))try{i.sendToHost(zt,l.key)}catch(p){r.warn("vnc host key forward failed",e(p))}};o.whileOn(()=>(document.addEventListener("keydown",c,!0),()=>document.removeEventListener("keydown",c,!0)))}function Pn(){let e=document.documentElement.classList;return e.contains("noVNC_connected")?"connected":e.contains("noVNC_reconnecting")?"reconnecting":e.contains("noVNC_connecting")?"connecting":e.contains("noVNC_disconnecting")?"disconnecting":"disconnected"}function Nn(e){function t(){let r=new MutationObserver(e);r.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),e(),window.addEventListener("pagehide",()=>r.disconnect(),{once:!0})}document.documentElement==null?document.addEventListener("DOMContentLoaded",()=>t(),{once:!0}):t()}function So({getErrorMessage:e,getIpcRenderer:t,processOutput:r}){let o=t();if(o==null)return;let i=o;if(typeof window>"u"||typeof document>"u"||typeof location>"u"||!location.pathname.endsWith("/vnc.html"))return;function a(m,f){try{i.sendToHost("sand:vnc-session",JSON.stringify({phase:m,clean:f}))}catch(E){r.warn("vnc session report failed",e(E))}}let c=0,l=!1,p=null;function u(){let m=Pn();m!==p&&(p=m,m==="connected"?(c+=1,a(c>1?"reconnect":"rfb_connect",!0),l=!0):l&&m!=="connecting"&&(a("rfb_disconnect",m==="disconnecting"),l=!1))}Nn(u)}function bo({getErrorMessage:e,getWebFrame:t,processOutput:r}){let o=t();if(o==null||typeof window>"u"||typeof document>"u"||!G())return;let i=o,a=!1,c=!1,l=null;function p(){let u=Pn();if(u===l)return;let m=l;l=u,u==="connected"&&(a=!0),!(a||c||m!=="connecting"||u!=="disconnected")&&(c=!0,i.executeJavaScript(sn()).catch(f=>{r.warn("vnc first connect retry failed",e(f))}))}Nn(p)}function vo({getErrorMessage:e,getIpcRenderer:t,getWebFrame:r,processOutput:o},i){let a=r();if(a==null)return;let c=a;if(typeof document>"u"||!location.pathname.endsWith("/vnc.html"))return;function l(d){c.executeJavaScript(d).catch(b=>{o.warn("vnc frame hold failed",e(b))})}let p=!0,u=!1;function m(){let d=document.visibilityState==="hidden"||!p;d!==u&&(u=d,l(cn(u)))}let f=i.isOn()?On:Ke;function E(d){d!==f&&(f=d,l(ln(d)))}l(an(f)),i.whileOn(()=>(E(On),()=>E(Ke))),t()?.on(Be,(d,b)=>{typeof b=="boolean"&&(p=b,m())}),document.addEventListener("visibilitychange",m),m()}function To({getErrorMessage:e,getIpcRenderer:t,getWebFrame:r,processOutput:o},i){let a=t(),c=r();if(a==null||c==null)return;let l=a,p=c;if(typeof window>"u"||typeof document>"u"||!G())return;let u=En(),m=fn(),f=Q({name:"vnc-liveness-sampler",intervalMs:1e3,report:In(o)});i.whileOn(()=>{p.executeJavaScript(pn()).catch(d=>{o.warn("vnc liveness beacon install failed",e(d))}),u.reset();let E=f.start(async()=>{if(document.documentElement?.classList.contains("noVNC_connected")!==!0){u.reset();return}try{let d=await p.executeJavaScript(m),b=yn(d);if(b==null)return;let _=u.sample(performance.now(),b);if(_==null)return;l.sendToHost(Qt,_)}catch(d){o.warn("vnc liveness sample failed",e(d))}});return()=>{E.dispose(),p.executeJavaScript(mn()).catch(d=>{o.warn("vnc liveness beacon removal failed",e(d))})}})}function ko({getErrorMessage:e,getWebFrame:t,processOutput:r},o){let i=t();if(i==null)return;let a=i,c=`
    (function () {
      if (window.${ae}) return;
      if (!/Mac/i.test((navigator && navigator.platform) || "")) return;

      var CHORDS = ${JSON.stringify(Le)};
      var HELD_MODIFIERS = ${JSON.stringify(De)};

      var ui = null;
      import("./app/ui.js")
        .then(function (m) { ui = m && m.default; })
        .catch(function () {});

      function sendChordAsControl(e) {
        if (!e.metaKey) return;
        var chord = CHORDS.find(function (entry) { return entry.code === e.code; });
        if (!chord) return;
        var rfb = ui && ui.rfb;
        if (!rfb || typeof rfb.sendKey !== "function") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        // noVNC presses Meta/Alt down for Cmd, so release them first to avoid
        // sending Alt+Ctrl+key instead of a clean Ctrl+key.
        for (var i = 0; i < HELD_MODIFIERS.length; i++) {
          try { rfb.sendKey(HELD_MODIFIERS[i][0], HELD_MODIFIERS[i][1], false); } catch (_e) {}
        }
        var withShift = e.shiftKey || chord.forceShift;
        var chordKeysym = withShift ? chord.keysym - 0x20 : chord.keysym;
        rfb.sendKey(${me}, "ControlLeft", true);
        if (withShift) rfb.sendKey(${ye}, "ShiftLeft", true);
        rfb.sendKey(chordKeysym, e.code, true);
        rfb.sendKey(chordKeysym, e.code, false);
        if (withShift) rfb.sendKey(${ye}, "ShiftLeft", false);
        rfb.sendKey(${me}, "ControlLeft", false);
      }

      document.addEventListener("keydown", sendChordAsControl, true);
      window.${ae} = {
        remove: function () {
          document.removeEventListener("keydown", sendChordAsControl, true);
          delete window.${ae};
        },
      };
    })();
  `;o.whileOn(()=>(a.executeJavaScript(c).catch(l=>{r.warn("vnc mac key mapping injection failed",e(l))}),()=>{a.executeJavaScript(`window.${ae} && window.${ae}.remove()`).catch(l=>{r.warn("vnc mac key mapping removal failed",e(l))})}))}function xo({getErrorMessage:e,getWebFrame:t,processOutput:r},o){let i=t();if(i==null||!G())return;let a=i;o.whileOn(()=>(a.executeJavaScript(tn()).catch(c=>{r.warn("vnc adaptive quality failed",e(c))}),()=>{a.executeJavaScript(nn()).catch(c=>{r.warn("vnc adaptive quality removal failed",e(c))})}))}function wo({getErrorMessage:e,getWebFrame:t,processOutput:r},o){let i=t();if(i==null)return;let a=i;o.whileOn(()=>(a.executeJavaScript(dn()).catch(c=>{r.warn("vnc ime field injection failed",e(c))}),()=>{a.executeJavaScript(un()).catch(c=>{r.warn("vnc ime field removal failed",e(c))})}))}function Ln(e=We){let{getErrorMessage:t,getIpcRenderer:r,installSandBrowserPreload:o,processOutput:i}=e;o();let{interactivity:a,input:c}=go(r());try{ho(e)}catch(l){i.warn("noVNC chrome hider install failed",t(l))}try{Ro(e,c)}catch(l){i.warn("vnc clipboard bridge install failed",t(l))}try{_o(e,c)}catch(l){i.warn("vnc host key forwarder install failed",t(l))}try{So(e)}catch(l){i.warn("vnc rfb session reporter install failed",t(l))}try{bo(e)}catch(l){i.warn("vnc first connect retry install failed",t(l))}try{vo(e,a)}catch(l){i.warn("vnc frame hold install failed",t(l))}try{ko(e,c)}catch(l){i.warn("vnc mac key mapping install failed",t(l))}try{wo(e,c)}catch(l){i.warn("vnc ime field install failed",t(l))}try{xo(e,a)}catch(l){i.warn("vnc adaptive quality install failed",t(l))}try{To(e,c)}catch(l){i.warn("vnc liveness tripwire install failed",t(l))}}Ln();0&&(module.exports={installVncPreload});
//# debugId=5f181dd0-4c36-4699-a171-4780c60ecb66
