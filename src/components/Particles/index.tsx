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
  Points,
} from "three";
import { createPortal, useFrame, extend } from "@react-three/fiber";
import { OrbitControls, useFBO } from "@react-three/drei";

import { FboMaterial } from "./FboMaterial";

const SIZE = 128;
const LENGTH = SIZE * SIZE;

const ParticleVertexShader = `
  uniform sampler2D u_positions;

  void main() {
    vec3 pos = texture2D(u_positions, position.xy).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);

    // Size attenuation;
    gl_PointSize = 3.0;
    gl_PointSize *= step(1.0 - (1.0/64.0), position.x) + 0.5;
  }
`;

const ParticleFragmentShader = `
  void main() {
    vec3 color = vec3(0.34, 0.53, 0.96);
    gl_FragColor = vec4(color, 1.0);
  }
`;

extend({ FboMaterial });

const Particles = () => {
  // This reference gives us direct access to our points
  const pointsMatRef = useRef<Points>(null);
  const fboMatRef = useRef<FboMaterial>(null);

  // Create a camera and a scene for our FBO
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1);

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
      // particles[stride + 2] = i / SIZE / SIZE; // z pos?
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
      <OrbitControls />

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
      {/* <Plane>
        <meshBasicMaterial map={renderTarget.texture} />
      </Plane> */}
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
