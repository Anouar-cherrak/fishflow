// La boule en argent de la page d'accueil, dessinée en WebGL pur (aucune librairie).
// Elle se déplace d'un « emplacement » à l'autre de la page quand on fait défiler.

export type OrbHandle = {
  kick: (amount: number) => void;
  think: (on: boolean) => void;
  setDark: (dark: boolean) => void;
  destroy: () => void;
};

const VERT = `
attribute vec3 position;
uniform float uTime, uPulse, uScale; uniform vec3 uDir; uniform vec2 uRes, uCenter;
varying vec3 vN;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 perm(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
vec4 p=perm(perm(perm(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float field(vec3 p){return snoise(p*.95+vec3(0.,uTime*.28,uTime*.16))*.55+snoise(p*2.1-vec3(uTime*.2))*.1;}
void main(){
  vec3 p=normalize(position); float bump=pow(max(dot(p,normalize(uDir)),0.),6.)*.22;
  float amp=.14+uPulse*.2;
  float d=field(p)*amp+bump; vec3 np=p*(1.+d);
  float e=.02; vec3 t1=normalize(cross(p,vec3(0.,1.,.001))); vec3 t2=normalize(cross(p,t1));
  vec3 a=p+t1*e; vec3 b=p+t2*e; vec3 pa=a*(1.+field(a)*amp); vec3 pb=b*(1.+field(b)*amp);
  vN=normalize(cross(pa-np,pb-np)); if(dot(vN,p)<0.) vN=-vN;
  vec2 px=np.xy*uScale+uCenter;
  gl_Position=vec4(px/(uRes*.5), -np.z*uScale/5000., 1.);
}`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float uTime,uDark,uHot; varying vec3 vN;
vec3 env(vec3 r){
  float c=cos(uTime*.12), s=sin(uTime*.12); r=vec3(r.x*c-r.z*s, r.y, r.x*s+r.z*c);
  vec3 top=mix(vec3(.62,.66,.72),vec3(.05,.06,.08),uDark); vec3 flo=mix(vec3(.16,.18,.22),vec3(.015,.02,.03),uDark);
  vec3 col=mix(flo,top,smoothstep(-.5,.7,r.y));
  col+=vec3(1.,1.,1.)*pow(max(r.y,0.),5.)*1.7;
  col+=vec3(.95,.97,1.)*exp(-pow((r.x-.62)*5.,2.))*smoothstep(-.3,.5,r.y)*1.5;
  col+=vec3(.9,.95,1.)*exp(-pow((r.x+.7)*7.,2.))*smoothstep(-.1,.6,r.y)*1.1;
  col+=vec3(.13,.8,.38)*exp(-pow((r.x+.2)*4.,2.))*exp(-pow((r.y+.25)*5.,2.))*(.22+uHot*1.1);
  col*=.55+.45*smoothstep(-.02,.02,r.y+.03);
  return col; }
void main(){ vec3 n=normalize(vN); vec3 v=vec3(0.,0.,1.);
  float fr=pow(1.-max(dot(n,v),0.),3.);
  vec3 col=env(reflect(-v,n))*(.78+.5*fr);
  col+=pow(max(dot(reflect(-normalize(vec3(-.4,.8,.6)),n),v),0.),90.)*1.2;
  col=pow(col,vec3(.92));
  gl_FragColor=vec4(col,1.);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
  return sh;
}

