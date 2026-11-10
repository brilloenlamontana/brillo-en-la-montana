import { useEffect, useMemo, useRef, useState } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { AnimationClip, Group, Mesh } from 'three';
import { avatarModelUrl, findCharacter, genderFolder } from '@/data/characters';
import { playOnceAndHold } from '@/game/engine/models/animation';
import { useAuthStore, type AvatarGender } from '@/store/authStore';
import { usePlayerStore } from './playerStore';

const FADE_SECONDS = 0.2;
const HIT_FADE_SECONDS = 0.08;
const ANIMATIONS_DIR = '/models-3d/animations';
// Every character shares the Mixamo skeleton, so the clips are skeleton-only files reused by all of them: the
// locomotion set of the character's gender plus the clips common to everyone.
const GENDER_CLIPS = ['Idle', 'Walking', 'Running'] as const;
const SHARED_CLIPS = ['Death', 'Hit'] as const;
const CLIP_NAMES = [...GENDER_CLIPS, ...SHARED_CLIPS];
type ClipName = (typeof CLIP_NAMES)[number];

const clipUrls = (gender: AvatarGender) => [
  ...GENDER_CLIPS.map((clip) => `${ANIMATIONS_DIR}/${genderFolder(gender)}/${clip}.glb`),
  ...SHARED_CLIPS.map((clip) => `${ANIMATIONS_DIR}/shared/${clip}.glb`),
];

// The character chosen by the player, animated from playerStore.action (crossfading between clips). Losing health
// plays the Hit clip once over whatever the avatar was doing.
export function Avatar() {
  const avatarRef = useRef<Group>(null);
  const avatarName = useAuthStore((state) => state.user?.avatarName);
  const action = usePlayerStore((state) => state.action);
  const [hit, setHit] = useState(false);

  const character = findCharacter(avatarName);
  const { scene } = useGLTF(avatarModelUrl(avatarName));
  const clipFiles = useGLTF(clipUrls(character.gender));
  // Each file holds one clip; it is renamed after its action so useAnimations exposes actions.Idle, actions.Walking...
  const clips = useMemo(
    () =>
      clipFiles.flatMap(({ animations }, i): AnimationClip[] => {
        if (!animations.length) return [];
        const clip = animations[0].clone();
        clip.name = CLIP_NAMES[i];
        return [clip];
      }),
    [clipFiles],
  );
  const { actions } = useAnimations(clips, avatarRef);

  // The skinned body follows the bones far from its rest bounding box (death, big strides): never cull it.
  useEffect(() => {
    scene.traverse((object) => {
      if ((object as Mesh).isMesh) object.frustumCulled = false;
    });
  }, [scene]);

  useEffect(() => {
    if (actions.Death) playOnceAndHold(actions.Death);
    if (actions.Hit) playOnceAndHold(actions.Hit);
  }, [actions]);

  // A blow that does not kill: the Hit clip plays once, then the avatar goes back to what it was doing.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = usePlayerStore.subscribe((state, previous) => {
      if (state.health >= previous.health || state.health <= 0) return;
      setHit(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setHit(false), (actions.Hit?.getClip().duration ?? 0.7) * 1000);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [actions]);

  const shown: ClipName = action === 'Death' ? 'Death' : hit ? 'Hit' : action;
  useEffect(() => {
    const current = actions[shown];
    const fade = shown === 'Hit' ? HIT_FADE_SECONDS : FADE_SECONDS;
    current?.reset().fadeIn(fade).play();
    return () => {
      current?.fadeOut(FADE_SECONDS);
    };
  }, [shown, actions]);

  // Shares the player's position every frame without re-renders or allocations (zones, enemies, items read it).
  useFrame(() => {
    avatarRef.current?.getWorldPosition(usePlayerStore.getState().position);
  });

  return (
    <group ref={avatarRef} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(clipUrls('female'));
