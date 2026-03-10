import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import GlamCamAR from "../pages/GlamCamAR";

function Tutorial() {

  const location = useLocation();
  const tutorial = location.state.tutorial;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState("next");

  const videoRef = useRef(null);

  // start camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Camera error:", err));
  }, []);


  const stepMap = {
    foundation: "foundation",
    contour: "contour",
    highlight: "highlight",
    eyeshadow: "eyeshadow",
    eyeliner: "eyeliner",
    lashes: "lashes",
    blush: "blush",
    lips: "lips"
  };

  const currentStepText = tutorial.steps[stepIndex].toLowerCase();

  let arStep = null;

  if (currentStepText.includes("blush")) arStep = "blush";
  else if (currentStepText.includes("eyeliner")) arStep = "eyeliner";
  else if (currentStepText.includes("shadow")) arStep = "eyeshadow";
  else if (currentStepText.includes("lip")) arStep = "lips";
  else if (currentStepText.includes("contour")) arStep = "contour";
  else if (currentStepText.includes("highlight")) arStep = "highlight";
  else if (currentStepText.includes("foundation")) arStep = "foundation";


  const nextStep = () => {
    if (stepIndex < tutorial.steps.length - 1) {
      setDirection("next");
      setStepIndex(stepIndex + 1);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setDirection("back");
      setStepIndex(stepIndex - 1);
    }
  };

  return (
    <div className="w-screen h-screen flex bg-gray-100">

      {/* MIRROR CAMERA */}
      <div className="w-1/2 flex items-center justify-center bg-black">

        <div className="relative w-[400px] h-[500px]">

          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover rounded-xl transform scale-x-[-1]"
          />

          <GlamCamAR
            videoRef={videoRef}
            step={arStep}
          />

          {/* mirror frame */}
          <div className="absolute inset-0 border-4 border-pink-400 rounded-xl pointer-events-none"></div>

        </div>

      </div>


      {/* TUTORIAL PANEL */}
      <div className="w-1/2 flex flex-col items-center justify-center">

        <div className="bg-white shadow-xl rounded-2xl p-10 w-[420px] text-center">

          <h2 className="text-xl font-semibold mb-6">
            Step {stepIndex + 1} / {tutorial.steps.length}
          </h2>

          <div
            key={stepIndex}
            className={`text-2xl font-semibold transition-all duration-500
            ${direction === "next" ? "animate-slideLeft" : "animate-slideRight"}`}
          >
            {tutorial.steps[stepIndex]}
          </div>

          {/* progress bar */}
          <div className="w-full bg-gray-200 h-2 rounded-full mt-6">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((stepIndex + 1) / tutorial.steps.length) * 100}%`
              }}
            />
          </div>

          {/* buttons */}
          <div className="flex gap-6 justify-center mt-8">
            <button
              onClick={prevStep}
              className="bg-gray-400 px-6 py-3 rounded-lg text-white"
            >
              Back
            </button>

            <button
              onClick={nextStep}
              className="bg-purple-500 px-6 py-3 rounded-lg text-white"
            >
              Next
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Tutorial;