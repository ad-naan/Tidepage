import * as THREE from "three";
import type { CoastPlayer } from "@/shared/contracts/coast-space";
import { createCoastAvatar } from "./createCoastAvatar";
import type { CoastAvatarAsset } from "./coastAvatarAsset";
import { createHarborModeler } from "./harborModeling";
import { buildHarborSkiff } from "./harborArchitecture";
import { harborGroundHeight } from "../domain/harbor-terrain";

/** Remote models interpolate authoritative positions; they never drive local input. */
export function createCoastCompanions(
  scene: THREE.Scene,
  asset: CoastAvatarAsset,
) {
  const peers = new Map<
    string,
    {
      model: ReturnType<typeof createCoastAvatar>;
      target: CoastPlayer;
      outfit: string;
      boat: THREE.Group;
      kit: ReturnType<typeof createHarborModeler>;
    }
  >();
  const clear = () => {
    peers.forEach((p) => {
      p.model.dispose();
      p.boat.removeFromParent();
      p.kit.dispose();
    });
    peers.clear();
  };
  return {
    position: (id: string) => peers.get(id)?.model.root.position ?? null,
    reconcile(players: CoastPlayer[], selfId: string) {
      const present = new Set(
        players.filter((p) => p.id !== selfId).map((p) => p.id),
      );
      for (const [id, peer] of peers)
        if (!present.has(id)) {
          peer.model.dispose();
          peer.boat.removeFromParent();
          peer.kit.dispose();
          peers.delete(id);
        }
      for (const player of players) {
        if (player.id === selfId) continue;
        let peer = peers.get(player.id);
        const outfit = JSON.stringify(player.appearance);
        if (!peer) {
          const model = createCoastAvatar(player.appearance, asset);
          model.root.position.set(player.x, 0.49, player.z);
          model.root.rotation.y = player.yaw;
          scene.add(model.root);
          const kit = createHarborModeler();
          const boat = buildHarborSkiff(scene, kit);
          boat.visible = player.travel === "sail";
          peer = { model, target: player, outfit, boat, kit };
          peers.set(player.id, peer);
        }
        if (outfit !== peer.outfit) {
          peer.model.dress(player.appearance);
          peer.outfit = outfit;
        }
        peer.target = player;
      }
    },
    update(time: number, delta: number, reduced: boolean) {
      for (const { model, target, boat } of peers.values()) {
        const root = model.root;
        const blend =
          reduced ||
          Math.hypot(root.position.x - target.x, root.position.z - target.z) > 3
            ? 1
            : 1 - Math.exp(-delta * 12);
        root.position.x = THREE.MathUtils.lerp(
          root.position.x,
          target.x,
          blend,
        );
        root.position.z = THREE.MathUtils.lerp(
          root.position.z,
          target.z,
          blend,
        );
        root.rotation.y +=
          Math.atan2(
            Math.sin(target.yaw - root.rotation.y),
            Math.cos(target.yaw - root.rotation.y),
          ) * blend;
        root.position.y =
          target.travel === "sail"
            ? 0.1
            : harborGroundHeight(root.position.x, root.position.z);
        boat.visible = target.travel === "sail";
        boat.position.set(root.position.x, -0.03, root.position.z);
        boat.rotation.y = root.rotation.y;
        model.update(time, target.pose, reduced);
      }
    },
    clear,
    setVisible: (visible: boolean) =>
      peers.forEach((peer) => {
        peer.model.root.visible = visible;
        peer.boat.visible = visible && peer.target.travel === "sail";
      }),
  };
}
