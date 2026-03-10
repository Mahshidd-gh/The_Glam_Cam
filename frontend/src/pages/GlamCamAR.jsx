import { useState, useEffect, useRef, useCallback } from "react";

// ─── Palette builder ─────────────────────────────────────────────────────────

const BASE_PALETTE = {
  blush:     { fill:   [200,  80, 100], alpha: 0.35, blur: 28 },
  eyeshadow: { fill:   [130,  60, 180], alpha: 0.45, blur: 10 },
  eyeliner:  { stroke: [ 20,  10,  10], alpha: 0.88, width: 3, blur: 1 },
  lashes:    { stroke: [ 10,   5,   5], alpha: 0.72, width: 2, blur: 1 },
  waterline: { stroke: [ 40,  10,  20], alpha: 0.50, width: 1, blur: 1 },
  lips:      { fill:   [180,  30,  60], alpha: 0.55, blur: 5  },
  contour:   { fill:   [ 80,  50,  30], alpha: 0.25, blur: 32 },
  highlight: { fill:   [255, 240, 200], alpha: 0.30, blur: 14 },
};

const SHAPE_OVERRIDES = {
  round:   { contour:   { alpha: 0.40, blur: 36 } },
  square:  { contour:   { alpha: 0.45, blur: 36 }, highlight: { alpha: 0.38 } },
  heart:   { blush:     { alpha: 0.42 }, contour: { alpha: 0.32 } },
  diamond: { blush:     { alpha: 0.48 }, highlight: { alpha: 0.42 } },
  oval:    { contour:   { alpha: 0.20 } },
};

