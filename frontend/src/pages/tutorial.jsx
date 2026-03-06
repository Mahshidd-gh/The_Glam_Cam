import { useState } from "react";
import { useLocation } from "react-router-dom";

function Tutorial() {

  const location = useLocation();
  const tutorial = location.state.tutorial;

  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState("next");

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
    <div className="flex flex-col items-center justify-center h-screen bg-white">

      <div
        key={stepIndex}
        className={`text-2xl font-semibold p-10 transition-all duration-500
        ${direction === "next" ? "animate-slideLeft" : "animate-slideRight"}`}
      >
        {tutorial.steps[stepIndex]}
      </div>

      <div className="flex gap-10 mt-10">
        <button onClick={prevStep} className="bg-gray-400 px-6 py-3 rounded-lg">
          Back
        </button>

        <button onClick={nextStep} className="bg-purple-500 text-white px-6 py-3 rounded-lg">
          Next
        </button>
      </div>

    </div>
  );
}

export default Tutorial;