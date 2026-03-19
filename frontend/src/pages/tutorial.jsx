import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parseZones, ZoneOverlay, ZONE_META, FaceSVG } from "../pages/GlamCamAR";


function Tutorial() {
  const location = useLocation();
  const tutorial = location.state?.tutorial;
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState("next");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [animKey, setAnimKey] = useState(0);


  useEffect(() => {
    setAnimKey(k => k + 1);
  }, [stepIndex]);



  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Camera error:", err));

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const zones = parseZones(tutorial?.steps?.[stepIndex] ?? "");

  const nextStep = () => {
    if (stepIndex < tutorial.steps.length - 1) {
      setDirection("next");
      setStepIndex((i) => i + 1);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setDirection("back");
      setStepIndex((i) => i - 1);
    }
  };

  if (!tutorial) return <div>No tutorial selected.</div>;

  return (
    <div className="w-screen h-screen flex bg-gray-100">
      <div className="w-1/2 flex items-center justify-center bg-black">
        <div
          className="relative rounded-xl overflow-hidden border-4 border-pink-400"
          style={{ width: 400, height: 500 }}
        >
          {/* Video — mirrored so it feels like a real mirror */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          <div
            className="absolute inset-0 pointer-events-none"
          >
            {/* <FaceSVG zones={zones} animKey={animKey} /> */}
            <ZoneOverlay zones={zones} animKey={animKey} videoRef={videoRef} />
          </div>


        </div>
      </div>
      {/* ── TUTORIAL PANEL ── */}
      <div className="w-1/2 flex flex-col items-center justify-center">
        <div className="bg-white shadow-xl rounded-2xl p-10 w-[420px] text-center">

          <h2 className="text-xl font-semibold mb-6">
            Step {stepIndex + 1} / {tutorial.steps.length}
          </h2>

          <div
            key={stepIndex}
            className={`text-2xl font-semibold transition-all duration-500 ${direction === "next" ? "animate-slideLeft" : "animate-slideRight"
              }`}
          >
            {tutorial.steps[stepIndex]}
          </div>

          {/* Step badge — shows which AR zone is active */}
          {zones.length > 0 && (
            <div className="mt-3 inline-block bg-pink-100 text-pink-600 text-sm font-medium px-3 py-1 rounded-full">
              ✨ Highlighting: {zones.map(z => ZONE_META[z] || z).join(", ")}
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full bg-gray-200 h-2 rounded-full mt-6">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${((stepIndex + 1) / tutorial.steps.length) * 100}%`,
              }}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-6 justify-center mt-8">
            <button
              onClick={prevStep}
              disabled={stepIndex === 0}
              className="bg-gray-400 disabled:opacity-40 px-6 py-3 rounded-lg text-white"
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={stepIndex === tutorial.steps.length - 1}
              className="bg-purple-500 disabled:opacity-40 px-6 py-3 rounded-lg text-white"
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