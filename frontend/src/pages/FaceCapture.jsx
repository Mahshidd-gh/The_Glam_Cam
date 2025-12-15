import { useEffect, useRef, useState } from "react";

function FaceCapture() {
  const videoRef = useRef(null);
  const [prediction, setPrediction] = useState(""); // store result here

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Error accessing webcam:", err));
  }, []);

  const captureAndSend = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "snapshot.jpg"); // ✅ "file" — matches FastAPI

      try {
        // Spring Boot endpoint, which forwards to FastAPI
        const res = await fetch("http://localhost:8080/face/predict", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Request failed");

        const data = await res.json(); // ✅ parse JSON from FastAPI
        setPrediction(`Face shape: ${data.face_shape} (Confidence: ${data.confidence})`);
      } catch (err) {
        console.error("Error sending snapshot:", err);
        setPrediction("Error detecting face shape.");
      }
    }, "image/jpeg");
  };

  return (
    <div className="flex flex-col items-center">
      <video ref={videoRef} autoPlay playsInline width="640" height="480" />
      <button
        onClick={captureAndSend}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Capture & Detect Face Shape
      </button>

      {prediction && (
        <p className="mt-4 text-lg font-semibold text-gray-800">{prediction}</p>
      )}
    </div>
  );
}

export default FaceCapture;