function buildPalette(faceShape) {
  const palette = JSON.parse(JSON.stringify(BASE_PALETTE));
  const overrides = SHAPE_OVERRIDES[faceShape] || {};
  for (const [zone, props] of Object.entries(overrides)) {
    Object.assign(palette[zone], props);
  }
  return palette;
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────

function drawFill(ctx, pts, style) {
  if (!pts || pts.length < 3) return;
  const [r, g, b] = style.fill;
  ctx.save();
  ctx.filter = `blur(${style.blur}px)`;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = `rgba(${r},${g},${b},${style.alpha})`;
  ctx.fill();
  ctx.restore();
}

function drawStroke(ctx, pts, style) {
  if (!pts || pts.length < 2) return;
  const [r, g, b] = style.stroke;
  ctx.save();
  ctx.filter      = `blur(${style.blur}px)`;
  ctx.lineWidth   = style.width;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
  ctx.strokeStyle = `rgba(${r},${g},${b},${style.alpha})`;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.restore();
}

function renderMakeup(ctx, lm, step, palette) {
  const s = step;
  if (s === null || s === "contour") {
    drawFill(ctx, lm.contour_left,  palette.contour);
    drawFill(ctx, lm.contour_right, palette.contour);
  }
  if (s === null || s === "highlight") {
    drawFill(ctx, lm.nose_highlight, palette.highlight);
  }
  if (s === null || s === "blush") {
    drawFill(ctx, lm.blush_left,  palette.blush);
    drawFill(ctx, lm.blush_right, palette.blush);
  }
  if (s === null || s === "eyeshadow") {
    drawFill(ctx, lm.eye_left,  palette.eyeshadow);
    drawFill(ctx, lm.eye_right, palette.eyeshadow);
  }
  if (s === null || s === "eyeliner") {
    drawStroke(ctx, lm.eyeliner_left,  palette.eyeliner);
    drawStroke(ctx, lm.eyeliner_right, palette.eyeliner);
  }
  if (s === null || s === "lashes") {
    drawStroke(ctx, lm.lash_lower_left,  palette.lashes);
    drawStroke(ctx, lm.lash_lower_right, palette.lashes);
    drawStroke(ctx, lm.waterline_left,   palette.waterline);
    drawStroke(ctx, lm.waterline_right,  palette.waterline);
  }
  if (s === null || s === "lips") {
    drawFill(ctx, lm.lips, palette.lips);
  }
}

// ─── Landmark smoothing ───────────────────────────────────────────────────────

const SMOOTHING = 0.4;

function smoothLandmarks(prev, next) {
  if (!prev) return next;
  const out = {};
  for (const zone of Object.keys(next)) {
    const p = prev[zone] || next[zone];
    out[zone] = next[zone].map((pt, i) => ({
      x: pt.x * (1 - SMOOTHING) + (p[i] ? p[i].x : pt.x) * SMOOTHING,
      y: pt.y * (1 - SMOOTHING) + (p[i] ? p[i].y : pt.y) * SMOOTHING,
    }));
  }
  return out;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { key: null,        label: "All",        icon: "✦", tip: "Preview all makeup zones at once." },
  { key: "contour",   label: "Contour",    icon: "◈", tip: "Blend into cheek hollows, temples, and sides of the nose." },
  { key: "highlight", label: "Highlight",  icon: "✧", tip: "Tap onto nose bridge, brow bone, and centre of chin." },
  { key: "eyeshadow", label: "Eyeshadow",  icon: "◉", tip: "Blend from the lash line up to the crease." },
  { key: "eyeliner",  label: "Eyeliner",   icon: "—", tip: "Draw along the upper lash line. Flick outward for a wing." },
  { key: "lashes",    label: "Lashes",     icon: "∿", tip: "Line the lower lid lightly along the waterline." },
  { key: "blush",     label: "Blush",      icon: "◍", tip: "Smile gently and sweep onto the apples of your cheeks." },
  { key: "lips",      label: "Lips",       icon: "♡", tip: "Outline with a lip liner first, then fill inward." },
];

const FACE_SHAPES = ["default", "oval", "round", "square", "heart", "diamond"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlamCamAR({
  apiBase    = "/api/ar",
  fps        = 15,
  initialShape = "default",
}) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const lastLMRef = useRef(null);
  const timerRef  = useRef(null);
  const runningRef = useRef(false);

  const [isActive,    setIsActive]    = useState(false);
  const [faceShape,   setFaceShape]   = useState(initialShape);
  const [activeStep,  setActiveStep]  = useState(null);
  const [faceFound,   setFaceFound]   = useState(false);
  const [status,      setStatus]      = useState("idle"); // idle | loading | running | error
  const [errorMsg,    setErrorMsg]    = useState("");

  const paletteRef = useRef(buildPalette(initialShape));

  // Rebuild palette when face shape changes
  useEffect(() => {
    paletteRef.current = buildPalette(faceShape);
  }, [faceShape]);

  // ── Frame capture ───────────────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video) return null;
    const sw = video.videoWidth  || 640;
    const sh = video.videoHeight || 480;
    const tw = Math.min(sw, 640);
    const th = Math.round(sh * tw / sw);
    const tmp = document.createElement("canvas");
    tmp.width  = tw;
    tmp.height = th;
    tmp.getContext("2d").drawImage(video, 0, 0, tw, th);
    return tmp.toDataURL("image/jpeg", 0.80);
  }, []);

  // ── API call ────────────────────────────────────────────────────────────────
  const fetchLandmarks = useCallback(async (b64) => {
    const res = await fetch(`${apiBase}/landmarks`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ frame: b64 }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }, [apiBase]);

  // ── Render frame ────────────────────────────────────────────────────────────
  const renderFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (canvas.width  !== video.videoWidth)  canvas.width  = video.videoWidth  || 640;
    if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const b64 = captureFrame();
    if (!b64) return;

    const data = await fetchLandmarks(b64);

    if (!data?.face_detected || !data?.landmarks) {
      setFaceFound(false);
      return;
    }

    setFaceFound(true);
    const lm = smoothLandmarks(lastLMRef.current, data.landmarks);
    lastLMRef.current = lm;

    // Mirror transform — video feed is already flipped by CSS, canvas must match
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    renderMakeup(ctx, lm, activeStep, paletteRef.current);
    ctx.restore();
  }, [captureFrame, fetchLandmarks, activeStep]);

  // ── Loop ────────────────────────────────────────────────────────────────────
  const loop = useCallback(() => {
    if (!runningRef.current) return;
    timerRef.current = setTimeout(async () => {
      try { await renderFrame(); } catch (e) { console.warn("[GlamCamAR]", e.message); }
      loop();
    }, 1000 / fps);
  }, [renderFrame, fps]);

  // ── Start / Stop ────────────────────────────────────────────────────────────
  const startAR = useCallback(async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(r => { videoRef.current.onloadedmetadata = r; });
        await videoRef.current.play();
      }
      runningRef.current = true;
      setIsActive(true);
      setStatus("running");
      loop();
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message || "Camera access denied");
    }
  }, [loop]);

  const stopAR = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    const video = videoRef.current;
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setIsActive(false);
    setFaceFound(false);
    setStatus("idle");
    lastLMRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopAR(), [stopAR]);

  const currentStep = STEPS.find(s => s.key === activeStep) || STEPS[0];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0608 0%, #120b0f 50%, #0d0810 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400&display=swap');

        * { box-sizing: border-box; }

        .gc-mirror-frame {
          position: relative;
          border-radius: 50% / 45%;
          overflow: hidden;
          box-shadow:
            0 0 0 2px rgba(210,170,130,0.15),
            0 0 0 8px rgba(120,80,50,0.08),
            0 0 60px rgba(200,80,100,0.12),
            0 40px 120px rgba(0,0,0,0.8);
        }
        .gc-mirror-frame::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.06) 0%,
            transparent 40%,
            transparent 60%,
            rgba(255,255,255,0.02) 100%
          );
          pointer-events: none;
          z-index: 10;
        }

        .gc-step-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 16px;
          border-radius: 100px;
          border: 1px solid rgba(210,170,130,0.2);
          background: rgba(255,255,255,0.04);
          color: rgba(240,210,190,0.7);
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.22s ease;
          white-space: nowrap;
        }
        .gc-step-pill:hover {
          background: rgba(200,80,100,0.18);
          border-color: rgba(200,80,100,0.45);
          color: rgba(255,210,200,0.95);
        }
        .gc-step-pill.active {
          background: rgba(200,80,100,0.32);
          border-color: rgba(220,120,130,0.7);
          color: #fde8e0;
          box-shadow: 0 0 18px rgba(200,80,100,0.25);
        }

        .gc-shape-pill {
          padding: 5px 14px;
          border-radius: 100px;
          border: 1px solid rgba(210,170,130,0.15);
          background: transparent;
          color: rgba(200,160,130,0.6);
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .gc-shape-pill:hover {
          border-color: rgba(210,170,130,0.4);
          color: rgba(220,180,150,0.9);
        }
        .gc-shape-pill.active {
          background: rgba(210,170,130,0.12);
          border-color: rgba(210,170,130,0.5);
          color: rgba(240,200,170,1);
        }

        .gc-btn-main {
          padding: 14px 48px;
          border-radius: 100px;
          border: 1px solid rgba(200,80,100,0.5);
          background: linear-gradient(135deg, rgba(200,80,100,0.25), rgba(150,50,70,0.15));
          color: #fde0e5;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 15px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.28s ease;
        }
        .gc-btn-main:hover {
          background: linear-gradient(135deg, rgba(200,80,100,0.45), rgba(150,50,70,0.30));
          box-shadow: 0 0 30px rgba(200,80,100,0.35);
          border-color: rgba(220,120,130,0.7);
        }
        .gc-btn-stop {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.15);
          color: rgba(240,220,220,0.6);
        }
        .gc-btn-stop:hover {
          background: rgba(255,255,255,0.08);
          box-shadow: none;
        }

        @keyframes pulse-ring {
          0%   { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.35); }
        }
        .gc-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #f87070; display: inline-block;
          box-shadow: 0 0 8px #f87070;
          animation: none;
        }
        .gc-live-dot.active { animation: pulse-ring 1.4s ease-out infinite; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .gc-animate-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <p style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.35em",
          color: "rgba(200,130,110,0.55)",
          textTransform: "uppercase",
          margin: "0 0 10px",
        }}>
          The Glam Cam · AR Mirror
        </p>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 46px)",
          fontWeight: 300,
          fontStyle: "italic",
          color: "rgba(250,230,220,0.92)",
          margin: 0,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
        }}>
          Your face. Your guide.
        </h1>
      </div>

      {/* ── Mirror viewport ────────────────────────────────────────────────── */}
      <div className="gc-mirror-frame" style={{ width: "min(560px, 90vw)", aspectRatio: "3/4" }}>
        {/* Video */}
        <video
          ref={videoRef}
          muted
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
            display: "block",
            background: "#0d0810",
          }}
        />

        {/* AR canvas overlay */}
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

        {/* Idle overlay */}
        {!isActive && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(10,6,8,0.75)",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.5 }}>◉</div>
            <p style={{
              color: "rgba(240,210,200,0.5)",
              fontStyle: "italic",
              fontSize: 15,
              margin: 0,
            }}>
              Camera inactive
            </p>
          </div>
        )}

        {/* Face-not-found nudge */}
        {isActive && !faceFound && (
          <div className="gc-animate-in" style={{
            position: "absolute",
            bottom: 20, left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            borderRadius: 100,
            padding: "8px 20px",
            border: "1px solid rgba(255,200,180,0.15)",
          }}>
            <p style={{
              color: "rgba(255,220,200,0.75)",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              margin: 0,
            }}>
              Position your face in the frame
            </p>
          </div>
        )}

        {/* Live indicator */}
        {isActive && (
          <div style={{
            position: "absolute", top: 16, right: 20,
            display: "flex", alignItems: "center", gap: 7,
          }}>
            <span className={`gc-live-dot${faceFound ? " active" : ""}`} />
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: "0.2em",
              color: faceFound ? "rgba(255,160,140,0.85)" : "rgba(255,255,255,0.25)",
              textTransform: "uppercase",
            }}>
              {faceFound ? "Live" : "Scanning"}
            </span>
          </div>
        )}
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, width: "min(560px, 90vw)" }}>

        {/* Step pills */}
        {isActive && (
          <div className="gc-animate-in" style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: "0.25em",
              color: "rgba(200,150,130,0.5)",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}>
              Makeup Zone
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STEPS.map(step => (
                <button
                  key={String(step.key)}
                  className={`gc-step-pill${activeStep === step.key ? " active" : ""}`}
                  onClick={() => setActiveStep(step.key)}
                >
                  <span>{step.icon}</span>
                  <span>{step.label}</span>
                </button>
              ))}
            </div>

            {/* Step tip */}
            <div style={{
              marginTop: 12,
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(210,170,130,0.1)",
            }}>
              <p style={{
                color: "rgba(235,200,185,0.7)",
                fontStyle: "italic",
                fontSize: 13,
                margin: 0,
                lineHeight: 1.55,
              }}>
                💡 {currentStep.tip}
              </p>
            </div>
          </div>
        )}

        {/* Face shape selector */}
        {isActive && (
          <div className="gc-animate-in" style={{ marginBottom: 24 }}>
            <p style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: "0.25em",
              color: "rgba(200,150,130,0.5)",
              textTransform: "uppercase",
              margin: "0 0 10px",
            }}>
              Face Shape
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FACE_SHAPES.map(shape => (
                <button
                  key={shape}
                  className={`gc-shape-pill${faceShape === shape ? " active" : ""}`}
                  onClick={() => setFaceShape(shape)}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{
            marginBottom: 16, padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(200,50,50,0.12)",
            border: "1px solid rgba(200,80,80,0.3)",
          }}>
            <p style={{ color: "#f87070", fontFamily: "'DM Mono', monospace", fontSize: 12, margin: 0 }}>
              ⚠ {errorMsg}
            </p>
          </div>
        )}

        {/* Start / Stop */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {!isActive ? (
            <button
              className="gc-btn-main"
              onClick={startAR}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Opening camera…" : "Begin Session"}
            </button>
          ) : (
            <button className="gc-btn-main gc-btn-stop" onClick={stopAR}>
              End Session
            </button>
          )}
        </div>
      </div>

      {/* ── Footer note ────────────────────────────────────────────────────── */}
      <p style={{
        marginTop: 32,
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.12em",
        color: "rgba(180,140,130,0.3)",
        textAlign: "center",
      }}>
        All processing is local · No images leave your device
      </p>
    </div>
  );
}