function sphere(rings: number, segs: number) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, th = v * Math.PI;
    for (let x = 0; x <= segs; x++) {
      const u = x / segs, ph = u * Math.PI * 2;
      pos.push(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < segs; x++) {
      const a = y * (segs + 1) + x, b = a + segs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

/** Crée la boule. Renvoie null si le WebGL n'est pas disponible (la page marche quand même). */
export function createOrb(canvas: HTMLCanvasElement, getSlots: () => HTMLElement[], reduce: boolean): OrbHandle | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true }) as WebGLRenderingContext | null;
    if (!gl) return null;
  } catch {
    return null;
  }

  let prog: WebGLProgram;
  const geo = sphere(72, 72);
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch {
    return null;
  }
  gl.useProgram(prog);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  const U = (n: string) => gl!.getUniformLocation(prog, n);
  const uTime = U("uTime"), uPulse = U("uPulse"), uScale = U("uScale"), uDir = U("uDir"), uRes = U("uRes"), uCenter = U("uCenter"), uDark = U("uDark"), uHot = U("uHot");

  let W = 0, H = 0, dark = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl!.viewport(0, 0, canvas.width, canvas.height);
  }

  const pos = { x: 0, y: 0, r: 120 }, tgt = { x: 0, y: 0, r: 120 };
  let inited = false, pulse = 0, pulseT = 0, hot = 0, thinking = false, t = 0;
  let hasMouse = false;
  const mouse = { x: 0, y: 0 }, dir = { x: 0, y: 0 };

  function pick() {
    let best: DOMRect | null = null, bs = -9;
    for (const el of getSlots()) {
      const r = el.getBoundingClientRect();
      if (!r.width) continue;
      let sc = 1 - Math.abs(r.top + r.height / 2 - H * 0.5) / (H * 0.9);
      if (r.bottom < -40 || r.top > H + 40) sc -= 1;
      if (sc > bs) { bs = sc; best = r; }
    }
    return best;
  }

  function draw() {
    const r = pick();
    const visible = !!r && r.bottom > -120 && r.top < H + 120;
    canvas.style.opacity = visible ? "1" : "0";
    if (!visible) return;
    if (r) {
      tgt.x = r.left + r.width / 2; tgt.y = r.top + r.height / 2; tgt.r = Math.min(r.width, r.height) / 2;
      if (!inited) { pos.x = tgt.x; pos.y = tgt.y; pos.r = tgt.r; inited = true; }
    }
    const g = gl!;
    g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
    g.uniform1f(uTime, t); g.uniform1f(uPulse, pulse); g.uniform1f(uHot, hot); g.uniform1f(uDark, dark);
    g.uniform1f(uScale, Math.max(pos.r, 1) * 0.88);
    g.uniform2f(uRes, W, H);
    g.uniform2f(uCenter, pos.x - W / 2, H / 2 - pos.y);
    g.uniform3f(uDir, dir.x, dir.y, 1);
    g.drawElements(g.TRIANGLES, geo.idx.length, g.UNSIGNED_SHORT, 0);
  }

  let last = performance.now(), running = true, raf = 0;
  function loop() {
    if (!running) return;
    const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now;
    t += dt * (thinking ? 2.4 : 1);
    const k = 1 - Math.pow(0.0009, dt);
    pos.x += (tgt.x - pos.x) * k * 0.9; pos.y += (tgt.y - pos.y) * k * 0.9; pos.r += (tgt.r - pos.r) * k * 0.9;
    pulseT += ((thinking ? 0.7 : 0) - pulseT) * (1 - Math.pow(0.2, dt));
    pulse += (pulseT - pulse) * (1 - Math.pow(0.001, dt));
    hot += ((thinking ? 0.5 : 0) - hot) * (1 - Math.pow(0.15, dt));
    const len = Math.max(pos.r, 1) * 3;
    const mx = hasMouse ? Math.max(-1, Math.min(1, (mouse.x - pos.x) / len)) : 0, my = hasMouse ? Math.max(-1, Math.min(1, -(mouse.y - pos.y) / len)) : 0;
    dir.x += (mx - dir.x) * 0.1; dir.y += (my - dir.y) * 0.1;
    draw();
    raf = requestAnimationFrame(loop);
  }

  const onResize = () => { resize(); if (reduce) draw(); };
  const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; hasMouse = true; };
  const onVis = () => { running = !document.hidden; if (running && !reduce) { last = performance.now(); loop(); } };
  const onScroll = () => draw();
  const onLost = (e: Event) => { e.preventDefault(); running = false; };

  resize();
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("visibilitychange", onVis);
  canvas.addEventListener("webglcontextlost", onLost);
  if (reduce) { draw(); window.addEventListener("scroll", onScroll, { passive: true }); } else loop();

  return {
    kick(a) { pulseT = Math.max(pulseT, a); hot = Math.max(hot, a * 0.8); },
    think(on) { thinking = on; },
    setDark(d) { dark = d ? 1 : 0; if (reduce) draw(); },
    destroy() {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl!.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
