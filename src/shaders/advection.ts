// TODO: add BFECC (Back and Forth Error Compensation and Correction)

/** ADVECTION is the transport of a substance or quantity by bulk motion of a fluid */
export const VERTEX_SHADER = `
uniform sampler2D velocity;
uniform float dt; //
uniform vec2 fboSize;
varying vec2 uv;

void main(){
  vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
  vec2 velocity = texture2D(velocity, uv).xy;

  vec2 uv2 = uv - velocity * dt * ratio;
  vec2 newVelocity = texture2D(velocity, uv2).xy;

  gl_FragColor = vec4(newVelocity, 0.0, 0.0);
}
`;
