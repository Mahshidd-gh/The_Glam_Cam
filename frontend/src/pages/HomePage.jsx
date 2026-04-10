import { useNavigate } from "react-router-dom";

export default function HomePage() {
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

        <button
          onClick={() => navigate("/MakeUpPreference")}
          className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-pink-600 transition"
        >
          💄 Choose Your Makeup
        </button>


        {/* Footer */}
        <p className="text-xs text-gray-400 pt-2">
          Powered by AI · Real-time beauty feedback
        </p>
      </div>
    </div>
  );
}
