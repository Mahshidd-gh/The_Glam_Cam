"""
AR Makeup Overlay Module - The Glam Cam
========================================
Uses MediaPipe FaceMesh (468 landmarks) to detect facial regions
and applies semi-transparent AR makeup overlays via OpenCV.

Supported zones:
  - Blush (cheeks)
  - Eyeshadow (upper eyelid)
  - Eyeliner (upper lash line — drawn as a thick stroke)
  - Lashes (lower lash line)
  - Lipstick (lips)
  - Contour (forehead, jawline, sides)
  - Highlight (nose bridge, brow bone, chin)
  - Foundation (full face)

Usage:
  python ar_makeup_overlay.py                  # webcam live demo
  python ar_makeup_overlay.py --image face.jpg # static image test
"""

import cv2
import numpy as np
import mediapipe as mp
import argparse
from dataclasses import dataclass, field
from typing import List, Tuple, Optional

# ─────────────────────────────────────────────
# MediaPipe FaceMesh landmark indices
# Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
# ─────────────────────────────────────────────

FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
             397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
             172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

LEFT_CHEEK  = [425, 427, 411, 352, 346, 280, 330, 266, 425]
RIGHT_CHEEK = [205, 207, 187, 123, 117,  50, 101,  36, 205]

LEFT_EYE_SHADOW  = [226, 247, 30, 29, 27, 28, 56, 190, 243, 173, 157, 158, 159, 160, 161, 246, 33, 130, 226]
RIGHT_EYE_SHADOW = [446, 467, 260, 259, 257, 258, 286, 414, 463, 398, 384, 385, 386, 387, 388, 466, 263, 359, 446]

# Eyeliner — upper lash line (drawn as polyline, not filled polygon)
# Left eye upper lid edge, right-to-left
LEFT_UPPER_LASH  = [33, 246, 161, 160, 159, 158, 157, 173, 133]
RIGHT_UPPER_LASH = [263, 466, 388, 387, 386, 385, 384, 398, 362]

# Eyeliner — lower lash line
LEFT_LOWER_LASH  = [33, 7, 163, 144, 145, 153, 154, 155, 133]
RIGHT_LOWER_LASH = [263, 249, 390, 373, 374, 380, 381, 382, 362]

# Lower waterline (tight-line / under-eye)
LEFT_WATERLINE   = [130, 25, 110, 24, 23, 22, 26, 112, 243]
RIGHT_WATERLINE  = [359, 255, 339, 254, 253, 252, 256, 341, 463]

UPPER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61]
LOWER_LIP = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 61]
LIPS      = list(dict.fromkeys(UPPER_LIP + LOWER_LIP))  # deduplicated

NOSE_BRIDGE_HIGHLIGHT = [6, 197, 195, 5, 4]  # top of nose down
CHIN_HIGHLIGHT        = [152, 175, 199, 200, 175, 152]
LEFT_BROW_HIGHLIGHT   = [70, 63, 105, 66, 107]
RIGHT_BROW_HIGHLIGHT  = [300, 293, 334, 296, 336]

LEFT_CONTOUR  = [234, 93, 132, 58, 172, 136]
RIGHT_CONTOUR = [454, 323, 361, 288, 397, 365]
FOREHEAD_CONTOUR = [10, 109, 67, 103, 54, 21, 162, 127]


# ─────────────────────────────────────────────
# Makeup configuration
# ─────────────────────────────────────────────

@dataclass
class MakeupStyle:
    """Defines colour and opacity for each makeup zone."""
    blush_color:      Tuple[int,int,int] = (200,  80, 100)   # rose
    blush_alpha:      float              = 0.35

    eyeshadow_color:  Tuple[int,int,int] = (130,  60, 180)   # mauve
    eyeshadow_alpha:  float              = 0.45

    eyeliner_color:   Tuple[int,int,int] = ( 20,  10,  10)   # near-black
    eyeliner_alpha:   float              = 0.85
    eyeliner_thickness: int              = 3                  # px — scaled with face size

    lash_color:       Tuple[int,int,int] = ( 10,   5,   5)   # black
    lash_alpha:       float              = 0.70
    lash_thickness:   int                = 2

    lip_color:        Tuple[int,int,int] = (180,  30,  60)   # berry
    lip_alpha:        float              = 0.55

    contour_color:    Tuple[int,int,int] = ( 80,  50,  30)   # taupe
    contour_alpha:    float              = 0.25

    highlight_color:  Tuple[int,int,int] = (255, 240, 200)   # champagne
    highlight_alpha:  float              = 0.30

    foundation_color: Tuple[int,int,int] = (210, 170, 130)   # neutral skin
    foundation_alpha: float              = 0.15

    # Which zones to show
    show_blush:       bool = True
    show_eyeshadow:   bool = True
    show_eyeliner:    bool = True
    show_lashes:      bool = True
    show_lips:        bool = True
    show_contour:     bool = True
    show_highlight:   bool = True
    show_foundation:  bool = False   # heavy; off by default


