import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import History from "./pages/History";
import ChooseMakeup from "./pages/MakeUp_Preference";
import CustomizeMirror from "./pages/MirrorSetting";
import Settings from "./pages/Setting";
import FaceCapture from "./pages/FaceCapture";
import LoadingPage from "./pages/LoadingPage";
// Define HomePage inside App.jsx
function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
      
      {/* Card */}
      <div className="w-[360px] bg-white rounded-2xl shadow-xl p-6 text-center space-y-4">

        {/* Logo placeholder */}
        <div className="mx-auto w-20 h-20 rounded-lg border border-gray-300 flex items-center justify-center text-gray-400">
          <img src="/logo.png" alt="Glam Cam Logo" className="w-16 mx-auto" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-800">
          The Glam Cam ✨
        </h1>
        <p className="text-sm text-gray-500">
          Your smart beauty mirror
        </p>

        {/* Main buttons */}
        <button
          onClick={() => navigate("/FaceCapture")}
          className="w-full py-3 rounded-xl bg-pink-500 text-white font-semibold hover:bg-purple-600 transition"
        >
          📷 Start your journey
        </button>

        <button
          onClick={() => navigate("/MakeUp_Preference")}
          className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-pink-600 transition"
        >
          💄 Choose Your Makeup
        </button>

        

        {/* Bottom actions */}
        <div className="flex justify-between gap-2 pt-2">
          <button
            onClick={() => navigate("/Settings")}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
          >
            ⚙️ Settings
          </button>

          {/* <button
            onClick={() => navigate("/MirrorSetting")}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
          >
            🪞 Mirror
          </button> */}

          <button
            onClick={() => navigate("/History")}
            className="flex-1 py-2 rounded-lg bg-gray-100 text-sm hover:bg-gray-200"
          >
            🕘 History
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 pt-2">
          Powered by AI · Real-time beauty feedback
        </p>
      </div>
    </div>
  );
}

// App = Router + Routes
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/MakeUp_Preference" element={<ChooseMakeup />} />
        <Route path="/MirrorSetting" element={<CustomizeMirror />} />
        <Route path="/History" element={<History />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/FaceCapture" element={<FaceCapture />} />
        <Route path="/LoadingPage" element={<LoadingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
