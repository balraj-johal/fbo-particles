import { Canvas } from "@react-three/fiber";

interface Props {
  children: React.ReactNode;
}

const SceneWrapper = ({ children }: Props) => (
  <Canvas camera={{ position: [1.5, 1.5, 2.5] }}>{children}</Canvas>
);

export default SceneWrapper;
