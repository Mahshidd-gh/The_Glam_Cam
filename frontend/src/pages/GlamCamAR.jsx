import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

// ─── Colours ───────────────────────────────────────────────────────────────
const R = "rgba(220,30,30,";
const RS = "rgba(255,60,60,";

// ─── Keyword helpers ────────────────────────────────────────────────────────
function matchesKeyword(text, keyword) {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z])${esc}(?![a-z])`, "i").test(text);
}

export function parseZones(text) {
  const lower = text.toLowerCase();
  const zones = new Set();
  KEYWORD_ZONES.forEach(rule => {
    if (rule.keywords.some(k => matchesKeyword(lower, k)))
      rule.zones.forEach(z => zones.add(z));
  });
  return [...zones];
}

const KEYWORD_ZONES = [
  { keywords: ["jawline", "jaw line", "jaw", "ear to chin", "from ear to chin"], zones: ["jawline"] },
  { keywords: ["chin"], zones: ["chin"] },
  { keywords: ["corner of mouth", "mouth corner"], zones: ["mouth_corners"] },
  { keywords: ["apple of the cheek", "cheeks", "cheek"], zones: ["cheeks"] },
  { keywords: ["cheekbone", "cheek bone", "hollow of the cheek", "hallows of the cheek", "under the cheekbone", "below the cheekbone"], zones: ["cheekbone"] },
  { keywords: ["cheeks"], zones: ["cheeks"] },
  { keywords: ["temple", "temples"], zones: ["temples"] },
  { keywords: ["center of the forehead", "centre of the forehead", "forehead"], zones: ["forehead_center"] },
  { keywords: ["hairline"], zones: ["hairline"] },
  { keywords: ["bridge of nose", "nose bridge", "bridge of the nose"], zones: ["nose_bridge"] },
  { keywords: ["side of the nose", "sides of the nose", "sides of nose", "side of nose", "nose sides"], zones: ["nose_sides"] },
  { keywords: ["tip of the nose", "tip of nose", "nose tip"], zones: ["nose_tip"] },
  { keywords: ["brow bone", "browbone"], zones: ["brow_bone"] },
  { keywords: ["eyebrow", "brow"], zones: ["brows"] },
  { keywords: ["socket line", "eye socket", "socket"], zones: ["eye_socket"] },
  { keywords: ["cut crease", "crease"], zones: ["eye_crease"] },
  { keywords: ["upper lash line", "upper lashline", "mobile lid", "upper lid"], zones: ["eye_upper_lid"] },
  { keywords: ["lid"], zones: ["eye_upper_lid"] },
  { keywords: ["inner corner", "inner corners", "inside eye"], zones: ["eye_inner_corner"] },
  { keywords: ["outer v", "outer corner", "outer eye"], zones: ["eye_outer_v"] },
  { keywords: ["lower lash line", "lower lashline", "lash line", "lower waterline", "upper waterline", "waterline", "lower lids", "lower lid"], zones: ["lash_line"] },
  { keywords: ["lashes", "lash"], zones: ["lash_line"] },
  { keywords: ["eyeliner", "liner", "wing", "tight-line"], zones: ["eyeliner"] },
  { keywords: ["cupid's bow", "cupids bow", "cupid bow", "top lip", "upper lip"], zones: ["lip_top"] },
  { keywords: ["lower lip", "bottom lip"], zones: ["lip_bottom"] },
  { keywords: ["lips", "lip"], zones: ["lip_top", "lip_bottom"] },
  { keywords: ["full face", "entire face", "all over", "evenly"], zones: ["full_face"] },
];

export const ZONE_META = {
  full_face: "Full Face", jawline: "Jawline", chin: "Chin",
  mouth_corners: "Corner of Mouth", cheekbone: "Cheekbone",
  cheeks: "Cheeks", temples: "Temples",
  forehead_center: "Forehead", hairline: "Hairline",
  nose_bridge: "Nose Bridge", nose_sides: "Sides of Nose", nose_tip: "Nose Tip",
  brow_bone: "Brow Bone", brows: "Eyebrows", eye_socket: "Socket Line",
  eye_crease: "Crease", eye_upper_lid: "Upper Lid",
  eye_inner_corner: "Inner Corner", eye_outer_v: "Outer V",
  lash_line: "Lash Line", eyeliner: "Eyeliner",
  lip_top: "Top Lip", lip_bottom: "Lower Lip",
};

// ─── MediaPipe landmark indices for each zone ───────────────────────────────
// These map zone names → arrays of landmark point indices from FaceMesh's 468-point model
const ZONE_LANDMARKS = {
  full_face: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
  jawline: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323],
  chin: [152, 377, 378, 379, 175, 396, 152],
  mouth_corners: [61, 291],
  cheeks: [117, 118, 119, 120, 121, 346, 347, 348, 349, 350],
  cheekbone: [116, 123, 147, 213, 192, 214, 207, 345, 372, 376, 433, 416, 434, 427],
  temples: [162, 127, 356, 389],
  forehead_center: [151, 9, 8, 107, 336],
  hairline: [10, 338, 297, 332, 284, 251, 301, 368, 264, 447, 366, 401, 435, 367, 364, 394, 395, 378, 292, 361, 323, 454, 356, 389, 251, 284, 332, 297, 338, 10, 109, 67, 103, 54, 21, 162, 127, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
  nose_bridge: [168, 6, 197, 195, 5],
  nose_sides: [48, 64, 98, 97, 2, 326, 327, 278, 294],
  nose_tip: [1, 2, 98, 327, 168],
  brow_bone: [70, 63, 105, 66, 107, 336, 296, 334, 293, 300],
  brows: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 336, 296, 334, 293, 300, 285, 295, 282, 283, 276],
  eye_socket: [226, 247, 30, 29, 27, 28, 56, 190, 243, 112, 26, 22, 23, 24, 110, 25, 446, 467, 260, 259, 257, 258, 286, 414, 463, 341, 256, 252, 253, 254, 339, 255],
  eye_crease: [226, 247, 30, 29, 27, 28, 56, 190, 446, 467, 260, 259, 257, 258, 286, 414],
  eye_upper_lid: [246, 161, 160, 159, 158, 157, 173, 466, 388, 387, 386, 385, 384, 398],
  eye_inner_corner: [243, 112, 463, 341],
  eye_outer_v: [33, 130, 263, 359],
  lash_line: [33, 7, 163, 144, 145, 153, 154, 155, 133, 263, 249, 390, 373, 374, 380, 381, 382, 362],
  eyeliner: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  lip_top: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78],
  lip_bottom: [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78],
};


function lmPx(lm, idx, w, h, mirrored = true) {
  const p = lm[idx];
  if (!p) return null;
  return {
    x: mirrored ? (1 - p.x) * w : p.x * w,
    y: p.y * h,
  };
}

function drawZone(ctx, zone, lm, w, h) {
  const indices = ZONE_LANDMARKS[zone];
  if (!indices) return;

  const pts = indices.map(i => lmPx(lm, i, w, h)).filter(Boolean);
  if (pts.length === 0) return;

  ctx.save();

  // glow effect
  ctx.shadowBlur = 18;
  ctx.shadowColor = RS + "0.9)";

  if (zone === "jawline") {
    // draw as a stroke along jawline points
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = RS + "0.95)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    // soft wide glow pass
    ctx.shadowBlur = 30;
    ctx.lineWidth = 18;
    ctx.strokeStyle = R + "0.25)";
    ctx.stroke();

  } else if (zone === "hairline") {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = RS + "0.95)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.shadowBlur = 30;
    ctx.lineWidth = 18;
    ctx.strokeStyle = R + "0.25)";
    ctx.stroke();

  } else if (["brows", "eye_socket", "eye_crease", "lash_line", "eyeliner"].includes(zone)) {
    // split left/right eye roughly at centre
    const midX = w / 2;
    const left = pts.filter(p => p.x > midX); // mirrored: left face = higher x
    const right = pts.filter(p => p.x <= midX);

    [left, right].forEach(side => {
      if (side.length < 2) return;
      const sorted = [...side].sort((a, b) => a.x - b.x);
      ctx.beginPath();
      ctx.moveTo(sorted[0].x, sorted[0].y);
      sorted.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = RS + "0.95)";
      ctx.lineWidth = zone === "brows" ? 6 : 3.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.shadowBlur = 24;
      ctx.lineWidth = zone === "brows" ? 16 : 12;
      ctx.strokeStyle = R + "0.22)";
      ctx.stroke();
    });

  } else {
    // filled polygon zone (convex hull approximation via point cloud)
    const hull = convexHull(pts);
    if (hull.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(hull[0].x, hull[0].y);
    hull.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = R + "0.30)";
    ctx.fill();
    ctx.strokeStyle = RS + "0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// Simple convex hull (Graham scan) so filled zones look clean
function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

// ─── Flash animation state ──────────────────────────────────────────────────
// We track when animKey last changed and produce a 0-1 opacity multiplier
function flashOpacity(startTime) {
  const t = (Date.now() - startTime) / 1200; // 1200ms like the original
  if (t >= 1) return 1;
  // keyframes: 0→1 at 0.12, back 0 at 0.25, 1 at 0.38, 0 at 0.5, 1 at 0.62, stay 1
  const kf = [[0, 0], [0.12, 1], [0.25, 0], [0.38, 1], [0.50, 0], [0.62, 1], [1, 1]];
  for (let i = 1; i < kf.length; i++) {
    if (t <= kf[i][0]) {
      const prog = (t - kf[i - 1][0]) / (kf[i][0] - kf[i - 1][0]);
      return kf[i - 1][1] + prog * (kf[i][1] - kf[i - 1][1]);
    }
  }
  return 1;
}

// ─── ZoneOverlay: canvas overlay with face tracking ─────────────────────────
export function ZoneOverlay({ zones, animKey, videoRef }) {
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);
  const latestLandmarks = useRef(null);
  const animStartRef = useRef(Date.now());

  // Track when animKey changes to restart flash
  useEffect(() => {
    animStartRef.current = Date.now();
  }, [animKey]);

  // Load MediaPipe FaceMesh once
  useEffect(() => {
    let destroyed = false;

    async function loadMediaPipe() {
      // Dynamically load scripts if not already present
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");

      if (destroyed) return;

      const faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          latestLandmarks.current = results.multiFaceLandmarks[0];
        } else {
          latestLandmarks.current = null;
        }
      });

      faceMeshRef.current = faceMesh;
    }

    loadMediaPipe().catch(console.error);

    return () => {
      destroyed = true;
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, []);

  // Per-frame render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let frameCount = 0;

    async function loop() {
      const video = videoRef?.current;
      const faceMesh = faceMeshRef.current;
      const ctx = canvas.getContext("2d");

      // Sync canvas size to its display size
      const { offsetWidth: w, offsetHeight: h } = canvas;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      // Send every 2nd frame to FaceMesh (saves CPU, still smooth)
      if (faceMesh && video && video.readyState >= 2) {
        frameCount++;
        if (frameCount % 2 === 0) {
          await faceMesh.send({ image: video });
        }
      }

      const lm = latestLandmarks.current;
      if (lm && zones.length > 0) {
        const opacity = flashOpacity(animStartRef.current);
        ctx.globalAlpha = opacity;
        zones.forEach(zone => drawZone(ctx, zone, lm, w, h));
        ctx.globalAlpha = 1;
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [zones, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// Helper: load a script tag once
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ─── FaceSVG (unchanged — used in GlamCamAR preview page) ───────────────────
const FACE_PATH = "M100,55 C155,38 205,38 260,55 C318,82 330,145 328,198 C323,272 296,328 235,350 C200,362 160,362 125,350 C64,328 37,272 32,198 C30,145 42,82 100,55Z";

const ZONE_SHAPES = {
  full_face: [{ type: "path", d: "M100,60 C155,42 205,42 260,60 C318,88 328,148 325,200 C320,270 295,325 235,348 C200,360 160,360 125,348 C65,325 40,270 35,200 C32,148 42,88 100,60Z", fill: "rgba(220,30,30,0.20)", stroke: "rgba(255,60,60,0.70)", sw: 2.5 }],
  jawline: [
    { type: "path", d: "M60,222 Q50,265 62,302 Q85,338 148,356", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M300,222 Q310,265 298,302 Q275,338 212,356", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M60,222 Q50,265 62,302 Q85,338 148,356", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 20 },
    { type: "path", d: "M300,222 Q310,265 298,302 Q275,338 212,356", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 20 },
  ],
  chin: [{ type: "ellipse", cx: 180, cy: 354, rx: 42, ry: 16, fill: "rgba(220,30,30,0.30)", stroke: "rgba(255,60,60,0.80)", sw: 2.5 }],
  mouth_corners: [
    { type: "ellipse", cx: 143, cy: 298, rx: 14, ry: 11, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.80)", sw: 2 },
    { type: "ellipse", cx: 217, cy: 298, rx: 14, ry: 11, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.80)", sw: 2 },
  ],
  cheekbone: [
    { type: "ellipse", cx: 92, cy: 192, rx: 52, ry: 12, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.90)", sw: 2.5 },
    { type: "ellipse", cx: 268, cy: 192, rx: 52, ry: 12, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.90)", sw: 2.5 },
  ],
  cheek: [
    { type: "ellipse", cx: 108, cy: 240, rx: 46, ry: 40, fill: "rgba(220,30,30,0.32)", stroke: "rgba(255,60,60,0.78)", sw: 2.5 },
    { type: "ellipse", cx: 252, cy: 240, rx: 46, ry: 40, fill: "rgba(220,30,30,0.32)", stroke: "rgba(255,60,60,0.78)", sw: 2.5 },
  ],
  temples: [
    { type: "ellipse", cx: 50, cy: 108, rx: 26, ry: 40, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.75)", sw: 2 },
    { type: "ellipse", cx: 310, cy: 108, rx: 26, ry: 40, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.75)", sw: 2 },
  ],
  forehead_center: [{ type: "ellipse", cx: 180, cy: 68, rx: 65, ry: 26, fill: "rgba(220,30,30,0.25)", stroke: "rgba(255,60,60,0.68)", sw: 2 }],
  hairline: [
    { type: "path", d: "M68,62 Q118,36 180,32 Q242,36 292,62", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M68,62 Q118,36 180,32 Q242,36 292,62", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 20 },
  ],
  nose_bridge: [{ type: "ellipse", cx: 180, cy: 192, rx: 10, ry: 42, fill: "rgba(220,30,30,0.25)", stroke: "rgba(255,60,60,0.72)", sw: 2 }],
  nose_sides: [
    { type: "ellipse", cx: 157, cy: 222, rx: 13, ry: 16, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
    { type: "ellipse", cx: 203, cy: 222, rx: 13, ry: 16, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
  ],
  nose_tip: [{ type: "ellipse", cx: 180, cy: 232, rx: 17, ry: 13, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 }],
  brow_bone: [
    { type: "ellipse", cx: 118, cy: 140, rx: 35, ry: 9, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
    { type: "ellipse", cx: 242, cy: 140, rx: 35, ry: 9, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
  ],
  brows: [
    { type: "path", d: "M84,129 Q108,118 142,125", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 7 },
    { type: "path", d: "M218,125 Q252,118 276,129", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 7 },
    { type: "path", d: "M84,129 Q108,118 142,125", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 18 },
    { type: "path", d: "M218,125 Q252,118 276,129", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 18 },
  ],
  eye_socket: [
    { type: "path", d: "M86,150 Q118,137 150,150", fill: "none", stroke: "rgba(255,60,60,0.90)", sw: 3.5 },
    { type: "path", d: "M210,150 Q242,137 274,150", fill: "none", stroke: "rgba(255,60,60,0.90)", sw: 3.5 },
    { type: "path", d: "M86,150 Q118,137 150,150", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 14 },
    { type: "path", d: "M210,150 Q242,137 274,150", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 14 },
  ],
  eye_crease: [
    { type: "path", d: "M87,152 Q118,142 149,152", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M211,152 Q242,142 273,152", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M87,152 Q118,142 149,152", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 16 },
    { type: "path", d: "M211,152 Q242,142 273,152", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 16 },
  ],
  eye_upper_lid: [
    { type: "ellipse", cx: 118, cy: 161, rx: 35, ry: 13, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.85)", sw: 2.5 },
    { type: "ellipse", cx: 242, cy: 161, rx: 35, ry: 13, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.85)", sw: 2.5 },
  ],
  eye_inner_corner: [
    { type: "ellipse", cx: 88, cy: 161, rx: 11, ry: 9, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.82)", sw: 2 },
    { type: "ellipse", cx: 272, cy: 161, rx: 11, ry: 9, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.82)", sw: 2 },
  ],
  eye_outer_v: [
    { type: "path", d: "M147,156 L158,163 L147,170", fill: "none", stroke: "rgba(255,60,60,0.92)", sw: 4 },
    { type: "path", d: "M213,156 L202,163 L213,170", fill: "none", stroke: "rgba(255,60,60,0.92)", sw: 4 },
  ],
  lash_line: [
    { type: "path", d: "M85,170 Q102,178 118,179 Q134,178 151,170", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M209,170 Q226,178 242,179 Q258,178 275,170", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M85,170 Q102,178 118,179 Q134,178 151,170", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 14 },
    { type: "path", d: "M209,170 Q226,178 242,179 Q258,178 275,170", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 14 },
  ],
  eyeliner: [
    { type: "path", d: "M85,164 Q118,154 151,164", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M151,164 L140,154", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M275,164 Q242,154 209,164", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M209,164 L220,154", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
  ],
  lip_top: [{ type: "path", d: "M148,291 Q163,281 180,285 Q197,281 212,291 Q198,297 180,295 Q162,297 148,291Z", fill: "rgba(220,30,30,0.45)", stroke: "rgba(255,60,60,0.90)", sw: 2 }],
  lip_bottom: [{ type: "path", d: "M148,295 Q162,297 180,299 Q198,297 212,295 Q204,318 180,322 Q156,318 148,295Z", fill: "rgba(220,30,30,0.45)", stroke: "rgba(255,60,60,0.90)", sw: 2 }],
};

function ZoneLayer({ shapes }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || shapes.length === 0) return;
    el.animate(
      [
        { opacity: 0, offset: 0 }, { opacity: 1, offset: 0.12 },
        { opacity: 0, offset: 0.25 }, { opacity: 1, offset: 0.38 },
        { opacity: 0, offset: 0.50 }, { opacity: 1, offset: 0.62 },
        { opacity: 1, offset: 1 },
      ],
      { duration: 1200, fill: "forwards", easing: "ease" }
    );
  }, []);
  return (
    <g ref={ref}>
      {shapes.map((s, i) =>
        s.type === "ellipse"
          ? <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={s.fill || "none"} stroke={s.stroke || "none"} strokeWidth={s.sw || 1} />
          : <path key={i} d={s.d} fill={s.fill || "none"} stroke={s.stroke || "none"} strokeWidth={s.sw || 1} />
      )}
    </g>
  );
}

export function FaceSVG({ zones, animKey }) {
  const shapes = zones.flatMap((z) => ZONE_SHAPES[z] || []);
  return (
    <svg viewBox="0 0 360 400" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="rglow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={FACE_PATH} fill="#f0c898" stroke="#d4a870" strokeWidth="1.5" />
      <ellipse cx="31" cy="196" rx="12" ry="22" fill="#e8b880" stroke="#d4a870" strokeWidth="1" />
      <ellipse cx="329" cy="196" rx="12" ry="22" fill="#e8b880" stroke="#d4a870" strokeWidth="1" />
      <ellipse cx="118" cy="162" rx="32" ry="13" fill="white" opacity="0.75" />
      <ellipse cx="242" cy="162" rx="32" ry="13" fill="white" opacity="0.75" />
      <circle cx="118" cy="162" r="9" fill="#3a2518" opacity="0.9" />
      <circle cx="242" cy="162" r="9" fill="#3a2518" opacity="0.9" />
      <circle cx="121" cy="159" r="2.5" fill="white" opacity="0.6" />
      <circle cx="245" cy="159" r="2.5" fill="white" opacity="0.6" />
      <path d="M86,130 Q108,120 142,126" fill="none" stroke="#3a2518" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M218,126 Q252,120 274,130" fill="none" stroke="#3a2518" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M172,196 Q168,218 158,228 Q168,235 180,235 Q192,235 202,228 Q192,218 188,196" fill="none" stroke="#c4906a" strokeWidth="1.2" opacity="0.45" />
      <path d="M148,292 Q165,282 180,286 Q195,282 212,292 Q202,316 180,320 Q158,316 148,292Z" fill="#d08090" opacity="0.50" />
      {shapes.length > 0 && (
        <g key={animKey} filter="url(#rglow)">
          <ZoneLayer shapes={shapes} />
        </g>
      )}
    </svg>
  );
}

// ─── Main GlamCamAR page (unchanged behaviour) ───────────────────────────────
function GlamCamAR() {
  const [stepIdx, setStepIdx] = useState(0);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [tutorial, setTutorial] = useState(null);
  const location = useLocation();
  const preferences = location.state;

  const goStep = (i) => { setStepIdx(i); setAnimKey(k => k + 1); };
  const goCustom = () => { setCustomMode(v => !v); setAnimKey(k => k + 1); };

  const instruction = customMode ? customText : tutorial?.steps?.[stepIdx] || "";
  const zones = parseZones(instruction);

  useEffect(() => {
    async function loadTutorial() {
      if (!preferences) return;
      try {
        const res = await fetch(
          `http://localhost:8000/get_tutorial?face_shape=${preferences.faceShape}&makeup_style=${preferences.makeupType}&hair_style=${preferences.hairstyle}`
        );
        const data = await res.json();
        if (data.steps) { setTutorial(data); setStepIdx(0); }
      } catch (err) {
        console.error("Tutorial fetch error:", err);
      }
    }
    loadTutorial();
  }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">Glam<span>Cam</span></div>
        <div className="badge">AR Preview</div>
      </div>
      <div className="body">
        <div className="sidebar">
          <div className="sidebar-title">Tutorials</div>
          {tutorial && (
            <button className={`tut-btn ${!customMode ? "active" : ""}`}>
              <div className="tut-name">{tutorial.face_shape}</div>
              <div className="tut-count">{tutorial.total_steps} steps</div>
            </button>
          )}
          <div className="divider" />
          <button className={`custom-toggle ${customMode ? "active" : ""}`} onClick={goCustom}>
            ✏️ Try your own instruction
          </button>
        </div>

        <div className="centre">
          <div className="ar-live"><div className="ar-dot" /> AR Overlay Preview</div>
          <div className="ar-frame">
            <div className="br" />
            <FaceSVG zones={zones} animKey={animKey} />
          </div>
          <div className="zone-pills">
            {zones.length === 0
              ? <span className="no-zones">No zones detected</span>
              : zones.map(z => <span key={z} className="pill">{ZONE_META[z] || z}</span>)
            }
          </div>
          {instruction && <div className="instruction-quote">"{instruction}"</div>}
        </div>

        <div className="right-panel">
          <div className="rp-header">
            <div className="rp-title">{customMode ? "Custom Instruction" : tutorial?.label}</div>
            <div className="rp-sub">{customMode ? "Type any instruction below" : `Step ${stepIdx + 1} of ${tutorial?.steps?.length || 0}`}</div>
          </div>
          {customMode ? (
            <div className="custom-area">
              <label className="custom-label">Instruction text</label>
              <textarea className="custom-input" value={customText}
                onChange={e => { setCustomText(e.target.value); setAnimKey(k => k + 1); }}
                placeholder="e.g. blend along the jawline from ear to chin" />
              <div className="hint-wrap">
                <div className="custom-hint">Anatomical zone keywords:</div>
                <div className="hint-tags">
                  {["jawline", "chin", "cheekbone", "apple of cheek", "cheek", "temple", "forehead",
                    "hairline", "nose bridge", "sides of nose", "nose tip", "brow bone", "eyebrow", "brow",
                    "socket line", "crease", "upper lid", "lid", "inner corner", "outer v",
                    "lash line", "lashes", "eyeliner", "wing", "top lip", "lower lip", "lips"].map(k => (
                      <span key={k} className="hint-tag">{k}</span>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="steps-list">
              {tutorial?.steps?.map((s, i) => (
                <div key={i} className={`step-row ${i === stepIdx ? "active" : ""}`} onClick={() => goStep(i)}>
                  <div className="step-num">{i + 1}</div>
                  <div className="step-text">{s}</div>
                </div>
              ))}
            </div>
          )}
          {!customMode && (
            <div className="nav-area">
              <button className="nav-btn" onClick={() => goStep(stepIdx - 1)} disabled={stepIdx === 0}>← Back</button>
              <button className="nav-btn primary" onClick={() => goStep(stepIdx + 1)} disabled={stepIdx === tutorial?.steps?.length - 1}>Next →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlamCamAR;