import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/patient/*"
          element={
            <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-6 text-center">
              <div className="glass-card p-8 rounded-2xl max-w-md">
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">Patient Dashboard</h2>
                <p className="text-slate-400 mb-4">Patient portal is configured.</p>
                <a href="/" className="text-xs text-cyan-300 underline">Back to Home</a>
              </div>
            </div>
          }
        />
        <Route
          path="/doctor/*"
          element={
            <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-6 text-center">
              <div className="glass-card p-8 rounded-2xl max-w-md">
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">Doctor Workspace</h2>
                <p className="text-slate-400 mb-4">Physician clinical workspace is configured.</p>
                <a href="/" className="text-xs text-cyan-300 underline">Back to Home</a>
              </div>
            </div>
          }
        />
        <Route
          path="/institution/*"
          element={
            <div className="min-h-screen bg-[#070b13] text-white flex items-center justify-center p-6 text-center">
              <div className="glass-card p-8 rounded-2xl max-w-md">
                <h2 className="text-2xl font-bold text-cyan-400 mb-2">Institution Portal</h2>
                <p className="text-slate-400 mb-4">Hospital and institutional management portal.</p>
                <a href="/" className="text-xs text-cyan-300 underline">Back to Home</a>
              </div>
            </div>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
