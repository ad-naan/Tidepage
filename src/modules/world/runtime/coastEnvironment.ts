import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";

// Sky and ocean share the same light direction. Reflection is rendered from the scene.
export function createCoastEnvironment(scene: THREE.Scene) {
  const direction = new THREE.Vector3(-0.38, 0.09, -1).normalize();
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      night: { value: 0 },
      time: { value: 0 },
      sunDirection: { value: direction },
    },
    vertexShader: `varying vec3 ray; void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 ray;uniform float night;uniform float time;uniform vec3 sunDirection;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+3.7;a*=.5;}return v;}
    void main(){vec3 r=normalize(ray);float h=max(r.y,0.);float sun=max(dot(r,sunDirection),0.);
      vec3 dusk=mix(vec3(.95,.31,.105),vec3(.10,.21,.35),smoothstep(-.04,.65,r.y));
      dusk=mix(dusk,vec3(1.02,.66,.35),pow(sun,7.)*.55);dusk+=vec3(1.,.53,.21)*pow(sun,64.)*.65;
      vec3 midnight=mix(vec3(.012,.025,.052),vec3(.001,.003,.012),smoothstep(0.,.7,h));
      vec2 cloudUV=r.xz/(max(r.y,.04))*.6+vec2(time*.0015,0.);float cloud=smoothstep(.50,.77,fbm(cloudUV*2.));cloud*=smoothstep(.01,.14,r.y)*(1.-smoothstep(.55,.9,r.y));
      dusk=mix(dusk,vec3(.65,.45,.4)+pow(sun,12.)*vec3(.65,.29,.10),cloud*.45);
      vec3 col=mix(dusk,midnight,night);
      float band=exp(-pow((r.x*.67+r.y*.35+r.z*.55-.14)*9.,2.));float dust=fbm(r.xz*16.+r.y*7.);
      col+=night*band*vec3(.038,.042,.08)*smoothstep(.26,.7,dust)*smoothstep(.08,.3,h);
      float disc=smoothstep(.99955,.9998,sun);float crater=.8+.2*fbm(r.xz*450.);
      col+=mix(vec3(3.,1.8,.7),vec3(.9,1.1,1.35)*crater,night)*disc;
      col+=mix(vec3(.7,.23,.05),vec3(.15,.21,.35),night)*pow(sun,260.)*.3;
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  const skyGeometry = new THREE.SphereGeometry(170, 48, 24);
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(sky);
  const waterGeometry = new THREE.PlaneGeometry(340, 340);
  const water = new Reflector(waterGeometry, {
    textureWidth: 768,
    textureHeight: 768,
    multisample: 0,
    clipBias: 0.002,
    shader: {
      name: "CoastalWater",
      uniforms: {
        color: { value: new THREE.Color() },
        tDiffuse: { value: null },
        textureMatrix: { value: new THREE.Matrix4() },
        time: { value: 0 },
        night: { value: 0 },
        sunDirection: { value: direction },
        ripple: { value: new THREE.Vector3(1000, 1000, -100) },
        wake: { value: new THREE.Vector3(1000, 1000, 0) },
      },
      vertexShader: `uniform mat4 textureMatrix;varying vec4 reflected;varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;reflected=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform float time;uniform float night;uniform vec3 sunDirection;uniform vec3 ripple;uniform vec3 wake;varying vec4 reflected;varying vec3 world;
    float wave(vec2 p){float h=0.;float f=.65,a=.12;vec2 dir=vec2(.8,.6);for(int i=0;i<7;i++){h+=sin(dot(p,dir)*f+time*(.7+float(i)*.19))*a;dir=mat2(.8,-.6,.6,.8)*dir;f*=1.83;a*=.48;}return h;}
    void main(){vec2 p=world.xz;float e=.045;float h=wave(p);vec3 n=normalize(vec3((h-wave(p+vec2(e,0.)))/e,1.,(h-wave(p+vec2(0.,e)))/e));vec3 view=normalize(cameraPosition-world);float distanceToEye=distance(cameraPosition,world);
      vec2 uv=reflected.xy/reflected.w;uv+=n.xz*.014*min(1.,14./distanceToEye);vec3 reflection=texture2D(tDiffuse,clamp(uv,.002,.998)).rgb;
      float fresnel=.05+.93*pow(1.-max(dot(n,view),0.),4.);vec3 deep=mix(vec3(.015,.10,.12),vec3(.003,.018,.038),night);vec3 sea=mix(deep,reflection,.42+fresnel*.55);
      float spec=pow(max(dot(reflect(-sunDirection,n),view),0.),180.);sea+=mix(vec3(1.7,.67,.2),vec3(.4,.65,1.),night)*spec;
      float age=time-ripple.z;float d=distance(p,ripple.xy);float ring=exp(-pow((d-age*2.2)*4.,2.))*max(0.,1.-age/3.);if(age>=0.)sea+=ring*vec3(.13,.23,.23);
      vec2 trail=p-wake.xy;float wakeGlow=exp(-dot(trail,trail)*.48)*wake.z*(.35+.65*pow(sin(d*12.-time*4.),2.));sea+=wakeGlow*mix(vec3(.1,.16,.14),vec3(.015,.45,.62),night);
      gl_FragColor=vec4(sea,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
    },
  });
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.16;
  scene.add(water);
  const wm = water.material as THREE.ShaderMaterial;
  // Seeded star field, varied magnitudes, a higher concentration around the Milky Way.
  const points: number[] = [],
    sizes: number[] = [],
    phases: number[] = [];
  let seed = 48271;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 2400; i++) {
    const a = random() * Math.PI * 2,
      y = 0.025 + random() * 0.97,
      r = Math.sqrt(1 - y * y);
    points.push(Math.cos(a) * r * 155, y * 155, Math.sin(a) * r * 155);
    sizes.push(0.65 + Math.pow(random(), 5) * 2.7);
    phases.push(random() * 6.28);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  starGeometry.setAttribute(
    "magnitude",
    new THREE.Float32BufferAttribute(sizes, 1),
  );
  starGeometry.setAttribute(
    "phase",
    new THREE.Float32BufferAttribute(phases, 1),
  );
  const starMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      night: { value: 0 },
      time: { value: 0 },
      pixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `attribute float magnitude;attribute float phase;uniform float time;uniform float pixelRatio;varying float glow;void main(){glow=.65+.35*sin(time*.7+phase);gl_PointSize=magnitude*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float night;varying float glow;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(.78,.85,1.,smoothstep(.5,.05,d)*night*glow);}`,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);
  return {
    water,
    direction,
    ripple: (x: number, z: number, t: number) =>
      wm.uniforms.ripple.value.set(x, z, t),
    update: (
      time: number,
      night: number,
      boat: THREE.Vector3,
      speed: number,
    ) => {
      direction
        .set(-0.38, THREE.MathUtils.lerp(0.09, 0.38, night), -1)
        .normalize();
      skyMaterial.uniforms.night.value = night;
      skyMaterial.uniforms.time.value = time;
      wm.uniforms.night.value = night;
      wm.uniforms.time.value = time;
      wm.uniforms.sunDirection.value.copy(direction);
      wm.uniforms.wake.value.set(boat.x, boat.z, speed);
      starMaterial.uniforms.night.value = night;
      starMaterial.uniforms.time.value = time;
    },
    dispose: () => {
      water.dispose();
      waterGeometry.dispose();
      skyGeometry.dispose();
      skyMaterial.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
    },
  };
}
