import {
  DataTexture,
  FloatType,
  MathUtils,
  RGBAFormat,
  ShaderMaterial,
} from "three";

import { FBOVertexShader, FBOFragmentShader } from ".";

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
