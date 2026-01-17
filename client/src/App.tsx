import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Compare from './pages/Compare';
import Submit from './pages/Submit';
import Recommendations from './pages/Recommendations';
import AIAdvisor from './pages/AIAdvisor';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/submit" element={<Submit />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/ai-advisor" element={<AIAdvisor />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
