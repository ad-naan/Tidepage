import { Container, MeshPlane, Texture, WebGLRenderer } from "pixi.js";
import {
  createOtterRig,
  otterLook,
  type OtterLook,
} from "../domain/hero-otter-rig";

export type HeroOtterController = {
  look: (point: OtterLook) => void;
  pause: () => void;
  destroy: () => void;
};

/** No Application/shared ticker: draw only until a new gaze settles. */
export async function createHeroOtter(
  host: HTMLDivElement,
  src: string,
  signal: AbortSignal,
): Promise<HeroOtterController> {
  const image = new Image();
  image.src = src;
  await image.decode();
  signal.throwIfAborted();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL is unavailable");
  const renderer = new WebGLRenderer();
  await renderer.init({
    canvas,
    context,
    width: 256,
    height: 256,
    resolution: 1,
    backgroundAlpha: 0,
    antialias: false,
    powerPreference: "low-power",
  });
  // Native controls own input; this single texture is explicitly released below.
  // Detach both of Pixi's background ticker users as well as its render loop.
  // Pixi documents null for detaching, but 8.23's declaration omits it.
  (renderer.events.setTargetElement as (element: HTMLElement | null) => void)(
    null,
  );
  renderer.scheduler.destroy();
  if (signal.aborted) {
    renderer.destroy({ removeView: true });
    signal.throwIfAborted();
  }
  const texture = Texture.from(image, true);
  const mesh = new MeshPlane({ texture, verticesX: 21, verticesY: 21 });
  const stage = new Container();
  stage.addChild(mesh);
  const positions = mesh.geometry.positions;
  const deform = createOtterRig(positions.slice(), 256);
  const buffer = mesh.geometry.getBuffer("aPosition");
  let current = { x: 0, y: 0 };
  let target = { ...current };
  let frame = 0;
  let previous = 0;
  let disposed = false;
  const draw = () => {
    deform(positions, current);
    buffer.update();
    renderer.render(stage);
  };
  const paint = (now: number) => {
    frame = 0;
    if (disposed) return;
    const amount = 1 - Math.exp(-Math.min(50, now - previous) / 85);
    previous = now;
    current.x += (target.x - current.x) * amount;
    current.y += (target.y - current.y) * amount;
    const moving =
      Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.002;
    if (!moving) current = { ...target };
    draw();
    if (moving) frame = requestAnimationFrame(paint);
  };
  const destroy = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    mesh.geometry.destroy();
    stage.destroy({ children: true });
    texture.destroy(true);
    renderer.destroy({ removeView: true });
  };
  try {
    draw();
    host.appendChild(renderer.canvas);
  } catch (error) {
    destroy();
    throw error;
  }
  return {
    look(point) {
      if (disposed) return;
      target = otterLook(point.x, point.y);
      if (
        !frame &&
        Math.abs(current.x - target.x) + Math.abs(current.y - target.y) > 0.002
      ) {
        previous = performance.now();
        frame = requestAnimationFrame(paint);
      }
    },
    pause() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
    destroy,
  };
}