# Preset styles for different face shapes
PRESETS = {
    "oval":    MakeupStyle(blush_alpha=0.30, contour_alpha=0.20),
    "round":   MakeupStyle(blush_color=(210, 90, 90), contour_alpha=0.35, show_contour=True),
    "square":  MakeupStyle(contour_alpha=0.40, highlight_alpha=0.35),
    "heart":   MakeupStyle(blush_alpha=0.40, contour_alpha=0.30, highlight_alpha=0.25),
    "diamond": MakeupStyle(blush_alpha=0.45, highlight_alpha=0.40),
    "default": MakeupStyle(),
}


# ─────────────────────────────────────────────
# Core overlay functions
# ─────────────────────────────────────────────

def get_landmark_coords(landmarks, indices: List[int], w: int, h: int) -> np.ndarray:
    """Extract pixel coords for a list of landmark indices."""
    pts = []
    for i in indices:
        lm = landmarks.landmark[i]
        pts.append([int(lm.x * w), int(lm.y * h)])
    return np.array(pts, dtype=np.int32)


def overlay_region(
    frame: np.ndarray,
    overlay: np.ndarray,
    points: np.ndarray,
    color: Tuple[int, int, int],
    alpha: float,
    blur_ksize: int = 25,
    feather: bool = True,
) -> np.ndarray:
    """
    Draw a filled polygon on `overlay` with soft edges,
    then blend it onto `frame`.
    """
    if len(points) < 3:
        return frame

    # Draw filled region
    cv2.fillPoly(overlay, [points], color)

    if feather:
        # Soft gaussian blur for natural blending
        ksize = blur_ksize | 1  # must be odd
        overlay = cv2.GaussianBlur(overlay, (ksize, ksize), 0)

    # Alpha blend
    mask = (overlay.sum(axis=2) > 0).astype(np.float32)
    for c in range(3):
        frame[:, :, c] = (
            frame[:, :, c] * (1 - alpha * mask) +
            overlay[:, :, c] * alpha * mask
        ).astype(np.uint8)

    return frame


def overlay_line(
    frame: np.ndarray,
    points: np.ndarray,
    color: Tuple[int, int, int],
    alpha: float,
    thickness: int = 3,
    blur_ksize: int = 3,
) -> np.ndarray:
    """
    Draw a polyline (for eyeliner / lash lines) with soft blending.
    Uses a separate overlay layer so the line blends naturally with skin.
    """
    if len(points) < 2:
        return frame

    overlay = np.zeros_like(frame)
    pts = points.reshape((-1, 1, 2))
    cv2.polylines(overlay, [pts], isClosed=False, color=color,
                  thickness=thickness, lineType=cv2.LINE_AA)

    if blur_ksize > 1:
        ksize = blur_ksize | 1
        overlay = cv2.GaussianBlur(overlay, (ksize, ksize), 0)

    mask = (overlay.sum(axis=2) > 0).astype(np.float32)
    for c in range(3):
        frame[:, :, c] = (
            frame[:, :, c] * (1 - alpha * mask) +
            overlay[:, :, c] * alpha * mask
        ).astype(np.uint8)

    return frame


