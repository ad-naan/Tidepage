import * as THREE from "three";
import { createCoastEnvironment } from "./coastEnvironment";
import { createCoastAvatar } from "./createCoastAvatar";
import { createHarborLandscape } from "./createHarborLandscape";
import { createCoastCompanions } from "./createCoastCompanions";
import type {
  CoastIntent,
  CoastPlayer,
  CoastSnapshot,
  CoastPhotoComposition,
} from "@/shared/contracts/coast-space";
import {
  harborPlaces,
  harborDestinations,
  harborRoute,
  harborSpawn,
  harborWalkable,
  harborInside,
  harborSeating,
  harborStandingPoint,
  harborInteractions,
  HARBOR_RUN_SPEED,
  HARBOR_WALK_SPEED,
  type HarborInteraction,
  type HarborPlace,
  type HarborDestination,
  type HarborPoint,
} from "../domain/coast-harbor";
import type { CoastAvatar, AvatarPose } from "../domain/coast-avatar";

type HarborState = {
  appearance: CoastAvatar;
  night: boolean;
  studio: boolean;
  blocked: boolean;
  reduced: boolean;
};
export type HarborControls = {
  goTo: (place: HarborDestination) => void;
  pose: (pose: "idle" | "wave" | "sit") => void;
  capture: () => Promise<Blob>;
  captureTogether: (composition: CoastPhotoComposition) => Promise<Blob>;
  walkTo: (point: HarborPoint) => void;
  synchronize: (snapshot: CoastSnapshot, selfId: string) => void;
  clearCompanions: () => void;
  jump: () => void;
  interact: () => void;
  networkIntent: () => CoastIntent;
  dispose: () => void;
};

