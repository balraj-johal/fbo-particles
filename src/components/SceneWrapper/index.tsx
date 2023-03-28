import { Canvas } from "@react-three/fiber";

interface Props {
  children: React.ReactNode;
}

const SceneWrapper = ({ children }: Props) => <Canvas>{children}</Canvas>;

export default SceneWrapper;
