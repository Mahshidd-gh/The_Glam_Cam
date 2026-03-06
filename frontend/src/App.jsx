import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import History from "./pages/History";
import MakeUpPreference from "./pages/MakeUpPreference";
import CustomizeMirror from "./pages/MirrorSetting";
import Settings from "./pages/Setting";
import FaceCapture from "./pages/FaceCapture";
import LoadingPage from "./pages/LoadingPage";
import HomePage from "./pages/HomePage";
import Tutorial from "./pages/tutorial";

// App = Router + Routes
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/MakeUpPreference" element={<MakeUpPreference />} />
        <Route path="/MirrorSetting" element={<CustomizeMirror />} />
        <Route path="/History" element={<History />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/FaceCapture" element={<FaceCapture />} />
        <Route path="/LoadingPage" element={<LoadingPage />} />
        <Route path="/tutorial" element={<Tutorial />} />
      </Routes>
    </Router>
  );
}

export default App;
