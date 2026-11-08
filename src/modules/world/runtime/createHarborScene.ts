import * as THREE from "three";
import { createCoastEnvironment } from "./coastEnvironment";
import { createCoastAvatar } from "./createCoastAvatar";
import { acquireCoastAvatarAsset } from "./coastAvatarAsset";
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
  harborMooring,
  harborLanding,
  harborSailingRoute,
  HARBOR_SAIL_SPEED,
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
import { harborInputKey } from "../domain/coast-movement";
import { clampHarborPitch, harborCameraFrame } from "../domain/harbor-camera";
import {
  harborCompanion,
  harborTurtle,
  nearHarborCompanion,
} from "../domain/harbor-companion";
import { createHarborCompanion } from "./createHarborCompanion";
import { createHarborTurtle } from "./createHarborTurtle";
import { updateHarborSpeechAnchors } from "./harborSpeechAnchors";
import {
  createHarborFollower,
  createHarborMoments,
  companionApproach,
  type HarborMoment,
} from "../domain/harbor-company";

import { harborGroundHeight, harborSailable } from "../domain/harbor-terrain";
import { harborJourneyStops } from "../domain/harbor-journey";
import type { Journey, JourneyId } from "../domain/coast-journey";

type HarborState = {
  journey: Journey;
  appearance: CoastAvatar;
  night: boolean;
  studio: boolean;
  talking: boolean;
  saying: boolean;
  listening: boolean;
  quiet: boolean;
  blocked: boolean;
  reduced: boolean;
};
export type HarborControls = {
  goTo: (place: HarborDestination) => void;
  voyage: () => void;
  pose: (pose: "idle" | "wave" | "sit") => void;
  capture: () => Promise<Blob>;
  captureTogether: (composition: CoastPhotoComposition) => Promise<Blob>;
  walkTo: (point: HarborPoint) => void;
  synchronize: (snapshot: CoastSnapshot, selfId: string) => void;
  clearCompanions: () => void;
  jump: () => void;
  interact: () => void;
  meetCompanion: () => void;
  setCompany: (following: boolean) => void;
  lookSky: () => void;
  say: () => void;
  networkIntent: () => CoastIntent;
  dispose: () => void;
};

type HarborSceneOptions = {
  signal?: AbortSignal;
  host: HTMLDivElement;
  speechHost?: HTMLElement;
  state: () => HarborState;
  onPlace: (place: HarborPlace | null) => void;
  onLocation: (place: HarborDestination | null) => void;
  onPose: (pose: AvatarPose) => void;
  onInteraction: (interaction: HarborInteraction | null) => void;
  onTravel: (sailing: boolean) => void;
  onTalk: () => void;
  onSay: () => void;
  onSky: (sky: boolean) => void;
  onMoment: (moment: HarborMoment) => void;
  onCompany: (following: boolean) => void;
  onTurtleNearby: (nearby: boolean) => void;
  onJourney: (id: JourneyId) => void;
  onNearbyJourney: (id: JourneyId | null) => void;
  onNavigation: (reason: "noRoute" | "needBoat" | "upgrade") => void;
  onError: () => void;
};

export async function createHarborScene(
  options: HarborSceneOptions,
): Promise<HarborControls> {
  const lease = await acquireCoastAvatarAsset();
  try {
    if (options.signal?.aborted)
      throw new DOMException("Scene cancelled", "AbortError");
    return createLoadedHarborScene(options, lease);
  } catch (error) {
    lease.release();
    throw error;
  }
}

