import { WebGPURenderer } from 'three/webgpu';

export const createWebGPURenderer = async (props: any) => {
  try {
    const renderer = new WebGPURenderer(props);
    await renderer.init();
    return renderer;
  } catch (error) {
    console.warn('WebGPU not supported or failed to initialize. Falling back to WebGLRenderer.', error);
    const { WebGLRenderer } = await import('three');
    return new WebGLRenderer(props);
  }
};
