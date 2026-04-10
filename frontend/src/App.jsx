import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./index.css";
import MakeUpPreference from "./pages/MakeUpPreference";
import FaceCapture from "./pages/FaceCapture";
import LoadingPage from "./pages/LoadingPage";
import HomePage from "./pages/HomePage";
import Tutorial from "./pages/tutorial";
import GlamCamAR from "./pages/GlamCamAR";

function App() {
  return (
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/MakeUpPreference" element={<MakeUpPreference />} />
              <Route path="/FaceCapture" element={<FaceCapture />} />
              <Route path="/LoadingPage" element={<LoadingPage />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/GlamCamAR" element={<GlamCamAR />} />
            </Routes>
          </Router>
  );
}

export default App;