function createLoadedHarborScene(
  options: HarborSceneOptions,
  lease: Awaited<ReturnType<typeof acquireCoastAvatarAsset>>,
): HarborControls {
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
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 20000);
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
  const otter = createHarborCompanion(scene);
  const turtle = createHarborTurtle(scene);
  const otterFollower = createHarborFollower(harborCompanion.position, -1);
  const turtleFollower = createHarborFollower(harborTurtle.position, 1);
  const moments = createHarborMoments();
  let following = false;
  let turtleNearby = true;
  let companyMoment: HarborMoment | null = null;
  let companyDelay = 0;
  const avatar = createCoastAvatar(options.state().appearance, lease.asset);
  const companions = createCoastCompanions(scene, lease.asset);
  let authority: CoastPlayer | null = null;
  let sailing = false;
  let requestedTravel: "walk" | "sail" = "walk";
  let boat = { ...harborMooring };
  let nearbyJourney: JourneyId | null = null;
  let boardOnArrival = false;
  let talkOnArrival = false;
  const setTravel = (next: boolean) => {
    if (next !== sailing) options.onTravel(next);
    sailing = next;
    requestedTravel = next ? "sail" : "walk";
  };
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
  let previousElevation = elevation;
  let lookingSky = false;
  function setElevation(value: number) {
    elevation = clampHarborPitch(value);
    if (lookingSky !== elevation < 0) {
      lookingSky = elevation < 0;
      options.onSky(lookingSky);
    }
  }
  function lookSky() {
    if (options.state().blocked || options.state().studio) return;
    if (elevation < 0) setElevation(previousElevation);
    else {
      previousElevation = elevation;
      setElevation(-0.85);
    }
  }
  function say() {
    if (options.state().blocked || options.state().studio) return;
    route = [];
    arrival = null;
    boardOnArrival = false;
    talkOnArrival = false;
    keys.clear();
    if (pose !== "sit") setPose("idle");
    options.onSay();
  }
  function talk() {
    if (!canTalk()) return;
    stand();
    route = [];
    keys.clear();
    arrival = null;
    boardOnArrival = false;
    talkOnArrival = false;
    jumpUntil = 0;
    setPose("idle");
    avatar.root.rotation.y = Math.atan2(
      otter.root.position.x - avatar.root.position.x,
      otter.root.position.z - avatar.root.position.z,
    );
    options.onTalk();
  }
  function canTalk() {
    return (
      nearHarborCompanion(avatar.root.position, otter.root.position) ||
      (sailing && avatar.root.position.distanceTo(otter.root.position) < 5)
    );
  }
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
  let lastLocation: HarborDestination | null = null;
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
  function navigate(point: HarborPoint) {
    talkOnArrival = false;
    stand();
    route = sailing
      ? harborSailingRoute(avatar.root.position, point)
      : harborRoute(avatar.root.position, point);
    arrival = null;
    keys.clear();
    if (!route.length) options.onNavigation(sailing ? "noRoute" : "needBoat");
  }
  function goTo(place: HarborDestination) {
    boardOnArrival = false;
    navigate(harborDestinations[place]);
  }
  function changeTravel() {
    talkOnArrival = false;
    if (authority && authority.travel === undefined) {
      options.onNavigation("upgrade");
      return;
    }
    route = [];
    keys.clear();
    arrival = null;
    if (sailing) {
      const landing = harborLanding(avatar.root.position);
      if (!landing) return;
      boat = { x: avatar.root.position.x, z: avatar.root.position.z };
      requestedTravel = "walk";
      if (!authority) {
        setTravel(false);
        avatar.root.position.set(
          landing.x,
          harborGroundHeight(landing.x, landing.z),
          landing.z,
        );
      }
    } else {
      if (
        Math.hypot(
          avatar.root.position.x - boat.x,
          avatar.root.position.z - boat.z,
        ) > 3.2
      )
        return;
      requestedTravel = "sail";
      if (!authority) {
        stand();
        setTravel(true);
        avatar.root.position.set(boat.x, 0.1, boat.z);
      }
    }
  }
  function voyage() {
    if (options.state().blocked || options.state().studio) return;
    if (
      sailing ||
      Math.hypot(
        avatar.root.position.x - boat.x,
        avatar.root.position.z - boat.z,
      ) < 3.2
    ) {
      changeTravel();
      return;
    }
    const landing = harborLanding(boat);
    if (!landing) {
      options.onNavigation("noRoute");
      return;
    }
    navigate(landing);
    boardOnArrival = route.length > 0;
  }
  function selectPose(next: "idle" | "wave" | "sit") {
    talkOnArrival = false;
    if (sailing) {
      if (next === "wave") {
        setPose("wave");
        waveUntil = performance.now() + 2500;
      }
      return;
    }
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
      if (!route.length) {
        options.onNavigation("needBoat");
        return;
      }
      arrival = "sit";
    } else {
      setPose(next);
      waveUntil = performance.now() + 2500;
    }
  }
  function jump() {
    if (
      sailing ||
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
    if (interaction === "talk") talk();
    else if (interaction === "bench" || interaction === "chair")
      selectPose(pose === "sit" ? "idle" : "sit");
    else if (interaction === "door") {
      stand();
      route = harborRoute(
        avatar.root.position,
        harborInside(avatar.root.position.x, avatar.root.position.z)
          ? { x: 4.5, z: 0.1 }
          : { x: 4.5, z: -2.7 },
      );
    } else if (interaction === "sail" || interaction === "land") changeTravel();
    else if (interaction === "hearth" || interaction === "crystal")
      landscape.interact(interaction);
    else if (nearbyJourney) options.onJourney(nearbyJourney);
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
    "v",
    "enter",
    "shift",
    " ",
  ]);
  const onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest(
        "input, textarea, select, dialog, [role=combobox], [role=dialog]",
      ) ||
        event.target.isContentEditable)
    )
      return;
    const state = options.state();
    const key = harborInputKey(event);
    if (
      (key === " " || key === "enter") &&
      event.target instanceof HTMLElement &&
      event.target.closest("button")
    )
      return;
    if (state.blocked || state.studio || !relevantKeys.has(key)) return;
    event.preventDefault();
    if (key === "enter") {
      if (!event.repeat) say();
      return;
    }
    if (key === "v") {
      if (!event.repeat) lookSky();
      return;
    }
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
      boardOnArrival = false;
      talkOnArrival = false;
    }
  };
  const onKeyUp = (event: KeyboardEvent) => keys.delete(harborInputKey(event));
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
      setElevation(elevation + (event.clientY - dragging.lastY) * 0.004);
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
    if (raycaster.intersectObject(otter.root, true).length) {
      meetCompanion();
      return;
    }
    if (raycaster.ray.intersectPlane(floor, intersection)) {
      boardOnArrival = false;
      navigate(intersection);
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
    if (!state.blocked || state.talking || state.saying) elapsed += delta;
    if (state.appearance !== lastAppearance) {
      avatar.dress(state.appearance);
      lastAppearance = state.appearance;
    }
    if (state.blocked || state.studio) keys.clear();
    if (state.studio && !lastStudio) {
      talkOnArrival = false;
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
      setElevation(
        elevation +
          ((keys.has("k") ? 1 : 0) - (keys.has("i") ? 1 : 0)) * delta * 0.5,
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
        const speed = sailing
          ? HARBOR_SAIL_SPEED
          : keys.has("shift")
            ? HARBOR_RUN_SPEED
            : HARBOR_WALK_SPEED;
        const traversable = sailing ? harborSailable : harborWalkable;
        const step = Math.min(speed * delta, route.length ? length : Infinity);
        let nx = avatar.root.position.x + (dx / length) * step;
        let nz = avatar.root.position.z + (dz / length) * step;
        if (!traversable(nx, nz)) {
          if (traversable(nx, avatar.root.position.z))
            nz = avatar.root.position.z;
          else if (traversable(avatar.root.position.x, nz))
            nx = avatar.root.position.x;
        }
        if (traversable(nx, nz)) {
          inputDirection = { x: dx / length, z: dz / length };
          avatar.root.position.x = nx;
          avatar.root.position.z = nz;
          const facing = Math.atan2(dx, dz);
          avatar.root.rotation.y +=
            Math.atan2(
              Math.sin(facing - avatar.root.rotation.y),
              Math.cos(facing - avatar.root.rotation.y),
            ) * Math.min(1, delta * 12);
          setPose(sailing ? "idle" : keys.has("shift") ? "run" : "walk");
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
      if (now < jumpUntil && !sailing) setPose("jump");
      if (boardOnArrival && !route.length) {
        boardOnArrival = false;
        changeTravel();
      }
      if (talkOnArrival && !route.length) {
        talkOnArrival = false;
        talk();
      }
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
    for (const [model, follower] of [
      [otter, otterFollower],
      [turtle, turtleFollower],
    ] as const) {
      const motion = follower.step(
        avatar.root.position,
        avatar.root.rotation.y,
        delta,
        following && !state.blocked && !state.studio && !talkOnArrival,
        sailing,
      );
      model.root.position.set(
        follower.position.x,
        Math.max(
          -0.15,
          harborGroundHeight(follower.position.x, follower.position.z),
        ),
        follower.position.z,
      );
      if (motion.moving) {
        const angle = Math.atan2(
          Math.sin(motion.yaw - model.root.rotation.y),
          Math.cos(motion.yaw - model.root.rotation.y),
        );
        model.root.rotation.y +=
          angle * (state.reduced ? 1 : 1 - Math.exp(-delta * 9));
      }
      model.root.rotation.z =
        state.reduced || !motion.moving ? 0 : Math.sin(elapsed * 8) * 0.035;
    }
    const nearbyOtter = nearHarborCompanion(
      avatar.root.position,
      otter.root.position,
    );
    const nearbyTurtle =
      otter.root.position.distanceTo(turtle.root.position) < 7;
    if (nearbyTurtle !== turtleNearby) {
      turtleNearby = nearbyTurtle;
      options.onTurtleNearby(nearbyTurtle);
    }
    const moment = moments.step({
      seconds: delta,
      nearby: otter.root.position.distanceTo(avatar.root.position) < 7,
      paused: state.blocked || state.studio || state.quiet,
      wave: pose === "wave",
      sitting: pose === "sit",
      sky: lookingSky,
      sailing,
      night: state.night,
    });
    if (!state.blocked && !state.studio && companyMoment) {
      companyDelay -= delta;
      if (companyDelay <= 0) {
        options.onMoment(companyMoment);
        companyMoment = null;
      }
    } else if (moment) options.onMoment(moment);
    otter.update(
      elapsed,
      state.listening ? turtle.root.position : avatar.root.position,
      state.talking || (nearbyOtter && pose !== "walk" && pose !== "run"),
      state.reduced,
    );
    turtle.update(
      elapsed,
      state.listening ? otter.root.position : avatar.root.position,
      state.listening ||
        (turtle.root.position.distanceTo(avatar.root.position) < 5 &&
          pose === "idle"),
      state.reduced,
    );
    if (sailing)
      boat = { x: avatar.root.position.x, z: avatar.root.position.z };
    avatar.root.position.y = sailing
      ? 0.1
      : harborGroundHeight(avatar.root.position.x, avatar.root.position.z);
    const landmark = !sailing
      ? (harborJourneyStops.find(
          (stop) =>
            Math.hypot(
              stop.x - avatar.root.position.x,
              stop.z - avatar.root.position.z,
            ) < 1.65 &&
            (stop.id !== "secret" || (state.journey.beacon && state.night)),
        )?.id ?? null)
      : null;
    if (landmark !== nearbyJourney) {
      nearbyJourney = landmark;
      options.onNearbyJourney(landmark);
    }
    const near: HarborInteraction | null = sailing
      ? harborLanding(avatar.root.position)
        ? "land"
        : canTalk()
          ? "talk"
          : null
      : Math.hypot(
            avatar.root.position.x - boat.x,
            avatar.root.position.z - boat.z,
          ) < 3.2
        ? "sail"
        : landmark
          ? null
          : ((
              Object.entries(harborInteractions) as [
                HarborInteraction,
                { x: number; z: number; radius: number },
              ][]
            )
              .filter(([id]) => id !== "sail" && id !== "land")
              .map(([id, point]) => ({
                id,
                distance: Math.hypot(
                  (id === "talk" ? otter.root.position.x : point.x) -
                    avatar.root.position.x,
                  (id === "talk" ? otter.root.position.z : point.z) -
                    avatar.root.position.z,
                ),
                radius: point.radius,
              }))
              .filter((point) => point.distance < point.radius)
              .sort((a, b) => a.distance - b.distance)[0]?.id ?? null);
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
    const location =
      (Object.entries(harborDestinations) as [HarborDestination, HarborPoint][])
        .map(([id, point]) => ({
          id,
          distance: Math.hypot(
            point.x - avatar.root.position.x,
            point.z - avatar.root.position.z,
          ),
        }))
        .filter((point) => point.distance < 12)
        .sort((a, b) => a.distance - b.distance)[0]?.id ?? null;
    if (location !== lastLocation) {
      lastLocation = location;
      options.onLocation(location);
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
    landscape.update(
      elapsed,
      night,
      avatar.root.position,
      state.reduced,
      boat,
      sailing,
      avatar.root.rotation.y,
      state.journey,
    );
    environment.update(
      state.reduced ? 0 : elapsed,
      night,
      sailing ? avatar.root.position : new THREE.Vector3(1000, 0, 1000),
      sailing ? Math.hypot(inputDirection.x, inputDirection.z) : 0,
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
    const inside = elevation >= 0 && harborInside(p.x, p.z);
    const cameraElevation = state.studio ? 0.12 : inside ? 1.25 : elevation;
    const cameraDistance = state.studio
      ? camera.aspect < 0.8
        ? 8.1
        : 4.5
      : (inside ? 7 : distance) * (camera.aspect < 0.8 ? 1.15 : 1);
    // Leave the right third clear for the nonmodal wardrobe on desktop.
    if (state.studio && camera.aspect > 1.1) desiredTarget.x += 0.9;
    const framing = harborCameraFrame(
      desiredTarget,
      cameraHeading,
      cameraElevation,
      cameraDistance,
    );
    desiredCamera.set(
      framing.position.x,
      framing.position.y,
      framing.position.z,
    );
    desiredTarget.set(framing.target.x, framing.target.y, framing.target.z);
    if (state.talking) {
      const centerX = (p.x + otter.root.position.x) / 2;
      const centerZ = (p.z + otter.root.position.z) / 2;
      const indoors = harborInside(p.x, p.z);
      // Put both speakers above the bottom dialogue without moving either actor.
      desiredTarget.set(centerX, 0.55, centerZ);
      desiredCamera.set(
        centerX + 1.8,
        indoors ? 7 : 3.4,
        centerZ + (indoors ? 1.5 : camera.aspect < 0.8 ? 8 : 6),
      );
      if (state.listening) {
        desiredTarget.x =
          (p.x + otter.root.position.x + turtle.root.position.x) / 3;
        desiredCamera.x = desiredTarget.x + 1.8;
        desiredCamera.z += 1;
      }
    }
    target.lerp(desiredTarget, state.reduced ? 1 : 1 - Math.exp(-delta * 5));
    camera.position.lerp(
      desiredCamera,
      state.reduced ? 1 : 1 - Math.exp(-delta * 5),
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
    updateHarborSpeechAnchors(options.speechHost, camera, p, (id) => {
      if (id === "self") return { position: p, height: 2.2 };
      if (id === "otter") return { position: otter.root.position, height: 1.2 };
      if (id === "turtle")
        return { position: turtle.root.position, height: 1.15 };
      const position = companions.position(id);
      return position ? { position, height: 2.2 } : null;
    });
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
  function meetCompanion() {
    if (canTalk()) talk();
    else if (sailing) options.onNavigation("noRoute");
    else {
      const point = companionApproach(
        otter.root.position,
        avatar.root.position,
      );
      if (!point) {
        options.onNavigation("noRoute");
        return;
      }
      navigate(point);
      talkOnArrival = route.length > 0;
    }
  }
  return {
    goTo,
    voyage,
    walkTo: (point) => {
      boardOnArrival = false;
      navigate(point);
    },
    pose: selectPose,
    jump,
    interact,
    lookSky,
    say,
    meetCompanion,
    setCompany: (value) => {
      following = value;
      options.onCompany(value);
      companyMoment = value ? "together" : "stay";
      companyDelay = 0.6;
    },
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
      if (sailing !== (self.travel === "sail")) {
        route = [];
        keys.clear();
        setTravel(self.travel === "sail");
        avatar.root.position.set(
          self.x,
          sailing ? 0.1 : harborGroundHeight(self.x, self.z),
          self.z,
        );
        setPose("idle");
      }
      if (self.boat) boat = { ...self.boat };
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
        travel: requestedTravel,
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
        const model = createCoastAvatar(player.appearance, lease.asset);
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
      if (disposed) return;
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
      lease.release();
      landscape.dispose();
      otter.dispose();
      turtle.dispose();
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