export function createHarborScene(options: {
  host: HTMLDivElement;
  state: () => HarborState;
  onPlace: (place: HarborPlace | null) => void;
  onPose: (pose: AvatarPose) => void;
  onInteraction: (interaction: HarborInteraction | null) => void;
  onVoyage: () => void;
  onError: () => void;
}): HarborControls {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  canvas.setAttribute("aria-hidden", "true");
  options.host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8b49b);
  scene.fog = new THREE.FogExp2(0xc2aa97, 0.003);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  const ambient = new THREE.HemisphereLight(0xffe7cb, 0x697f83, 2.3);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffd0a0, 3);
  sun.position.set(-12, 18, -18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -16,
    right: 16,
    top: 16,
    bottom: -16,
    near: 0.5,
    far: 70,
  });
  sun.shadow.bias = -0.001;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc9e2ed, 1.3);
  fill.position.set(5, 8, 12);
  scene.add(fill);
  const environment = createCoastEnvironment(scene, true);
  const landscape = createHarborLandscape(scene);
  const avatar = createCoastAvatar(options.state().appearance);
  const companions = createCoastCompanions(scene);
  let authority: CoastPlayer | null = null;
  let inputDirection = { x: 0, z: 0 };
  scene.add(avatar.root);
  avatar.root.position.set(harborSpawn.x, 0.49, harborSpawn.z);
  avatar.root.rotation.y = 0.3;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.49);
  const intersection = new THREE.Vector3();
  const target = new THREE.Vector3(0, 1.25, 3);
  const desiredTarget = new THREE.Vector3();
  const desiredCamera = new THREE.Vector3();
  const keys = new Set<string>();
  let route: HarborPoint[] = [];
  let arrival: "sit" | null = null;
  let seatingTarget = harborSeating[0];
  let pose: AvatarPose = "idle";
  let waveUntil = 0;
  let jumpUntil = 0;
  let interaction: HarborInteraction | null = null;
  let previous = performance.now();
  let elapsed = 0;
  let frame = 0;
  let disposed = false;
  let failed = false;
  let capturingTogether = false;
  let night = 0;
  let heading = 0.28;
  let elevation = 0.3;
  let distance = 14;
  let dragging: {
    id: number;
    x: number;
    y: number;
    lastX: number;
    lastY: number;
    moved: boolean;
  } | null = null;
  let lastAppearance = options.state().appearance;
  let lastPlace: HarborPlace | null = null;
  let lastStudio = false;
  const setPose = (next: AvatarPose) => {
    if (next === pose) return;
    pose = next;
    options.onPose(next);
  };
  const stand = () => {
    if (pose === "sit") {
      const point = harborStandingPoint(avatar.root.position);
      avatar.root.position.set(point.x, 0.49, point.z);
    }
    setPose("idle");
  };
  function goTo(place: HarborDestination) {
    stand();
    route = harborRoute(avatar.root.position, harborDestinations[place]);
    arrival = null;
    keys.clear();
  }
  function selectPose(next: "idle" | "wave" | "sit") {
    stand();
    route = [];
    keys.clear();
    arrival = null;
    if (next === "sit") {
      seatingTarget = [...harborSeating].sort(
        (a, b) =>
          Math.hypot(
            a.approach.x - avatar.root.position.x,
            a.approach.z - avatar.root.position.z,
          ) -
          Math.hypot(
            b.approach.x - avatar.root.position.x,
            b.approach.z - avatar.root.position.z,
          ),
      )[0];
      route = harborRoute(avatar.root.position, seatingTarget.approach);
      arrival = "sit";
    } else {
      setPose(next);
      waveUntil = performance.now() + 2500;
    }
  }
  function jump() {
    if (
      options.state().blocked ||
      options.state().studio ||
      performance.now() < jumpUntil
    )
      return;
    stand();
    jumpUntil = performance.now() + 750;
    setPose("jump");
  }
  function interact() {
    if (options.state().blocked || options.state().studio) return;
    if (interaction === "bench" || interaction === "chair" || interaction === "squareLeft" || interaction === "squareRight")
      selectPose(pose === "sit" ? "idle" : "sit");
    else if (interaction === "door") {
      stand();
      route = harborRoute(
        avatar.root.position,
        harborInside(avatar.root.position.x, avatar.root.position.z)
          ? { x: 4.5, z: 0.1 }
          : { x: 4.5, z: -2.7 },
      );
    } else if (interaction === "sail") options.onVoyage();
    else if (interaction === "hearth" || interaction === "crystal")
      landscape.interact(interaction);
  }
  const relevantKeys = new Set([
    "w",
    "a",
    "s",
    "d",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "j",
    "l",
    "i",
    "k",
    "q",
    "e",
    "r",
    "shift",
    " ",
  ]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest(
        "input, textarea, select, [role=combobox], [role=dialog]",
      ) ||
        event.target.isContentEditable)
    )
      return;
    const state = options.state();
    const key = event.key.toLowerCase();
    if (
      key === " " &&
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    )
      return;
    if (state.blocked || state.studio || !relevantKeys.has(key)) return;
    event.preventDefault();
    if (key === "e") {
      if (!event.repeat) interact();
      return;
    }
    if (key === " ") {
      if (!event.repeat) jump();
      return;
    }
    keys.add(key);
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    ) {
      stand();
      route = [];
      arrival = null;
    }
  };
  const onKeyUp = (event: KeyboardEvent) =>
    keys.delete(event.key.toLowerCase());
  const clearInput = () => {
    keys.clear();
    dragging = null;
  };
  const onDown = (event: PointerEvent) => {
    if (options.state().blocked || options.state().studio || dragging) return;
    options.host.parentElement?.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    dragging = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    };
  };
  const onMove = (event: PointerEvent) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - dragging.x, event.clientY - dragging.y) > 6)
      dragging.moved = true;
    if (dragging.moved) {
      heading -= (event.clientX - dragging.lastX) * 0.006;
      elevation = THREE.MathUtils.clamp(
        elevation + (event.clientY - dragging.lastY) * 0.004,
        0.15,
        0.95,
      );
    }
    dragging.lastX = event.clientX;
    dragging.lastY = event.clientY;
  };
  const onUp = (event: PointerEvent) => {
    if (!dragging || dragging.id !== event.pointerId) return;
    const moved = dragging.moved;
    clearInput();
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    if (moved || options.state().blocked || options.state().studio) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    if (
      raycaster.ray.intersectPlane(floor, intersection) &&
      harborWalkable(intersection.x, intersection.z)
    ) {
      stand();
      route = harborRoute(avatar.root.position, intersection);
      arrival = null;
    }
  };
  const onWheel = (event: WheelEvent) => {
    if (options.state().studio || options.state().blocked) return;
    event.preventDefault();
    distance = THREE.MathUtils.clamp(distance + event.deltaY * 0.008, 6, 22);
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    failed = true;
    cancelAnimationFrame(frame);
    options.onError();
  };
  const resize = () => {
    const { clientWidth: width, clientHeight: height } = options.host;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(options.host);
  resize();
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", clearInput);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("webglcontextlost", onLost);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearInput);

  function update(now: number) {
    if (disposed || failed) return;
    if (capturingTogether) {
      previous = now;
      frame = requestAnimationFrame(update);
      return;
    }
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const state = options.state();
    if (!state.blocked) elapsed += delta;
    if (state.appearance !== lastAppearance) {
      avatar.dress(state.appearance);
      lastAppearance = state.appearance;
    }
    if (state.blocked || state.studio) keys.clear();
    if (state.studio && !lastStudio) {
      route = [];
      arrival = null;
      stand();
    }
    lastStudio = state.studio;
    let dx = 0,
      dz = 0;
    inputDirection = { x: 0, z: 0 };
    if (!state.studio && !state.blocked) {
      heading += ((keys.has("j") ? 1 : 0) - (keys.has("l") ? 1 : 0)) * delta;
      elevation = THREE.MathUtils.clamp(
        elevation +
          ((keys.has("i") ? 1 : 0) - (keys.has("k") ? 1 : 0)) * delta * 0.5,
        0.15,
        0.95,
      );
      distance = THREE.MathUtils.clamp(
        distance +
          ((keys.has("q") ? 1 : 0) - (keys.has("r") ? 1 : 0)) * delta * 6,
        6,
        22,
      );
      const side =
        Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft"));
      const forward =
        Number(keys.has("w") || keys.has("arrowup")) -
        Number(keys.has("s") || keys.has("arrowdown"));
      dx = side * Math.cos(heading) - forward * Math.sin(heading);
      dz = -side * Math.sin(heading) - forward * Math.cos(heading);
      if (!dx && !dz && route.length) {
        const step = route[0];
        dx = step.x - avatar.root.position.x;
        dz = step.z - avatar.root.position.z;
        if (Math.hypot(dx, dz) < 0.08) {
          route.shift();
          dx = 0;
          dz = 0;
        }
      }
      const length = Math.hypot(dx, dz);
      if (length > 0) {
        const speed = keys.has("shift") ? HARBOR_RUN_SPEED : HARBOR_WALK_SPEED;
        const step = Math.min(speed * delta, route.length ? length : Infinity);
        let nx = avatar.root.position.x + (dx / length) * step;
        let nz = avatar.root.position.z + (dz / length) * step;
        if (!harborWalkable(nx, nz)) {
          if (harborWalkable(nx, avatar.root.position.z))
            nz = avatar.root.position.z;
          else if (harborWalkable(avatar.root.position.x, nz))
            nx = avatar.root.position.x;
        }
        if (harborWalkable(nx, nz)) {
          inputDirection = { x: dx / length, z: dz / length };
          avatar.root.position.x = nx;
          avatar.root.position.z = nz;
          const facing = Math.atan2(dx, dz);
          avatar.root.rotation.y +=
            Math.atan2(
              Math.sin(facing - avatar.root.rotation.y),
              Math.cos(facing - avatar.root.rotation.y),
            ) * Math.min(1, delta * 12);
          setPose(keys.has("shift") ? "run" : "walk");
        } else {
          route = [];
          arrival = null;
          setPose("idle");
        }
      } else if (!route.length && arrival === "sit") {
        const seat =
          seatingTarget.seats[Math.floor(seatingTarget.seats.length / 2)];
        avatar.root.position.set(seat.x, 0.49, seat.z);
        avatar.root.rotation.y = seatingTarget.yaw;
        setPose("sit");
        arrival = null;
      } else if (
        pose === "walk" ||
        pose === "run" ||
        (pose === "jump" && now > jumpUntil) ||
        (pose === "wave" && now > waveUntil)
      )
        setPose("idle");
      if (now < jumpUntil) setPose("jump");
    }
    if (authority) {
      const gap = Math.hypot(
        avatar.root.position.x - authority.x,
        avatar.root.position.z - authority.z,
      );
      if (pose === "sit" && authority.pose === "sit") {
        avatar.root.position.set(authority.x, 0.49, authority.z);
      } else if (pose !== "sit" && authority.pose !== "sit") {
        const blend = gap > 3 ? 1 : 1 - Math.exp(-delta * 4);
        avatar.root.position.x = THREE.MathUtils.lerp(
          avatar.root.position.x,
          authority.x,
          blend,
        );
        avatar.root.position.z = THREE.MathUtils.lerp(
          avatar.root.position.z,
          authority.z,
          blend,
        );
      }
    }
    companions.update(now / 1000, delta, state.reduced);
    const near =
      (
        Object.entries(harborInteractions) as [
          HarborInteraction,
          { x: number; z: number; radius: number },
        ][]
      )
        .map(([id, point]) => ({
          id,
          distance: Math.hypot(
            point.x - avatar.root.position.x,
            point.z - avatar.root.position.z,
          ),
          radius: point.radius,
        }))
        .filter((point) => point.distance < point.radius)
        .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
    if (near !== interaction) {
      interaction = near;
      options.onInteraction(near);
    }
    const place =
      (Object.entries(harborPlaces) as [HarborPlace, HarborPoint][]).find(
        ([, point]) =>
          Math.hypot(
            point.x - avatar.root.position.x,
            point.z - avatar.root.position.z,
          ) < 1.65,
      )?.[0] ?? null;
    if (place !== lastPlace) {
      options.onPlace(place);
      lastPlace = place;
    }
    night = THREE.MathUtils.damp(
      night,
      state.night ? 1 : 0,
      2.5,
      state.reduced ? 1 : delta,
    );
    ambient.intensity = THREE.MathUtils.lerp(2.3, 0.65, night);
    sun.intensity = THREE.MathUtils.lerp(3, 0.4, night);
    sun.color.set(0xffd0a0).lerp(new THREE.Color(0x9bb5e2), night);
    fill.intensity = THREE.MathUtils.lerp(1.3, 0.65, night);
    (scene.background as THREE.Color)
      .set(0xd8b49b)
      .lerp(new THREE.Color(0x0a1628), night);
    avatar.update(elapsed, pose, state.reduced);
    landscape.update(elapsed, night, avatar.root.position, state.reduced);
    environment.update(
      state.reduced ? 0 : elapsed,
      night,
      new THREE.Vector3(1000, 0, 1000),
      0,
    );
    const p = avatar.root.position;
    desiredTarget.set(
      p.x,
      p.y + (state.studio ? (camera.aspect < 0.8 ? 0.05 : 1.2) : 0.95),
      p.z,
    );
    const cameraHeading = state.studio
      ? avatar.root.rotation.y + 0.18
      : heading;
    const inside = harborInside(p.x, p.z);
    const cameraElevation = state.studio ? 0.12 : inside ? 0.72 : elevation;
    const cameraDistance = state.studio
      ? camera.aspect < 0.8
        ? 8.1
        : 4.5
      : (inside ? 7 : distance) * (camera.aspect < 0.8 ? 1.15 : 1);
    // Leave the right third clear for the nonmodal wardrobe on desktop.
    if (state.studio && camera.aspect > 1.1) desiredTarget.x += 0.9;
    target.lerp(desiredTarget, state.reduced ? 1 : 1 - Math.exp(-delta * 5));
    desiredCamera.set(
      target.x +
        Math.sin(cameraHeading) * Math.cos(cameraElevation) * cameraDistance,
      target.y + Math.sin(cameraElevation) * cameraDistance,
      target.z +
        Math.cos(cameraHeading) * Math.cos(cameraElevation) * cameraDistance,
    );
    camera.position.lerp(
      desiredCamera,
      state.reduced ? 1 : 1 - Math.exp(-delta * 5),
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(update);
  }
  camera.position.set(5, 7, 17);
  const visibility = () => {
    clearInput();
    cancelAnimationFrame(frame);
    if (!document.hidden && !disposed && !failed) {
      previous = performance.now();
      frame = requestAnimationFrame(update);
    }
  };
  document.addEventListener("visibilitychange", visibility);
  frame = requestAnimationFrame(update);
  return {
    goTo,
    walkTo: (point) => {
      stand();
      route = harborRoute(avatar.root.position, point);
      arrival = null;
      keys.clear();
    },
    pose: selectPose,
    jump,
    interact,
    synchronize: (snapshot, selfId) => {
      const self = snapshot.players.find((player) => player.id === selfId);
      if (!self) return;
      if (!authority) {
        route = [];
        keys.clear();
        arrival = null;
        avatar.root.position.set(self.x, 0.49, self.z);
        avatar.root.rotation.y = self.yaw;
        setPose(self.pose);
      }
      authority = self;
      if (snapshot.photo?.state === "scheduled") {
        route = [];
        keys.clear();
        arrival = null;
        inputDirection = { x: 0, z: 0 };
        avatar.root.position.set(self.x, 0.49, self.z);
        avatar.root.rotation.y = self.yaw;
        setPose(self.pose);
      }
      companions.reconcile(snapshot.players, selfId);
    },
    clearCompanions: () => {
      authority = null;
      companions.clear();
    },
    networkIntent: () => {
      const state = options.state();
      return {
        direction:
          state.studio || state.blocked || document.hidden
            ? { x: 0, z: 0 }
            : inputDirection,
        action:
          pose === "sit"
            ? "sit"
            : pose === "wave"
              ? "wave"
              : pose === "jump"
                ? "jump"
                : "idle",
        running: keys.has("shift") && !state.blocked && !state.studio,
      };
    },
    capture: () =>
      new Promise<Blob>((resolve, reject) => {
        if (disposed || failed) {
          reject(new Error("Scene unavailable"));
          return;
        }
        renderer.render(scene, camera);
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Capture failed")),
          "image/png",
        );
      }),
    captureTogether: async (composition) => {
      if (disposed || failed || capturingTogether)
        throw new Error("Scene unavailable");
      capturingTogether = true;
      const size = renderer.getSize(new THREE.Vector2()),
        pixelRatio = renderer.getPixelRatio();
      const models = composition.players.map((player) => {
        const model = createCoastAvatar(player.appearance);
        model.root.position.set(player.x, 0.49, player.z);
        model.root.rotation.y = player.yaw;
        model.update(0.4, "wave", options.state().reduced);
        scene.add(model.root);
        return model;
      });
      const photoCamera = new THREE.PerspectiveCamera(38, 1.5, 0.1, 300);
      photoCamera.position.set(-4.5, 3.8, 11.7);
      photoCamera.lookAt(-4.5, 1.5, 3.2);
      const blend = composition.night ? 1 : 0;
      const saved = {
        ambient: ambient.intensity,
        sun: sun.intensity,
        color: sun.color.clone(),
        fill: fill.intensity,
        background: (scene.background as THREE.Color).clone(),
      };
      try {
        avatar.root.visible = false;
        companions.setVisible(false);
        ambient.intensity = THREE.MathUtils.lerp(2.3, 0.65, blend);
        sun.intensity = THREE.MathUtils.lerp(3, 0.4, blend);
        sun.color.set(0xffd0a0).lerp(new THREE.Color(0x9bb5e2), blend);
        fill.intensity = THREE.MathUtils.lerp(1.3, 0.65, blend);
        (scene.background as THREE.Color)
          .set(0xd8b49b)
          .lerp(new THREE.Color(0x0a1628), blend);
        landscape.update(
          elapsed,
          blend,
          new THREE.Vector3(-4.5, 0.49, 3.2),
          options.state().reduced,
        );
        environment.update(0, blend, new THREE.Vector3(1000, 0, 1000), 0);
        renderer.setPixelRatio(1);
        renderer.setSize(1440, 960, false);
        renderer.render(scene, photoCamera);
        return await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (blob) =>
              blob ? resolve(blob) : reject(new Error("Capture failed")),
            "image/png",
          ),
        );
      } finally {
        models.forEach((model) => model.dispose());
        avatar.root.visible = true;
        companions.setVisible(true);
        ambient.intensity = saved.ambient;
        sun.intensity = saved.sun;
        sun.color.copy(saved.color);
        fill.intensity = saved.fill;
        (scene.background as THREE.Color).copy(saved.background);
        if (!disposed) {
          renderer.setPixelRatio(pixelRatio);
          renderer.setSize(size.x, size.y, false);
        }
        capturingTogether = false;
      }
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", clearInput);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onLost);
      avatar.dispose();
      companions.clear();
      landscape.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
