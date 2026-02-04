import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ChooseMakeup() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    makeupType: "",
    occasion: "",
    hairstyle: "",
    skillLevel: "",
    time: 10,
    saveLook: false,
  });

  const selectButton = (value, field) => (
    <button
      onClick={() => setFormData({ ...formData, [field]: value })}
      className={`px-4 py-3 rounded-xl border font-medium transition
        ${
          formData[field] === value
            ? "bg-pink-500 text-white border-pink-500"
            : "bg-white text-gray-700 border-gray-200 hover:border-pink-300"
        }`}
    >
      {value}
    </button>
  );

  const startSession = () => {
    console.log("Makeup Session Data:", formData);
    navigate("/LoadingPage");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-6 space-y-6">

        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Create Your Look ✨
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your makeup session
          </p>
        </div>

        {/* Makeup Type */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2">💄 Makeup Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {["Light", "Natural", "Glam", "Smoky"].map((item) =>
              selectButton(item, "makeupType")
            )}
          </div>
        </section>

        {/* Occasion */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2">🎉 Occasion</h2>
          <div className="flex flex-wrap gap-3">
            {["Daily", "Work", "Party", "Wedding"].map((item) =>
              selectButton(item, "occasion")
            )}
          </div>
        </section>

        {/* Hairstyle */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2">
            💇 Hairstyle <span className="text-gray-400">(optional)</span>
          </h2>
          <div className="flex flex-wrap gap-3">
            {["None", "Straight", "Wavy", "Curly", "Updo"].map((item) =>
              selectButton(item, "hairstyle")
            )}
          </div>
        </section>

        {/* Skill Level */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2">🎨 Skill Level</h2>
          <div className="grid grid-cols-3 gap-3">
            {["Beginner", "Intermediate", "Expert"].map((item) =>
              selectButton(item, "skillLevel")
            )}
          </div>
        </section>

        {/* Time Slider */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-2">
            ⏱ Time Available: {formData.time} min
          </h2>
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={formData.time}
            onChange={(e) =>
              setFormData({ ...formData, time: e.target.value })
            }
            className="w-full accent-pink-500"
          />
        </section>

        {/* Save / Compare */}
        <section className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">
            💾 Save this look
          </span>
          <input
            type="checkbox"
            checked={formData.saveLook}
            onChange={() =>
              setFormData({ ...formData, saveLook: !formData.saveLook })
            }
            className="w-5 h-5 accent-pink-500"
          />
        </section>

        {/* Start Button */}
        <button
          onClick={startSession}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-500 
                     text-white py-4 rounded-2xl font-semibold text-lg 
                     hover:opacity-90 transition"
        >
          Start Makeup Session ▶
        </button>

      </div>
    </div>
  );
}
