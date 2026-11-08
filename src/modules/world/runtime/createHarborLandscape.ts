import * as THREE from "three";
import { harborInside, type HarborPoint } from "../domain/coast-harbor";
import { harborJourneyStops } from "../domain/harbor-journey";
import type { Journey } from "../domain/coast-journey";
import { createHarborMagic } from "./harborMagic";
import { createHarborModeler } from "./harborModeling";
import {
  buildHarborArchitecture,
  buildHarborBeacon,
  buildHarborSkiff,
} from "./harborArchitecture";
import {
  buildHarborNature,
  buildHarborTerrain,
  harborShorePoint,
} from "./harborNature";

/** Coastal diorama: batched static scenery and separate animated pieces. */
export function createHarborLandscape(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "harbor-landscape";
  scene.add(root);
  const kit = createHarborModeler();
  const land = new THREE.Group();
  land.name = "harbor-static-scenery";
  root.add(land);
  buildHarborTerrain(land, kit);
  buildHarborArchitecture(land, kit);
  buildHarborBeacon(land, kit);
  buildHarborNature(land, kit);
  const canopy = land.getObjectByName("sea-house-canopy")!;
  root.updateMatrixWorld(true);
  root.attach(canopy);
  canopy.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (
      [kit.palette.cream, kit.palette.rock, kit.palette.rockLight].includes(
        object.material as THREE.MeshStandardMaterial,
      )
    )
      object.material = kit.palette.plaster;
    if (
      [kit.palette.dark, kit.palette.brass].includes(
        object.material as THREE.MeshStandardMaterial,
      )
    )
      object.material = kit.palette.wood;
    if (object.material === kit.palette.glass)
      object.material = kit.palette.roofLight;
  });
  kit.batch(canopy as THREE.Group);
  const markerSource = kit.mesh(
    root,
    "discovery-source",
    new THREE.OctahedronGeometry(0.24),
    kit.palette.glass,
  );
  markerSource.removeFromParent();
  const markers = new THREE.InstancedMesh(
    markerSource.geometry,
    kit.palette.glass,
    harborJourneyStops.length,
  );
  markers.name = "coast-discoveries";
  markers.frustumCulled = false;
  root.add(markers);
  const markerTransform = new THREE.Object3D();
  kit.batch(land);
  const skiff = buildHarborSkiff(root, kit);
  const magic = typeof window !== "undefined" ? createHarborMagic(root) : null;
  const foamGeometry = kit.sculptSurface(
    (u, v) => {
      const point = harborShorePoint(u * Math.PI * 2, 1.04 + v * 0.03);
      point.y = -0.148;
      return point;
    },
    160,
    2,
  );
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xe5e4ce,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const foam = new THREE.Mesh(foamGeometry, foamMaterial);
  foam.name = "tideline-foam";
  root.add(foam);
  const lights = [
    { x: 5.78, y: 2.56, z: -1.18, strength: 5.5, distance: 6 },
    { x: -6.7, y: 0.9, z: -2.65, strength: 2.8, distance: 4 },
    { x: -1.2, y: 1.56, z: 9.85, strength: 3, distance: 5 },
  ].map(({ x, y, z, strength, distance }) => {
    const light = new THREE.PointLight(0xffbd78, strength, distance, 2);
    light.position.set(x, y, z);
    root.add(light);
    return { light, strength };
  });
  const beaconLight = new THREE.PointLight(0xffce83, 0, 25, 2);
  beaconLight.position.set(-18, 7.14, -24);
  root.add(beaconLight);
  let disposed = false;
  let hearthLit = true;
  return {
    skiff,
    interact: (kind: "hearth" | "crystal") => {
      if (kind === "crystal") magic?.resonate();
      else hearthLit = !hearthLit;
    },
    update: (
      time: number,
      night: number,
      _player?: THREE.Vector3,
      reduced = false,
      boat?: HarborPoint,
      sailing = false,
      yaw = 0,
      journey?: Journey,
    ) => {
      magic?.update(time, night, reduced);
      beaconLight.intensity = journey?.beacon ? 35 : 0;
      if (boat) {
        skiff.position.x = boat.x;
        skiff.position.z = boat.z;
      }
      skiff.position.y = -0.03 + (reduced ? 0 : Math.sin(time * 1.1) * 0.035);
      skiff.rotation.z = reduced ? 0 : Math.sin(time * 0.8) * 0.022;
      if (sailing) skiff.rotation.y = yaw;
      canopy.visible = !_player || !harborInside(_player.x, _player.z);
      harborJourneyStops.forEach((stop, index) => {
        const visible =
          stop.id === "secret"
            ? !!journey?.beacon && night > 0.5
            : !journey?.fragments.some((id) => id === stop.id);
        markerTransform.position.set(stop.x, 1.25, stop.z);
        markerTransform.scale.setScalar(visible ? 1 : 0);
        markerTransform.rotation.y = reduced ? 0 : time * 0.5;
        markerTransform.updateMatrix();
        markers.setMatrixAt(index, markerTransform.matrix);
      });
      markers.instanceMatrix.needsUpdate = true;
      kit.palette.glass.emissiveIntensity = 0.3 + night * 1.5;
      lights.forEach(({ light, strength }) => {
        light.intensity =
          strength *
          (0.12 + night * 0.88) *
          (light === lights[0].light && !hearthLit ? 0.1 : 1);
      });
      foamMaterial.opacity =
        (0.11 + (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.11) * (1 - night * 0.65);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      magic?.dispose();
      markers.dispose();
      beaconLight.dispose();
      kit.dispose();
      foamGeometry.dispose();
      foamMaterial.dispose();
      lights.forEach(({ light }) => light.dispose());
      root.removeFromParent();
    },
  };
}
