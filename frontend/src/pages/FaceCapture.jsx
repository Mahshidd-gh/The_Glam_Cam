import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";


function FaceCapture() {
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const preferences = location.state;
  const [prediction, setPrediction] = useState(null);
  const [tutorial, setTutorial] = useState(null);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const hasCaptured = useRef(false);
  const streamRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((s) => {
        streamRef.current = s;  // store in ref
        videoRef.current.srcObject = s;

        setTimeout(() => {
          captureAndSend();
        }, 4000);
      })
      .catch((err) => console.error("Error accessing webcam:", err));

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);


  const captureAndSend = () => {
    if (hasCaptured.current) return;   // prevents double capture
    hasCaptured.current = true;
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "snapshot.jpg");

      try {
        const res = await fetch("http://localhost:8080/face/predict", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Prediction failed");

        const data = await res.json();
        console.log("FULL respons:", data);

        //  Handle no face detected
        if (!data.face_shape) {
          hasCaptured.current = false; // allow retry
          alert(data.error || "No face detected. Please try again.");
          captureAndSend(); // retry automatically
          return;
        }

        setPrediction(data);
        setShowResultScreen(true);

        // Fetch tutorial after prediction
        const params = new URLSearchParams();
        params.append("face_shape", data.face_shape); // from the ML prediction
        if (preferences.makeup_style) params.append("makeup_style", preferences.makeup_style);
        if (preferences.hair_style) params.append("hair_style", preferences.hair_style);
        if (preferences.occasion) params.append("occasion", preferences.occasion);
        if (preferences.skill_level) params.append("skill_level", preferences.skill_level);
       
        const tutorialRes = await fetch(`http://localhost:8000/get_tutorial?${params.toString()}`);

        const tutorialData = await tutorialRes.json();
        setTutorial(tutorialData);


        console.log("Tutorial data:", JSON.stringify(tutorialData)); // log the full object
        console.log("Steps:", tutorialData.steps);
        console.log("Tutorial:", tutorialData);
      } catch (err) {
        console.error("Error:", err);
      }
    }, "image/jpeg");
  };


  const startSession = () => {
    if (!prediction || !tutorial) {
      alert("Please detect your face shape first.");
      return;
    }

    navigate("/LoadingPage", {
      state: {
        faceShape: prediction.face_shape,
        preferences: preferences,
        tutorial: tutorial
      }
    });
  };


  const chooseRandomLook = () => {

    if (!tutorial) return;

  };

useEffect(() => {
  if (prediction && tutorial) {
    setTimeout(() => {
      navigate("/LoadingPage", {
        state: {
          prediction: prediction,
          tutorial: tutorial,
          preferences: preferences
        }
      });
    }, 1500); // small delay so user sees result
  }
}, [prediction, tutorial, navigate]);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white">

      <div className="relative w-[640px] h-[480px] flex items-center justify-center">

        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-xl"
        />

        {/* Face outline guide */}
        <div className="absolute border-4 border-white rounded-full w-72 h-80 opacity-70"></div>

        {/* scanning line */}
        <div className="absolute w-full h-[2px] bg-pink-400 animate-scan"></div>

        {/* camera frame corners */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 w-10 h-10 border-l-4 border-t-4 border-white"></div>
          <div className="absolute top-4 right-4 w-10 h-10 border-r-4 border-t-4 border-white"></div>
          <div className="absolute bottom-4 left-4 w-10 h-10 border-l-4 border-b-4 border-white"></div>
          <div className="absolute bottom-4 right-4 w-10 h-10 border-r-4 border-b-4 border-white"></div>
        </div>

      </div>

      {showResultScreen && prediction && (
        <div className="fixed bottom-0 left-0 w-full h-full bg-black text-white
                  flex flex-col items-center justify-center
                  animate-slideUp">

          <h1 className="text-3xl font-bold mb-4">
            Your face shape is {prediction.face_shape}
          </h1>


        </div>
      )}


      {prediction && (
        <p className="mt-4 text-lg font-semibold text-gray-800">
          Face shape: {prediction.face_shape}
          <br />
          Confidence: {(prediction.confidence * 100).toFixed(1)}% </p>
      )}

    </div>
  );
}

export default FaceCapture;