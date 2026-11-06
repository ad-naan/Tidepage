import * as THREE from "three";
import type { CoastPlayer } from "@/shared/contracts/coast-space";
import { createCoastAvatar } from "./createCoastAvatar";

/** Remote models interpolate authoritative positions; they never drive local input. */
export function createCoastCompanions(scene: THREE.Scene) {
  const peers = new Map<
    string,
    {
      model: ReturnType<typeof createCoastAvatar>;
      target: CoastPlayer;
      outfit: string;
    }
  >();
  const clear = () => {
    peers.forEach((p) => p.model.dispose());
    peers.clear();
  };
  return {
    reconcile(players: CoastPlayer[], selfId: string) {
      const present = new Set(
        players.filter((p) => p.id !== selfId).map((p) => p.id),
      );
      for (const [id, peer] of peers)
        if (!present.has(id)) {
          peer.model.dispose();
          peers.delete(id);
        }
      for (const player of players) {
        if (player.id === selfId) continue;
        let peer = peers.get(player.id);
        const outfit = JSON.stringify(player.appearance);
        if (!peer) {
          const model = createCoastAvatar(player.appearance);
          model.root.position.set(player.x, 0.49, player.z);
          model.root.rotation.y = player.yaw;
          scene.add(model.root);
          peer = { model, target: player, outfit };
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
      for (const { model, target } of peers.values()) {
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
        model.update(time, target.pose, reduced);
      }
    },
    clear,
    setVisible: (visible: boolean) =>
      peers.forEach((peer) => {
        peer.model.root.visible = visible;
      }),
  };
}