def apply_makeup_ar(
    frame: np.ndarray,
    face_landmarks,
    style: MakeupStyle,
    step: Optional[str] = None,
) -> np.ndarray:
    """
    Apply AR makeup overlays to a frame.
    
    Args:
        frame:          BGR image (OpenCV)
        face_landmarks: MediaPipe FaceMesh landmarks for ONE face
        style:          MakeupStyle configuration
        step:           If set, only apply that step 
                        ('foundation','blush','eyeshadow','eyeliner','lashes',
                         'lips','contour','highlight')
    Returns:
        Annotated BGR frame
    """
    h, w = frame.shape[:2]
    result = frame.copy()

    def coords(indices):
        return get_landmark_coords(face_landmarks, indices, w, h)

    # Helper: create fresh blank overlay each time
    def blank():
        return np.zeros_like(frame)

    # Scale line thickness relative to face width so it looks right on all resolutions
    face_w = abs(coords(FACE_OVAL)[0][0] - coords(FACE_OVAL)[18][0])
    scale  = max(1, face_w // 120)

    # ── Foundation ────────────────────────────────────────
    if style.show_foundation and step in (None, "foundation"):
        ov = blank()
        overlay_region(result, ov, coords(FACE_OVAL),
                       style.foundation_color, style.foundation_alpha,
                       blur_ksize=51)

    # ── Blush ─────────────────────────────────────────────
    if style.show_blush and step in (None, "blush"):
        for cheek_indices in [LEFT_CHEEK, RIGHT_CHEEK]:
            ov = blank()
            overlay_region(result, ov, coords(cheek_indices),
                           style.blush_color, style.blush_alpha,
                           blur_ksize=45)

    # ── Eyeshadow ─────────────────────────────────────────
    if style.show_eyeshadow and step in (None, "eyeshadow"):
        for eye_indices in [LEFT_EYE_SHADOW, RIGHT_EYE_SHADOW]:
            ov = blank()
            overlay_region(result, ov, coords(eye_indices),
                           style.eyeshadow_color, style.eyeshadow_alpha,
                           blur_ksize=15)

    # ── Eyeliner (upper lash line) ────────────────────────
    if style.show_eyeliner and step in (None, "eyeliner"):
        for lash_indices in [LEFT_UPPER_LASH, RIGHT_UPPER_LASH]:
            overlay_line(result, coords(lash_indices),
                         style.eyeliner_color, style.eyeliner_alpha,
                         thickness=style.eyeliner_thickness * scale,
                         blur_ksize=3)

    # ── Lower Lashes / waterline ──────────────────────────
    if style.show_lashes and step in (None, "lashes"):
        for lash_indices in [LEFT_LOWER_LASH, RIGHT_LOWER_LASH]:
            overlay_line(result, coords(lash_indices),
                         style.lash_color, style.lash_alpha,
                         thickness=style.lash_thickness * scale,
                         blur_ksize=2)
        # Subtle waterline
        for wl_indices in [LEFT_WATERLINE, RIGHT_WATERLINE]:
            overlay_line(result, coords(wl_indices),
                         style.lash_color, style.lash_alpha * 0.6,
                         thickness=max(1, scale),
                         blur_ksize=1)

    # ── Lips ──────────────────────────────────────────────
    if style.show_lips and step in (None, "lips"):
        ov = blank()
        overlay_region(result, ov, coords(LIPS),
                       style.lip_color, style.lip_alpha,
                       blur_ksize=7, feather=True)

    # ── Contour ───────────────────────────────────────────
    if style.show_contour and step in (None, "contour"):
        for contour_indices in [LEFT_CONTOUR, RIGHT_CONTOUR, FOREHEAD_CONTOUR]:
            ov = blank()
            overlay_region(result, ov, coords(contour_indices),
                           style.contour_color, style.contour_alpha,
                           blur_ksize=55)

    # ── Highlight ─────────────────────────────────────────
    if style.show_highlight and step in (None, "highlight"):
        for hl_indices in [NOSE_BRIDGE_HIGHLIGHT, CHIN_HIGHLIGHT,
                           LEFT_BROW_HIGHLIGHT, RIGHT_BROW_HIGHLIGHT]:
            ov = blank()
            overlay_region(result, ov, coords(hl_indices),
                           style.highlight_color, style.highlight_alpha,
                           blur_ksize=21)

    return result


# ─────────────────────────────────────────────
# Guided step-by-step mode
# ─────────────────────────────────────────────

STEPS = [
    ("foundation", "Step 1 — Foundation\nBlend evenly across your entire face"),
    ("contour",    "Step 2 — Contour\nApply to cheek hollows, sides of nose, and forehead edges"),
    ("highlight",  "Step 3 — Highlight\nDab on nose bridge, brow bone, and chin"),
    ("eyeshadow",  "Step 4 — Eyeshadow\nBlend from lid to crease"),
    ("eyeliner",   "Step 5 — Eyeliner\nDraw along your upper lash line, thin to thick"),
    ("lashes",     "Step 6 — Lower Lashes\nLine the lower lid lightly with a fine brush"),
    ("blush",      "Step 7 — Blush\nSmile and apply to the apples of your cheeks"),
    ("lips",       "Step 8 — Lips\nOutline first, then fill inward"),
]


def draw_guidance_text(frame: np.ndarray, text: str) -> np.ndarray:
    """Render step instructions on frame with a frosted panel."""
    h, w = frame.shape[:2]
    lines = text.split("\n")

    # Semi-transparent dark bar at bottom
    bar_h = 90
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, h - bar_h), (w, h), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

    # Text
    y = h - bar_h + 28
    for line in lines:
        is_title = line.startswith("Step")
        font_scale = 0.7 if is_title else 0.55
        thickness  = 2 if is_title else 1
        color      = (255, 200, 180) if is_title else (220, 220, 220)
        cv2.putText(frame, line.strip(), (20, y),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, thickness, cv2.LINE_AA)
        y += 30

    return frame


