import * as THREE from "three";
import { COAST_SPEECH_RADIUS } from "@/shared/contracts/coast-space";

/** DOM speech remains attached to interpolated scene actors, including during camera movement. */
export function updateHarborSpeechAnchors(
  host: HTMLElement | undefined,
  camera: THREE.Camera,
  player: THREE.Vector3,
  resolve: (id: string) => { position: THREE.Vector3; height: number } | null,
) {
  if (!host) return;
  const width = host.clientWidth,
    height = host.clientHeight;
  const composer = host.parentElement?.querySelector<HTMLElement>(
    "[data-world-composer]",
  );
  const bottomInset = Math.max(100, (composer?.offsetHeight ?? 0) + 36);
  const occupied: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  }[] = [];
  for (const node of host.querySelectorAll<HTMLElement>(
    "[data-world-speaker]",
  )) {
    const anchor = resolve(node.dataset.worldSpeaker!);
    if (
      !anchor ||
      anchor.position.distanceTo(player) > COAST_SPEECH_RADIUS + 1
    ) {
      node.dataset.visible = "false";
      continue;
    }
    const point = anchor.position
      .clone()
      .add(new THREE.Vector3(0, anchor.height, 0))
      .project(camera);
    if (
      point.z < -1 ||
      point.z > 1 ||
      Math.abs(point.x) > 1.15 ||
      Math.abs(point.y) > 1.15
    ) {
      node.dataset.visible = "false";
      continue;
    }
    const w = node.offsetWidth,
      h = node.offsetHeight;
    const centerX = (point.x * 0.5 + 0.5) * width;
    const left = Math.min(
      Math.max(12, centerX - w / 2),
      Math.max(12, width - w - 12),
    );
    let top = Math.max(80, (0.5 - point.y * 0.5) * height - h - 14);
    for (const box of occupied) {
      if (
        left < box.right + 8 &&
        left + w > box.left - 8 &&
        top < box.bottom + 8 &&
        top + h > box.top - 8
      )
        top = box.top - h - 12;
    }
    // Do not stack speech over the controls or force off-screen voices onto the screen.
    if (top < 72 || top + h > height - bottomInset) {
      node.dataset.visible = "false";
      continue;
    }
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    node.style.setProperty(
      "--speech-tail",
      `${Math.min(w - 20, Math.max(20, centerX - left))}px`,
    );
    node.dataset.visible = "true";
    occupied.push({ left, top, right: left + w, bottom: top + h });
  }
}
