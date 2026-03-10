"""
AR Makeup API Route — integrate into your existing Flask backend
================================================================
Exposes a WebSocket + REST endpoint so the JS frontend can:
  1. Send webcam frames as base64
  2. Receive back annotated frames OR landmark JSON for canvas rendering

Add to your existing backend/app.py:
  from ar_makeup_route import ar_bp
  app.register_blueprint(ar_bp, url_prefix='/api/ar')
"""


import cv2
import numpy as np
import base64
import mediapipe as mp
from model.serve.AR_makeup_overlay import apply_makeup_ar, PRESETS, STEPS, draw_guidance_text
from fastapi import APIRouter

ar_bp = APIRouter()

mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.5,
)


def decode_frame(b64_string: str) -> np.ndarray:
    """Decode a base64 image string to an OpenCV BGR frame."""
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    img_bytes = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def encode_frame(frame: np.ndarray) -> str:
    """Encode an OpenCV BGR frame to base64 JPEG."""
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")


def extract_landmarks_json(face_landmarks, w: int, h: int) -> dict:
    """
    Return landmark coordinates as JSON for client-side canvas rendering.
    Useful if you want the JS frontend to draw overlays itself.
    """
    zones = {
        "blush_left":        [205, 207, 187, 123, 117, 50, 101, 36],
        "blush_right":       [425, 427, 411, 352, 346, 280, 330, 266],
        "eye_left":          [226, 247, 30, 29, 27, 28, 56, 190, 243, 173, 157, 158, 159, 160, 161, 246, 33, 130],
        "eye_right":         [446, 467, 260, 259, 257, 258, 286, 414, 463, 398, 384, 385, 386, 387, 388, 466, 263, 359],
        "eyeliner_left":     [33, 246, 161, 160, 159, 158, 157, 173, 133],   # upper lash line
        "eyeliner_right":    [263, 466, 388, 387, 386, 385, 384, 398, 362],
        "lash_lower_left":   [33, 7, 163, 144, 145, 153, 154, 155, 133],     # lower lash line
        "lash_lower_right":  [263, 249, 390, 373, 374, 380, 381, 382, 362],
        "waterline_left":    [130, 25, 110, 24, 23, 22, 26, 112, 243],
        "waterline_right":   [359, 255, 339, 254, 253, 252, 256, 341, 463],
        "lips":              [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
        "nose_highlight":    [6, 197, 195, 5, 4],
        "contour_left":      [234, 93, 132, 58, 172, 136],
        "contour_right":     [454, 323, 361, 288, 397, 365],
        "face_oval":         [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
                              397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
                              172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
    }

    result = {}
    for zone, indices in zones.items():
        pts = []
        for i in indices:
            lm = face_landmarks.landmark[i]
            pts.append({"x": round(lm.x * w), "y": round(lm.y * h)})
        result[zone] = pts

    return result


# ─── REST endpoint: send frame, get annotated frame back ──────────────────────

@ar_bp.post("/landmarks")
def overlay():
    """
    POST /api/ar/overlay
    Body: { "frame": "<base64 image>", "face_shape": "oval", "step": "blush" }
    Returns: { "frame": "<base64 annotated image>", "face_detected": true }
    """
    data = request.get_json(force=True)
    frame = decode_frame(data.get("frame", ""))
    face_shape = data.get("face_shape", "default")
    step = data.get("step", None)  # None = show all zones

    if frame is None:
        return jsonify({"error": "invalid frame"}), 400

    style = PRESETS.get(face_shape, PRESETS["default"])
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = mp_face_mesh.process(rgb)

    face_detected = False
    if results.multi_face_landmarks:
        face_detected = True
        for lm in results.multi_face_landmarks:
            frame = apply_makeup_ar(frame, lm, style, step=step)
            if step:
                # Find step text
                text = next((t for s, t in STEPS if s == step), step)
                draw_guidance_text(frame, text)

    return jsonify({
        "frame": encode_frame(frame),
        "face_detected": face_detected,
    })


# ─── REST endpoint: send frame, get landmark JSON for JS canvas rendering ─────

@ar_bp.route("/landmarks", methods=["POST"])
def landmarks():
    """
    POST /api/ar/landmarks
    Body: { "frame": "<base64 image>" }
    Returns: { "landmarks": { "blush_left": [{x,y},...], ... }, "face_detected": true }
    """
    data = request.get_json(force=True)
    frame = decode_frame(data.get("frame", ""))

    if frame is None:
        return jsonify({"error": "invalid frame"}), 400

    h, w = frame.shape[:2]
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = mp_face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return jsonify({"face_detected": False, "landmarks": {}})

    lm_data = extract_landmarks_json(results.multi_face_landmarks[0], w, h)
    return jsonify({"face_detected": True, "landmarks": lm_data})