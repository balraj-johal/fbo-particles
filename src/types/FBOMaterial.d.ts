import { MaterialNode } from "@react-three/fiber";

import { FboMaterial } from "../components/Particles";

// Add types to ThreeElements elements so primitives pick up on it
declare module "@react-three/fiber" {
  interface ThreeElements {
    fboMaterial: MaterialNode<FboMaterial, typeof FboMaterial>;
  }
}
