// credit to https://blog.maximeheckel.com/posts/the-magical-world-of-particles-with-react-three-fiber-and-shaders/

import { useMemo, useRef } from "react";

import {
  FloatType,
  NearestFilter,
  RGBAFormat,
  Scene,
  OrthographicCamera,
  AdditiveBlending,
  ShaderMaterial,
  DataTexture,
} from "three";
import { createPortal, useFrame } from "@react-three/fiber";
import { extend } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";

const SIZE = 128;
const LENGTH = SIZE * SIZE;

export const FBOFragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

export const FBOVertexShader = `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const generatePositions = (width: number, height: number) => {
  // we need to create a vec4 since we're passing the positions to the fragment shader
  // data textures need to have 4 components, R, G, B, and A
  const length = width * height * 4;
  const data = new Float32Array(length);

  // Fill Float32Array here
  data.fill(0.5);

  return data;
};

export class FboMaterial extends ShaderMaterial {
  constructor(size: number) {
    const positionTexture = new DataTexture(
      /* data */ generatePositions(size, size),
      /* width */ size,
      /* height */ size,
      /* format */ RGBAFormat,
      /* type */ FloatType
    );

    positionTexture.needsUpdate = true;

    const uniforms = {
      // Pass the positions Data Texture as a uniform
      u_positions: { value: positionTexture },
      u_time: { value: 0 },
    };

    super({
      uniforms: uniforms,
      vertexShader: FBOVertexShader,
      fragmentShader: FBOFragmentShader,
    });
  }
}

extend({ FboMaterial });

const Particles = () => {
  // This reference gives us direct access to our points
  const pointsMatRef = useRef<ShaderMaterial>(null);
  const fboMatRef = useRef<FboMaterial>(null);

  // Create a camera and a scene for our FBO
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.0000001, 1);

  // Create a simple square geometry with custom uv and positions attributes
  const positions = new Float32Array([
    -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ]);
  const uvs = new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]);

  // define FBO render target
  const renderTarget = useFBO(SIZE, SIZE, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    stencilBuffer: false,
    type: FloatType,
  });

  // Generate a "buffer" of vertices with normalized coordinates
  const particlesPosition = new Float32Array(LENGTH * 3);
  for (let i = 0; i < LENGTH; i++) {
    const i3 = i * 3;
    particlesPosition[i3 + 0] = (i % SIZE) / SIZE; // x pos
    particlesPosition[i3 + 1] = i / SIZE / SIZE; // y pos
  }

  // define uniforms, recieving particle positions from the render texture
  const uniforms = useMemo(
    () => ({
      u_positions: {
        value: null,
      },
    }),
    []
  );

  useFrame((state) => {
    const { gl, clock } = state;

    // Set the current render target to our FBO
    gl.setRenderTarget(renderTarget);
    gl.clear();
    // Render the simulation material with square geometry in the render target
    gl.render(scene, camera);
    // Revert to the default render target
    gl.setRenderTarget(null);

    // Read the position data from the texture field of the render target
    // and send that data to the final shaderMaterial via the `uPositions` uniform
    if (pointsMatRef.current)
      pointsMatRef.current.uniforms.u_positions.value = renderTarget.texture;

    if (fboMatRef.current)
      fboMatRef.current.uniforms.u_time.value = clock.elapsedTime;
  });

  return (
    <>
      {/* Render our simulation material and geometry off-screen */}
      {createPortal(
        <mesh>
          <fboMaterial ref={fboMatRef} args={[SIZE]} />
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={positions.length / 3}
              array={positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-uv"
              count={uvs.length / 2}
              array={uvs}
              itemSize={2}
            />
          </bufferGeometry>
        </mesh>,
        scene
      )}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesPosition.length / 3}
            array={particlesPosition}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={pointsMatRef}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={FBOFragmentShader}
          vertexShader={FBOVertexShader}
          uniforms={uniforms}
        />
      </points>
    </>
  );
};

export default Particles;
