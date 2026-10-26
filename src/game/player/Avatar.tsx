import { useEffect, useMemo, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { AnimationClip, Group, SkinnedMesh } from 'three';
import { avatarModelUrl } from '@/data/characters';
import { playOnceAndHold } from '@/game/engine/models/animation';
import { useAuthStore } from '@/store/authStore';
import { usePlayerStore, type PlayerAction } from './playerStore';

const FADE_SECONDS = 0.2;
// Mixamo clips shared by every character (only the female set exists for now).
const ANIMATIONS_DIR = '/models-3d/animations/woman';
const CLIPS: readonly PlayerAction[] = ['Idle', 'Walking', 'Running', 'Death'];
const clipUrls = CLIPS.map((clip) => `${ANIMATIONS_DIR}/${clip}.glb`);

// The character chosen by the player, animated from playerStore.action (crossfading between clips).
export function Avatar() {
  const avatarRef = useRef<Group>(null);
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const action = usePlayerStore((state) => state.action);

  const { nodes, materials } = useGLTF(avatarModelUrl(avatarName));
  const clipFiles = useGLTF(clipUrls);
  // Each file holds one clip; it is renamed after its action so useAnimations exposes actions.Idle, actions.Walking...
  const clips = useMemo(
    () =>
      clipFiles.flatMap(({ animations }, i): AnimationClip[] => {
        if (!animations.length) return [];
        const clip = animations[0].clone();
        clip.name = CLIPS[i];
        return [clip];
      }),
    [clipFiles],
  );
  const { actions } = useAnimations(clips, avatarRef);
  const body = nodes.Avatar as SkinnedMesh;

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
  }, [actions]);

  useEffect(() => {
    const current = actions[action];
    current?.reset().fadeIn(FADE_SECONDS).play();
    return () => {
      current?.fadeOut(FADE_SECONDS);
    };
  }, [action, actions]);

  // Shares the player's position every frame without re-renders or allocations (zones, enemies, items read it).
  useFrame(() => {
    avatarRef.current?.getWorldPosition(usePlayerStore.getState().position);
  });

  return (
    <group ref={avatarRef} dispose={null}>
      <group rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
        <skinnedMesh geometry={body.geometry} material={materials.AvatarMaterial} skeleton={body.skeleton} />
        <primitive object={nodes.mixamorigHips} />
      </group>
    </group>
  );
}

useGLTF.preload(clipUrls);
