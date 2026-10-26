import { useGLTF } from '@react-three/drei';

// Every GLB of the game is Draco-compressed. The decoder is served by the game itself (public/draco, copied from
// three/examples/jsm/libs/draco/gltf) instead of drei's default Google CDN: one connection less while loading, and the
// world also loads where that CDN is slow or blocked. Imported first by WorldPage, before any useGLTF.preload runs.
useGLTF.setDecoderPath('/draco/');
