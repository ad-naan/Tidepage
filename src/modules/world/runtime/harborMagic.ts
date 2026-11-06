import * as THREE from "three";

/** Quiet ambient life stays outside simulation and respects reduced motion. */
export function createHarborMagic(parent: THREE.Object3D) {
  const positions: number[] = [],
    phases: number[] = [];
  for (let i = 0; i < 140; i++) {
    const a = i * 2.39996;
    positions.push(
      Math.sin(a) * (3 + (i % 7) * 0.8),
      0.8 + (i % 13) * 0.2,
      -3.4 + Math.cos(a) * 3,
    );
    phases.push(i * 0.71);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("phase", new THREE.Float32BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      time: { value: 0 },
      night: { value: 0 },
      pulse: { value: 0 },
      ratio: { value: Math.min(window.devicePixelRatio, 1.75) },
    },
    vertexShader: `attribute float phase;uniform float time;uniform float ratio;varying float light;void main(){vec3 p=position;p.x+=sin(time*.22+phase)*.18;p.y+=sin(time*.38+phase)*.16;light=.5+.5*sin(time*.7+phase);vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(22./max(1.,-mv.z),1.2,4.)*ratio;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float night;uniform float pulse;varying float light;void main(){float a=smoothstep(.5,.05,length(gl_PointCoord-.5));gl_FragColor=vec4(mix(vec3(.36,.9,.82),vec3(.82,.61,1.),light),a*(.18+night*.5+pulse*.3)*light);}`,
  });
  const motes = new THREE.Points(geometry, material);
  motes.name = "tidal-fireflies";
  parent.add(motes);
  const ringGeometry = new THREE.RingGeometry(0.36, 0.39, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x81e5dc,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.position.set(-1.6, 0.48, -4.5);
  ring.rotation.x = -Math.PI / 2;
  parent.add(ring);
  let until = 0;
  return {
    resonate: () => {
      until = performance.now() + 5000;
    },
    update: (time: number, night: number, reduced: boolean) => {
      const remaining = Math.max(0, until - performance.now()) / 5000;
      material.uniforms.time.value = reduced ? 0 : time;
      material.uniforms.night.value = night;
      material.uniforms.pulse.value = remaining;
      ringMaterial.opacity = remaining * (reduced ? 0.25 : 0.4);
      ring.scale.setScalar(reduced ? 2 : 1 + (1 - remaining) * 7);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      motes.removeFromParent();
      ring.removeFromParent();
    },
  };
}
