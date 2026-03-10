import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoadingPage() {
  const [countdown, setCountdown] = useState(5);
  const [finished, setFinished] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const tutorial = location.state?.tutorial;


  const steps = [
    "Scanning face...",
    "Detecting facial landmarks...",
    "Analyzing proportions...",
    "Matching makeup styles...",
    "Preparing tutorial..."
  ];

  const currentStep = steps[5 - countdown];

  useEffect(() => {
    if (countdown === 0) {
      console.log("Face detection started");
      setFinished(true);
      setTimeout(() => {
        navigate("/tutorial", {
          state: { tutorial }
        });
      }, 2000);
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  if (finished) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-black fade-out">
        <h1 className="text-white font-semibold text-2xl animate-fade-in">
          Enjoy your session✨
        </h1>
      </div>
    );
  }

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = ((5 - countdown) / 5) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex flex-col items-center justify-center text-black px-6">

      {/* Card */}
      <div className="w-[360px] bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-6 text-center space-y-4">


        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-pink-300 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
            />
          ))}
        </div>


        {/* Circular Countdown */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="absolute w-full h-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#333"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke="#ec4899"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                strokeLinecap="round"
                className="transition-all duration-6000 "
              />
            </svg>

            <span className="text-5xl font-bold">
              {countdown}
            </span>
          </div>
        </div>

        {/* Status */}
        <p className="text-sm text-gray-500 mt-6 animate-pulse">
          {currentStep}
        </p>
      </div>
    </div>
  );
}
