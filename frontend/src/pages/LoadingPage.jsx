import { useEffect, useState } from "react";
import { useNavigate, useLocation} from "react-router-dom";

export default function LoadingPage() {
  const [countdown, setCountdown] = useState(5);
  const [finished, setFinished] = useState(false);
  const [fadeOut ,setFadeOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const tutorial = location.state?.tutorial;

  useEffect(() => {
    if (countdown === 0) {
      console.log("Face detection started");
      setFinished(true);
      setTimeout(()=>{
        navigate("/tutorial", {
        state: { tutorial }
      });
      }, 2000);
}

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1)
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown , navigate]);

  if(finished){
    return(
       <div
        className="min-h-screen flex items-center justify-center bg-black fade-out">
      <h1 className = "text-white font-semibold text-2xl animate-fade-in">
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
      <div className="w-[360px] bg-white rounded-2xl shadow-xl p-6 text-center space-y-4"> 
      

      {/* Instruction
      <h1 className="text-2xl font-semibold text-center mb-4">
        Please look at the mirror
      </h1>

      <p className="text-gray-400 text-sm mb-8">
        Position your face inside the frame
      </p> */}

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
            className="transition-all duration-1000 "
          />
        </svg>

        <span className="text-5xl font-bold">
          {countdown}
        </span>
      </div>
      </div>

      {/* Status */}
      <p className="text-sm text-gray-400 mt-6">
        Preparing your personalized tutorial...
      </p>
    </div>
    </div>
  );
}
