import { Routes, Route } from 'react-router-dom';

import Microphone from './components/Microphone';
import LevelMeter from './components/LevelMeter';

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Microphone />} />
        <Route path="/level-meter" element={<LevelMeter />} />
      </Routes>
    </div>
  );
}


export default App
