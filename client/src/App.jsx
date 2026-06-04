import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import SubmitClaim from './pages/SubmitClaim';
import Dashboard from './pages/Dashboard';
import PolicyView from './pages/PolicyView';
import PolicyChatbot from './components/PolicyChatbot';

function App() {
  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <Navbar />
        <Routes>
          <Route path="/" element={<SubmitClaim />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/policy" element={<PolicyView />} />
        </Routes>
        <PolicyChatbot />
      </div>
    </BrowserRouter>
  );
}

export default App;
