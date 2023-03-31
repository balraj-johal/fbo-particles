import SceneWrapper from "./components/SceneWrapper";
import Particles from "./components/Particles";

function App() {
  return (
    <SceneWrapper>
      <Particles />
      <ambientLight intensity={0.5} />
    </SceneWrapper>
  );
}

export default App;