# ─────────────────────────────────────────────
# Main application loop
# ─────────────────────────────────────────────

def run(source=0, face_shape="default", guided=True, image_path=None):
    mp_face_mesh = mp.solutions.face_mesh
    style = PRESETS.get(face_shape, PRESETS["default"])

    step_idx = 0
    current_step_name = STEPS[step_idx][0] if guided else None

    with mp_face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.5,
    ) as face_mesh:

        # ── Static image mode ─────────────────────────────
        if image_path:
            img = cv2.imread(image_path)
            if img is None:
                print(f"[ERROR] Cannot read image: {image_path}")
                return

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)

            if results.multi_face_landmarks:
                for lm in results.multi_face_landmarks:
                    img = apply_makeup_ar(img, lm, style)
                draw_guidance_text(img, "AR Makeup Preview — All zones applied")
            else:
                print("[WARN] No face detected in image.")

            cv2.imshow("Glam Cam — AR Makeup", img)
            cv2.waitKey(0)
            cv2.destroyAllWindows()
            return

        # ── Live webcam mode ──────────────────────────────
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"[ERROR] Cannot open camera source: {source}")
            return

        print("\n[Glam Cam AR] Controls:")
        print("  SPACE  — next step")
        print("  r      — restart steps")
        print("  q      — quit\n")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.flip(frame, 1)  # mirror for smart mirror UX
            rgb   = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb)

            if results.multi_face_landmarks:
                for lm in results.multi_face_landmarks:
                    if guided:
                        frame = apply_makeup_ar(frame, lm, style, step=current_step_name)
                        _, text = STEPS[step_idx]
                        draw_guidance_text(frame, text)
                    else:
                        frame = apply_makeup_ar(frame, lm, style)
            else:
                # No face detected — show prompt
                cv2.putText(frame, "Position your face in the mirror",
                            (30, 50), cv2.FONT_HERSHEY_SIMPLEX,
                            0.8, (180, 220, 255), 2, cv2.LINE_AA)

            cv2.imshow("Glam Cam — AR Makeup", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord(' ') and guided:
                step_idx = (step_idx + 1) % len(STEPS)
                current_step_name = STEPS[step_idx][0]
            elif key == ord('r') and guided:
                step_idx = 0
                current_step_name = STEPS[0][0]

    cap.release()
    cv2.destroyAllWindows()


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Glam Cam AR Makeup Overlay")
    parser.add_argument("--source",     type=int,   default=0,         help="Camera index (default 0)")
    parser.add_argument("--face-shape", type=str,   default="default", help="oval | round | square | heart | diamond")
    parser.add_argument("--no-guide",   action="store_true",           help="Show all zones at once, no step guidance")
    parser.add_argument("--image",      type=str,   default=None,      help="Path to static image (skips webcam)")
    args = parser.parse_args()

    run(
        source=args.source,
        face_shape=args.face_shape,
        guided=not args.no_guide,
        image_path=args.image,
    )