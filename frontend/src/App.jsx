import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import History from "./pages/History";
import ChooseMakeup from "./pages/MakeUp_Preference";
import CustomizeMirror from "./pages/MirrorSetting";
import Settings from "./pages/Setting";
import FaceCapture from "./pages/FaceCapture";
// Define HomePage inside App.jsx
function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full background">
      <header className="p-4 text-center backdrop-blur-md shadow-md">
        <h1 className="text-2xl font-bold text-white">
          Welcome to Smart Mirror
        </h1>
      </header>

      <div className="text-center text-white">
        <button
          onClick={() => navigate("/MakeUp_Preference")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Choose your makeup
        </button>
      </div>

      <div className="text-center text-white">
        <button
          onClick={() => navigate("/FaceCapture")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Face Recognition
        </button>
      </div>

      <div className="text-center text-white">
        <button
          onClick={() => navigate("/MirrorSetting")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Customize mirror settings
        </button>
      </div>

      <div className="text-center text-white">
        <button
          onClick={() => navigate("/Settings")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Settings
        </button>
      </div>

      <div className="text-center text-white">
        <button
          onClick={() => navigate("/History")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          History
        </button>
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
      </Routes>
    </Router>
  );
}

export default App;
