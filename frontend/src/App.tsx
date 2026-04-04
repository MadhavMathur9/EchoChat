import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HomePage } from './pages/HomePage';
import { RoomPage } from './pages/RoomPage';
import { AnimatedBackground } from './components/layout/AnimatedBackground';

function App() {
  return (
    <BrowserRouter>
      <AnimatedBackground />
      <Toaster position="top-center" toastOptions={{
        style: {
          background: '#1a1a28',
          color: '#f0f0ff',
          border: '1px solid #2a2a40'
        }
      }} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room" element={<RoomPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
