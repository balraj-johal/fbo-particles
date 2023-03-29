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
  MathUtils,
  Points,
} from "three";
import { createPortal, useFrame, extend } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";

import { CurlNoise } from "../../shaders/utils";

const SIZE = 128;
const LENGTH = SIZE * SIZE;

export const FBOVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FBOFragmentShader = `
  uniform sampler2D u_positions;
  uniform float u_time;
  uniform float u_frequency;

  varying vec2 vUv;

  // ${CurlNoise}

  void main() {
    vec3 pos = texture2D(u_positions, vUv).rgb;
    gl_FragColor = vec4(pos, 1.0);
    // vec3 curledPos = texture2D(u_positions, vUv).rgb; // set initial curled pos to initial pos

    // pos = curlNoise(pos * u_frequency + u_time * 0.1); 

    // curledPos = curlNoise(curledPos * u_frequency + u_time * 0.1);
    // curledPos += curlNoise(curledPos * u_frequency * 2.0) * 0.5;

    // // mix from pos to curled pos based on sin(time)
    // gl_FragColor = vec4(mix(pos, curledPos, sin(u_time)), 1.0);
  }
`;

const ParticleVertexShader = `
  uniform sampler2D u_positions;

  void main() {
    vec3 pos = texture2D(u_positions, position.xy).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    gl_PointSize = 3.0;
    // Size attenuation;
    gl_PointSize *= step(1.0 - (1.0/64.0), position.x) + 0.5;
  }
`;

const ParticleFragmentShader = `
  void main() {
    vec3 color = vec3(0.34, 0.53, 0.96);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const generatePositions = (width: number, height: number) => {
  // we need to create a vec4 since we're passing the positions to the fragment shader
  // data textures need to have 4 components, R, G, B, and A
  const length = width * height * 4;
  const data = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const stride = i * 4;

    const distance = 1;
    const theta = MathUtils.randFloatSpread(360);
    const phi = MathUtils.randFloatSpread(360);

    data[stride] = distance * Math.sin(theta) * Math.cos(phi);
    data[stride + 1] = distance * Math.sin(theta) * Math.sin(phi);
    data[stride + 2] = distance * Math.cos(theta);
    data[stride + 3] = 1.0; // this value will not have any impact
  }

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
      u_frequency: { value: 0.25 },
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
  const pointsMatRef = useRef<Points>(null);
  const fboMatRef = useRef<FboMaterial>(null);

  // Create a camera and a scene for our FBO
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.0000001, 1);

  // Create a simple geometry with custom uv and positions attributes
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
  const particlesPosition = useMemo(() => {
    const particles = new Float32Array(LENGTH * 3);
    for (let i = 0; i < LENGTH; i++) {
      const stride = i * 3;
      particles[stride + 0] = (i % SIZE) / SIZE; // x pos
      particles[stride + 1] = i / SIZE / SIZE; // y pos
    }
    return particles;
  }, []);

  // define uniforms, recieving particle positions from the render texture
  const uniforms = useMemo(
    () => ({
      u_positions: {
        value: null,
      },
    }),
    []
  );

  useFrame(({ gl, clock }) => {
    // Set the current render target to our FBO
    gl.setRenderTarget(renderTarget);
    gl.clear();
    // Render the simulation material with given geometry in the render target
    gl.render(scene, camera);
    gl.setRenderTarget(null); // Revert to the default render target

    // Read the position data from the texture field of the render target
    // and send that data to the final shaderMaterial via the `u_positions` uniform
    if (pointsMatRef.current) {
      (
        pointsMatRef.current.material as ShaderMaterial
      ).uniforms.u_positions.value = renderTarget.texture;
    }

    if (fboMatRef.current) {
      fboMatRef.current.uniforms.u_time.value = clock.elapsedTime;
    }
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
      <points ref={pointsMatRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particlesPosition.length / 3}
            array={particlesPosition}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={ParticleFragmentShader}
          vertexShader={ParticleVertexShader}
          uniforms={uniforms}
        />
      </points>
    </>
  );
};

export default Particles;
