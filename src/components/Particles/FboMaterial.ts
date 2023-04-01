import {
  DataTexture,
  FloatType,
  MathUtils,
  RGBAFormat,
  ShaderMaterial,
} from "three";

import { CurlNoise } from "../../shaders/utils";

export const FBOVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
  }
`;

export const FBOFragmentShader = `
  uniform sampler2D u_positions;
  uniform float u_time;
  uniform float u_frequency;

  varying vec2 vUv;

  ${CurlNoise}

  void main() {
    vec3 basePos = texture2D(u_positions, vUv).rgb;
    vec3 curledPos = texture2D(u_positions, vUv).rgb; // set initial curled pos to initial pos

    basePos = curlNoise(basePos * u_frequency + u_time * 0.1);

    curledPos = curlNoise(curledPos * u_frequency + u_time * 0.1);
    curledPos += curlNoise(curledPos * u_frequency * 2.0) * 0.5;

    // mix from basePos to curled basePos based on sin(time)
    float blendOverTime = sin(u_time);
    gl_FragColor = vec4(mix(basePos, curledPos, blendOverTime), 1.0);
  }
`;

const generateSphericalPositions = (width: number, height: number) => {
  const length = width * height * 4;
  const data = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const stride = i * 4;

    const distance = 1;
    const theta = MathUtils.randFloatSpread(360);
    const phi = MathUtils.randFloatSpread(360);

    data[stride] = distance * Math.sin(theta) * Math.cos(phi); // R : X
    data[stride + 1] = distance * Math.sin(theta) * Math.sin(phi); // G : Y
    data[stride + 2] = distance * Math.cos(theta); // B : Z
    data[stride + 3] = 1.0; // Alpha
  }

  return data;
};

export class FboMaterial extends ShaderMaterial {
  constructor(size: number) {
    const positionTexture = new DataTexture(
      /* data */ generateSphericalPositions(size, size),
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
