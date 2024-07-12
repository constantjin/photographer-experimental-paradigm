import { Routes, Route } from "react-router-dom";

import { StartPage } from "./routes/StartPage";
import { Sync } from "./routes/Sync";
import { Instruction } from "./routes/Instruction";
import { FixationTarget } from "./routes/FixationTarget";
import { Exploration } from "./routes/Exploration";
import { End } from "./routes/End";

const App: React.FC = () => {
  return (
    <>
      <div className="flex items-center justify-center h-screen bg-black">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/sync" element={<Sync />} />
          <Route path="/instruction" element={<Instruction />} />
          <Route path="/fixation_target" element={<FixationTarget />} />
          <Route path="/exploration" element={<Exploration />} />
          <Route path="/end" element={<End />} />
        </Routes>
      </div>
    </>
  );
};

export default App;
