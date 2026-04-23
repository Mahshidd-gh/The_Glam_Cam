import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const FILL = "rgba(220,30,30,0.28)";
const FILL_STRONG = "rgba(220,30,30,0.38)";
const STROKE = "rgba(255,60,60,0.94)";
const SOFT_STROKE = "rgba(255,60,60,0.78)";
const HIGHLIGHT_FILL = "rgba(255,210,110,0.36)";
const HIGHLIGHT_STROKE = "rgba(255,225,130,0.92)";

const CAMERA_STYLE = {
  position: "relative",
  width: "100%",
  aspectRatio: "4 / 5",
  borderRadius: 28,
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), linear-gradient(180deg, #181818 0%, #050505 100%)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
};

const MIRROR_LAYER_STYLE = {
  position: "absolute",
  inset: 0,
  transform: "scaleX(-1)",
  transformOrigin: "center",
};

const VIDEO_STYLE = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const FALLBACK_STYLE = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background:
    "radial-gradient(circle at top, rgba(255,255,255,0.06), transparent 35%), linear-gradient(180deg, rgba(22,22,22,0.92), rgba(6,6,6,0.98))",
};

const SPECIFIC_KEYWORD_RULES = [
  { keywords: ["full face", "whole face", "entire face", "all over", "all over face", "everywhere"], zones: ["full_face"] },
  { keywords: ["forehead", "centre of forehead", "center of forehead"], zones: ["forehead"] },
  { keywords: ["hairline"], zones: ["hairline"] },
  { keywords: ["temple", "temples", "sides of forehead"], zones: ["temples"] },
  { keywords: ["eyebrow", "eyebrows", "brows", "arch"], zones: ["brows"] },
  { keywords: ["brow bone", "browbone", "under brow"], zones: ["brow_bone"] },
  { keywords: ["eyelid", "eyelids", "lid", "lids", "upper lid", "upper lids", "mobile lid"], zones: ["upper_lid"] },
  { keywords: ["crease", "cut crease", "socket", "socket line", "eye socket"], zones: ["crease"] },
  { keywords: ["inner corner", "tear duct", "inner eye"], zones: ["inner_corner"] },
  { keywords: ["outer corner", "outer v", "outer eye"], zones: ["outer_corner"] },
  { keywords: ["eyeliner", "liner", "wing", "winged liner", "cat eye", "upper lash line"], zones: ["eyeliner"] },
  { keywords: ["lash line", "lower lash line", "waterline", "water line", "tightline", "tight line"], zones: ["lash_line"] },
  { keywords: ["under eye", "undereye", "under eyes", "concealer", "dark circles"], zones: ["under_eye"] },
  { keywords: ["nose bridge", "bridge of nose", "bridge of the nose", "top of nose"], zones: ["nose_bridge"] },
  { keywords: ["nose contour", "side of nose", "sides of nose", "nose sides", "around the nose"], zones: ["nose_sides"] },
  { keywords: ["nose tip", "tip of nose", "tip of the nose"], zones: ["nose_tip"] },
  { keywords: ["blush", "flush", "cheek", "cheeks", "apple of cheek", "apples of cheeks"], zones: ["cheeks"] },
  { keywords: ["cheekbone", "cheek bone", "below the cheekbone", "under the cheekbone", "cheek contour"], zones: ["cheekbone"] },
  { keywords: ["cheek highlight", "highlight cheek", "high point of cheek", "top of cheekbone"], zones: ["cheek_highlight"] },
  { keywords: ["jawline", "jaw line", "jaw", "along the jaw"], zones: ["jawline"] },
  { keywords: ["chin", "under chin"], zones: ["chin"] },
  { keywords: ["cupids bow", "cupid's bow", "upper lip", "top lip"], zones: ["lip_top"] },
  { keywords: ["lower lip", "bottom lip"], zones: ["lip_bottom"] },
  { keywords: ["lips", "lip", "mouth", "ombre lip", "lip liner"], zones: ["lip_top", "lip_bottom"] },
  { keywords: ["corner of mouth", "corners of mouth", "mouth corner", "mouth corners", "lip corner"], zones: ["mouth_corners"] },
];

const HELPER_KEYWORD_RULES = [
  { keywords: ["highlight", "glow", "shimmer", "luminizer"], zones: ["nose_bridge", "brow_bone", "cheek_highlight", "inner_corner"] },
  { keywords: ["contour", "sculpt", "shadow"], zones: ["cheekbone", "jawline", "nose_sides", "temples"] },
  { keywords: ["setting powder", "powder", "bake"], zones: ["under_eye", "cheeks", "forehead"] },
];

const ZONE_ORDER = [
  "full_face",
  "forehead",
  "hairline",
  "temples",
  "brows",
  "brow_bone",
  "upper_lid",
  "crease",
  "inner_corner",
  "outer_corner",
  "eyeliner",
  "lash_line",
  "under_eye",
  "nose_bridge",
  "nose_sides",
  "nose_tip",
  "cheeks",
  "cheekbone",
  "cheek_highlight",
  "jawline",
  "chin",
  "lip_top",
  "lip_bottom",
  "mouth_corners",
];

export const ZONE_META = {
  full_face: "Full Face",
  forehead: "Forehead",
  hairline: "Hairline",
  temples: "Temples",
  brows: "Brows",
  brow_bone: "Brow Bone",
  upper_lid: "Upper Lid",
  crease: "Crease",
  inner_corner: "Inner Corner",
  outer_corner: "Outer Corner",
  eyeliner: "Eyeliner",
  lash_line: "Lash Line",
  under_eye: "Under Eye",
  nose_bridge: "Nose Bridge",
  nose_sides: "Nose Sides",
  nose_tip: "Nose Tip",
  cheeks: "Cheeks / Blush",
  cheekbone: "Cheekbone",
  cheek_highlight: "Cheek Highlight",
  jawline: "Jawline",
  chin: "Chin",
  lip_top: "Upper Lip",
  lip_bottom: "Lower Lip",
  mouth_corners: "Mouth Corners",
};

function normalizeText(text = "") {
  return text
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesKeyword(text, keyword) {
  const haystack = ` ${normalizeText(text)} `;
  const needle = ` ${normalizeText(keyword)} `;
  return haystack.includes(needle);
}

export function parseZones(text) {
  const normalized = normalizeText(text);
  const zones = new Set();

  SPECIFIC_KEYWORD_RULES.forEach((rule) => {
    if (rule.keywords.some((keyword) => matchesKeyword(normalized, keyword))) {
      rule.zones.forEach((zone) => zones.add(zone));
    }
  });

  if (zones.size === 0) {
    HELPER_KEYWORD_RULES.forEach((rule) => {
      if (rule.keywords.some((keyword) => matchesKeyword(normalized, keyword))) {
        rule.zones.forEach((zone) => zones.add(zone));
      }
    });
  }

  return ZONE_ORDER.filter((zone) => zones.has(zone));
}

function getStepText(step) {
  if (typeof step === "string") return step;
  if (!step || typeof step !== "object") return "";
  return (
    step.instruction ||
    step.text ||
    step.step_text ||
    step.description ||
    step.feature ||
    ""
  );
}

function titleize(value = "") {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTutorialResponse(data, fallbackLabel = "Tutorial") {
  if (Array.isArray(data)) {
    const steps = data.map(getStepText).filter(Boolean);
    if (!steps.length) return null;
    return {
      label: fallbackLabel,
      face_shape: fallbackLabel,
      total_steps: steps.length,
      steps,
    };
  }

  if (data && Array.isArray(data.steps)) {
    const steps = data.steps.map(getStepText).filter(Boolean);
    if (!steps.length) return null;
    return {
      ...data,
      label: data.label || titleize(data.look || fallbackLabel),
      face_shape: data.face_shape || fallbackLabel,
      total_steps: data.total_steps || steps.length,
      steps,
    };
  }

  return null;
}

function getPt(landmarks, index, width, height) {
  return {
    x: landmarks[index].x * width,
    y: landmarks[index].y * height,
  };
}

function pointsFromIndices(landmarks, indices, width, height) {
  return indices.map((index) => getPt(landmarks, index, width, height));
}

function averagePoints(points) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function pointBetween(a, b, weight = 0.5) {
  return {
    x: a.x + (b.x - a.x) * weight,
    y: a.y + (b.y - a.y) * weight,
  };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleBetween(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function offsetPoint(point, distance, angle) {
  return {
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
}

function getFaceWidth(landmarks, width, height) {
  return dist(getPt(landmarks, 234, width, height), getPt(landmarks, 454, width, height));
}

function getFaceHeight(landmarks, width, height) {
  return dist(getPt(landmarks, 10, width, height), getPt(landmarks, 152, width, height));
}

function drawPolyline(ctx, points, options = {}) {
  if (!points.length) return;

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });

  if (options.close) ctx.closePath();

  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill();
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth || 1;
    ctx.lineCap = options.lineCap || "round";
    ctx.lineJoin = options.lineJoin || "round";
    ctx.stroke();
  }
}

function drawEllipse(ctx, center, rx, ry, options = {}) {
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx, ry, options.rotation || 0, 0, Math.PI * 2);

  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.fill();
  }

  if (options.stroke) {
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.lineWidth || 1;
    ctx.stroke();
  }
}

function drawSoftLine(ctx, points, width, stroke = STROKE, glow = FILL) {
  drawPolyline(ctx, points, { stroke: glow, lineWidth: width * 2.8 });
  drawPolyline(ctx, points, { stroke, lineWidth: width });
}

function smoothLandmarks(previous, next, alpha = 0.38) {
  if (!previous || previous.length !== next.length) {
    return next.map((point) => ({ ...point }));
  }

  return next.map((point, index) => ({
    x: previous[index].x + (point.x - previous[index].x) * alpha,
    y: previous[index].y + (point.y - previous[index].y) * alpha,
    z: previous[index].z + ((point.z || 0) - (previous[index].z || 0)) * alpha,
  }));
}

function flashOpacity(startTime) {
  const elapsed = (Date.now() - startTime) / 1200;
  if (elapsed >= 1) return 1;

  const keyframes = [
    [0, 0],
    [0.12, 1],
    [0.25, 0],
    [0.38, 1],
    [0.5, 0],
    [0.62, 1],
    [1, 1],
  ];

  for (let index = 1; index < keyframes.length; index += 1) {
    if (elapsed <= keyframes[index][0]) {
      const progress =
        (elapsed - keyframes[index - 1][0]) /
        (keyframes[index][0] - keyframes[index - 1][0]);
      return keyframes[index - 1][1] + progress * (keyframes[index][1] - keyframes[index - 1][1]);
    }
  }

  return 1;
}

function drawFullFace(ctx, landmarks, width, height) {
  const faceOval = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
    152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
  ];

  drawPolyline(ctx, pointsFromIndices(landmarks, faceOval, width, height), {
    close: true,
    fill: "rgba(220,30,30,0.17)",
    stroke: "rgba(255,60,60,0.62)",
    lineWidth: 2,
  });
}

function drawForehead(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const browLeft = getPt(landmarks, 70, width, height);
  const browRight = getPt(landmarks, 300, width, height);
  const topCenter = getPt(landmarks, 10, width, height);
  const center = {
    x: (browLeft.x + browRight.x) / 2,
    y: topCenter.y + faceHeight * 0.13,
  };

  drawEllipse(ctx, center, faceWidth * 0.2, faceHeight * 0.09, {
    rotation: angleBetween(browLeft, browRight),
    fill: "rgba(220,30,30,0.22)",
    stroke: "rgba(255,60,60,0.72)",
    lineWidth: 2,
  });
}

function drawHairline(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const hairline = [54, 103, 67, 109, 10, 338, 297, 332, 284];
  drawSoftLine(ctx, pointsFromIndices(landmarks, hairline, width, height), scale * 0.012);
}

function drawTemples(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const leftCenter = pointBetween(getPt(landmarks, 234, width, height), getPt(landmarks, 70, width, height), 0.6);
  const rightCenter = pointBetween(getPt(landmarks, 454, width, height), getPt(landmarks, 300, width, height), 0.6);
  const rotation = angleBetween(getPt(landmarks, 70, width, height), getPt(landmarks, 300, width, height));

  [leftCenter, rightCenter].forEach((center) => {
    drawEllipse(
      ctx,
      { x: center.x, y: center.y - faceHeight * 0.03 },
      faceWidth * 0.05,
      faceHeight * 0.08,
      {
        rotation,
        fill: "rgba(220,30,30,0.24)",
        stroke: SOFT_STROKE,
        lineWidth: 2,
      }
    );
  });
}

function drawBrows(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const left = [70, 63, 105, 66, 107];
  const right = [336, 296, 334, 293, 300];
  drawSoftLine(ctx, pointsFromIndices(landmarks, left, width, height), scale * 0.012);
  drawSoftLine(ctx, pointsFromIndices(landmarks, right, width, height), scale * 0.012);
}

function drawBrowBone(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const leftEye = averagePoints(pointsFromIndices(landmarks, [33, 133], width, height));
  const rightEye = averagePoints(pointsFromIndices(landmarks, [362, 263], width, height));
  const leftRotation = angleBetween(getPt(landmarks, 33, width, height), getPt(landmarks, 133, width, height));
  const rightRotation = angleBetween(getPt(landmarks, 362, width, height), getPt(landmarks, 263, width, height));

  drawEllipse(ctx, { x: leftEye.x, y: leftEye.y - faceHeight * 0.09 }, faceWidth * 0.09, faceHeight * 0.022, {
    rotation: leftRotation,
    fill: HIGHLIGHT_FILL,
    stroke: HIGHLIGHT_STROKE,
    lineWidth: 2,
  });
  drawEllipse(ctx, { x: rightEye.x, y: rightEye.y - faceHeight * 0.09 }, faceWidth * 0.09, faceHeight * 0.022, {
    rotation: rightRotation,
    fill: HIGHLIGHT_FILL,
    stroke: HIGHLIGHT_STROKE,
    lineWidth: 2,
  });
}

function drawUpperLid(ctx, landmarks, width, height) {
  const left = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
  const right = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];

  [left, right].forEach((indices) => {
    drawPolyline(ctx, pointsFromIndices(landmarks, indices, width, height), {
      close: true,
      fill: "rgba(220,30,30,0.33)",
      stroke: SOFT_STROKE,
      lineWidth: 1.7,
    });
  });
}

function drawCrease(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const left = pointsFromIndices(landmarks, [33, 246, 161, 160, 159, 158, 157, 173, 133], width, height).map((point) => ({
    x: point.x,
    y: point.y - faceHeight * 0.035,
  }));
  const right = pointsFromIndices(landmarks, [362, 398, 384, 385, 386, 387, 388, 466, 263], width, height).map((point) => ({
    x: point.x,
    y: point.y - faceHeight * 0.035,
  }));
  drawSoftLine(ctx, left, scale * 0.01);
  drawSoftLine(ctx, right, scale * 0.01);
}

function drawInnerCorner(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  [133, 362].forEach((index) => {
    drawEllipse(ctx, getPt(landmarks, index, width, height), faceWidth * 0.022, faceWidth * 0.018, {
      fill: HIGHLIGHT_FILL,
      stroke: HIGHLIGHT_STROKE,
      lineWidth: 1.5,
    });
  });
}

function drawOuterCorner(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const left = getPt(landmarks, 33, width, height);
  const right = getPt(landmarks, 263, width, height);

  drawSoftLine(
    ctx,
    [
      { x: left.x - scale * 0.03, y: left.y - scale * 0.015 },
      left,
      { x: left.x - scale * 0.03, y: left.y + scale * 0.015 },
    ],
    scale * 0.009
  );
  drawSoftLine(
    ctx,
    [
      { x: right.x + scale * 0.03, y: right.y - scale * 0.015 },
      right,
      { x: right.x + scale * 0.03, y: right.y + scale * 0.015 },
    ],
    scale * 0.009
  );
}

function drawEyeliner(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const leftLine = pointsFromIndices(landmarks, [33, 246, 161, 160, 159, 158, 157, 173, 133], width, height);
  const rightLine = pointsFromIndices(landmarks, [362, 398, 384, 385, 386, 387, 388, 466, 263], width, height);
  drawPolyline(ctx, leftLine, { stroke: STROKE, lineWidth: scale * 0.01 });
  drawPolyline(ctx, rightLine, { stroke: STROKE, lineWidth: scale * 0.01 });

  const leftOuter = leftLine[0];
  const rightOuter = rightLine[rightLine.length - 1];
  const leftWingAngle = angleBetween(leftLine[1], leftOuter) - 0.35;
  const rightWingAngle = angleBetween(rightLine[rightLine.length - 2], rightOuter) + 0.35;

  drawPolyline(
    ctx,
    [leftOuter, offsetPoint(leftOuter, scale * 0.05, leftWingAngle)],
    { stroke: STROKE, lineWidth: scale * 0.01 }
  );
  drawPolyline(
    ctx,
    [rightOuter, offsetPoint(rightOuter, scale * 0.05, rightWingAngle)],
    { stroke: STROKE, lineWidth: scale * 0.01 }
  );
}

function drawLashLine(ctx, landmarks, width, height) {
  const scale = getFaceWidth(landmarks, width, height);
  const left = [33, 7, 163, 144, 145, 153, 154, 155, 133];
  const right = [362, 382, 381, 380, 374, 373, 390, 249, 263];
  drawSoftLine(ctx, pointsFromIndices(landmarks, left, width, height), scale * 0.01);
  drawSoftLine(ctx, pointsFromIndices(landmarks, right, width, height), scale * 0.01);
}

function drawUnderEye(ctx, landmarks, width, height) {
  const left = [130, 25, 110, 24, 23, 22, 26, 112, 243];
  const right = [359, 255, 339, 254, 253, 252, 256, 341, 463];

  [left, right].forEach((indices) => {
    drawPolyline(ctx, pointsFromIndices(landmarks, indices, width, height), {
      close: true,
      fill: "rgba(220,30,30,0.22)",
      stroke: SOFT_STROKE,
      lineWidth: 1.5,
    });
  });
}

function drawNoseBridge(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const top = getPt(landmarks, 168, width, height);
  const bottom = getPt(landmarks, 6, width, height);
  drawEllipse(ctx, pointBetween(top, bottom, 0.5), faceWidth * 0.025, dist(top, bottom) * 0.48, {
    rotation: angleBetween(top, bottom),
    fill: HIGHLIGHT_FILL,
    stroke: HIGHLIGHT_STROKE,
    lineWidth: 2,
  });
}

function drawNoseSides(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);

  [129, 358].forEach((index) => {
    drawEllipse(ctx, getPt(landmarks, index, width, height), faceWidth * 0.03, faceHeight * 0.04, {
      fill: "rgba(220,30,30,0.27)",
      stroke: SOFT_STROKE,
      lineWidth: 2,
    });
  });
}

function drawNoseTip(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  drawEllipse(ctx, getPt(landmarks, 1, width, height), faceWidth * 0.04, faceWidth * 0.03, {
    fill: "rgba(220,30,30,0.30)",
    stroke: SOFT_STROKE,
    lineWidth: 2,
  });
}

function drawCheeks(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const leftUpper = averagePoints(pointsFromIndices(landmarks, [205, 50, 117], width, height));
  const rightUpper = averagePoints(pointsFromIndices(landmarks, [425, 280, 346], width, height));
  const leftLower = averagePoints(pointsFromIndices(landmarks, [187, 147, 213], width, height));
  const rightLower = averagePoints(pointsFromIndices(landmarks, [411, 376, 433], width, height));
  const leftCenter = pointBetween(leftUpper, leftLower, 0.58);
  const rightCenter = pointBetween(rightUpper, rightLower, 0.58);
  const leftRotation = angleBetween(getPt(landmarks, 205, width, height), getPt(landmarks, 117, width, height));
  const rightRotation = angleBetween(getPt(landmarks, 425, width, height), getPt(landmarks, 346, width, height));

  drawEllipse(ctx, leftCenter, faceWidth * 0.09, faceHeight * 0.075, {
    rotation: leftRotation,
    fill: "rgba(220,30,30,0.28)",
    stroke: SOFT_STROKE,
    lineWidth: 2,
  });
  drawEllipse(ctx, rightCenter, faceWidth * 0.09, faceHeight * 0.075, {
    rotation: rightRotation,
    fill: "rgba(220,30,30,0.28)",
    stroke: SOFT_STROKE,
    lineWidth: 2,
  });
}

function drawCheekbone(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const left = [234, 116, 117, 118, 100];
  const right = [454, 345, 346, 347, 329];

  [left, right].forEach((indices) => {
    const lifted = pointsFromIndices(landmarks, indices, width, height).map((point) => ({
      x: point.x,
      y: point.y - faceHeight * 0.015,
    }));
    drawSoftLine(ctx, lifted, faceWidth * 0.011);
  });
}

function drawCheekHighlight(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const left = pointBetween(getPt(landmarks, 116, width, height), getPt(landmarks, 205, width, height), 0.45);
  const right = pointBetween(getPt(landmarks, 345, width, height), getPt(landmarks, 425, width, height), 0.45);
  const leftRotation = angleBetween(getPt(landmarks, 234, width, height), getPt(landmarks, 116, width, height));
  const rightRotation = angleBetween(getPt(landmarks, 454, width, height), getPt(landmarks, 345, width, height));

  drawEllipse(ctx, { x: left.x, y: left.y - faceHeight * 0.03 }, faceWidth * 0.055, faceHeight * 0.028, {
    rotation: leftRotation,
    fill: HIGHLIGHT_FILL,
    stroke: HIGHLIGHT_STROKE,
    lineWidth: 1.7,
  });
  drawEllipse(ctx, { x: right.x, y: right.y - faceHeight * 0.03 }, faceWidth * 0.055, faceHeight * 0.028, {
    rotation: rightRotation,
    fill: HIGHLIGHT_FILL,
    stroke: HIGHLIGHT_STROKE,
    lineWidth: 1.7,
  });
}

function drawJawline(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const left = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152];
  const right = [454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152];
  drawSoftLine(ctx, pointsFromIndices(landmarks, left, width, height), faceWidth * 0.013);
  drawSoftLine(ctx, pointsFromIndices(landmarks, right, width, height), faceWidth * 0.013);
}

function drawChin(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  const faceHeight = getFaceHeight(landmarks, width, height);
  const center = averagePoints(pointsFromIndices(landmarks, [152, 175, 199], width, height));
  drawEllipse(ctx, center, faceWidth * 0.075, faceHeight * 0.036, {
    fill: "rgba(220,30,30,0.29)",
    stroke: SOFT_STROKE,
    lineWidth: 2,
  });
}

function drawLipTop(ctx, landmarks, width, height) {
  const topLip = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];
  drawPolyline(ctx, pointsFromIndices(landmarks, topLip, width, height), {
    close: true,
    fill: "rgba(220,30,30,0.43)",
    stroke: STROKE,
    lineWidth: 1.8,
  });
}

function drawLipBottom(ctx, landmarks, width, height) {
  const bottomLip = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];
  drawPolyline(ctx, pointsFromIndices(landmarks, bottomLip, width, height), {
    close: true,
    fill: "rgba(220,30,30,0.43)",
    stroke: STROKE,
    lineWidth: 1.8,
  });
}

function drawMouthCorners(ctx, landmarks, width, height) {
  const faceWidth = getFaceWidth(landmarks, width, height);
  [61, 291].forEach((index) => {
    drawEllipse(ctx, getPt(landmarks, index, width, height), faceWidth * 0.018, faceWidth * 0.013, {
      fill: FILL_STRONG,
      stroke: SOFT_STROKE,
      lineWidth: 1.5,
    });
  });
}

const DRAW_ZONE = {
  full_face: drawFullFace,
  forehead: drawForehead,
  hairline: drawHairline,
  temples: drawTemples,
  brows: drawBrows,
  brow_bone: drawBrowBone,
  upper_lid: drawUpperLid,
  crease: drawCrease,
  inner_corner: drawInnerCorner,
  outer_corner: drawOuterCorner,
  eyeliner: drawEyeliner,
  lash_line: drawLashLine,
  under_eye: drawUnderEye,
  nose_bridge: drawNoseBridge,
  nose_sides: drawNoseSides,
  nose_tip: drawNoseTip,
  cheeks: drawCheeks,
  cheekbone: drawCheekbone,
  cheek_highlight: drawCheekHighlight,
  jawline: drawJawline,
  chin: drawChin,
  lip_top: drawLipTop,
  lip_bottom: drawLipBottom,
  mouth_corners: drawMouthCorners,
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function ZoneOverlay({ zones, animKey, videoRef }) {
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);
  const latestLandmarksRef = useRef(null);
  const smoothedLandmarksRef = useRef(null);
  const animStartRef = useRef(Date.now());
  const processingRef = useRef(false);

  useEffect(() => {
    animStartRef.current = Date.now();
  }, [animKey]);

  useEffect(() => {
    let destroyed = false;

    async function bootFaceMesh() {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");

      if (destroyed || !window.FaceMesh) return;

      const faceMesh = new window.FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });

      faceMesh.onResults((results) => {
        const next = results.multiFaceLandmarks?.[0] || null;
        latestLandmarksRef.current = next;
        smoothedLandmarksRef.current = next
          ? smoothLandmarks(smoothedLandmarksRef.current, next)
          : null;
      });

      faceMeshRef.current = faceMesh;
    }

    bootFaceMesh().catch((error) => {
      console.error("FaceMesh load error:", error);
    });

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      faceMeshRef.current?.close();
      faceMeshRef.current = null;
      latestLandmarksRef.current = null;
      smoothedLandmarksRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    async function renderLoop() {
      const ctx = canvas.getContext("2d");
      const video = videoRef?.current;
      const faceMesh = faceMeshRef.current;
      const frame = canvas.parentElement;

      if (!video || !frame || !video.videoWidth || !video.videoHeight) {
        rafRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const sourceWidth = video.videoWidth;
      const sourceHeight = video.videoHeight;
      const frameWidth = frame.clientWidth;
      const frameHeight = frame.clientHeight;
      const coverScale = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);
      const renderedWidth = sourceWidth * coverScale;
      const renderedHeight = sourceHeight * coverScale;
      const offsetX = (frameWidth - renderedWidth) / 2;
      const offsetY = (frameHeight - renderedHeight) / 2;

      if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
        canvas.width = sourceWidth;
        canvas.height = sourceHeight;
      }

      canvas.style.width = `${renderedWidth}px`;
      canvas.style.height = `${renderedHeight}px`;
      canvas.style.left = `${offsetX}px`;
      canvas.style.top = `${offsetY}px`;

      ctx.clearRect(0, 0, sourceWidth, sourceHeight);

      if (faceMesh && video.readyState >= 2 && !processingRef.current) {
        processingRef.current = true;
        try {
          await faceMesh.send({ image: video });
        } finally {
          processingRef.current = false;
        }
      }

      const landmarks = smoothedLandmarksRef.current || latestLandmarksRef.current;
      if (landmarks && zones.length > 0) {
        ctx.save();
        ctx.globalAlpha = flashOpacity(animStartRef.current);
        ctx.shadowBlur = 14;
        ctx.shadowColor = "rgba(255,70,70,0.28)";

        zones.forEach((zone) => {
          const draw = DRAW_ZONE[zone];
          if (draw) draw(ctx, landmarks, sourceWidth, sourceHeight);
        });

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    }

    rafRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [zones, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
      }}
    />
  );
}

const FACE_PATH =
  "M90,75 C140,45 220,45 270,75 C330,110 340,185 336,240 C328,315 295,370 235,390 C210,400 150,400 125,390 C65,370 32,315 24,240 C20,185 30,110 90,75Z";

const ZONE_SHAPES = {
  full_face: [{ type: "path", d: FACE_PATH, fill: "rgba(220,30,30,0.18)", stroke: "rgba(255,60,60,0.65)", sw: 2 }],
  forehead: [{ type: "ellipse", cx: 180, cy: 108, rx: 80, ry: 38, fill: "rgba(220,30,30,0.22)", stroke: "rgba(255,60,60,0.70)", sw: 2 }],
  hairline: [
    { type: "path", d: "M90,75 Q140,45 180,40 Q220,45 270,75", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M90,75 Q140,45 180,40 Q220,45 270,75", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 18 },
  ],
  temples: [
    { type: "ellipse", cx: 42, cy: 140, rx: 28, ry: 48, fill: "rgba(220,30,30,0.25)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
    { type: "ellipse", cx: 318, cy: 140, rx: 28, ry: 48, fill: "rgba(220,30,30,0.25)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
  ],
  brows: [
    { type: "path", d: "M88,152 Q115,138 154,144", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 7 },
    { type: "path", d: "M206,144 Q245,138 272,152", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 7 },
    { type: "path", d: "M88,152 Q115,138 154,144", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 20 },
    { type: "path", d: "M206,144 Q245,138 272,152", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 20 },
  ],
  brow_bone: [
    { type: "ellipse", cx: 121, cy: 163, rx: 40, ry: 10, fill: "rgba(255,210,110,0.36)", stroke: "rgba(255,225,130,0.92)", sw: 2 },
    { type: "ellipse", cx: 239, cy: 163, rx: 40, ry: 10, fill: "rgba(255,210,110,0.36)", stroke: "rgba(255,225,130,0.92)", sw: 2 },
  ],
  upper_lid: [
    { type: "ellipse", cx: 121, cy: 182, rx: 38, ry: 14, fill: "rgba(220,30,30,0.40)", stroke: "rgba(255,60,60,0.88)", sw: 2.5 },
    { type: "ellipse", cx: 239, cy: 182, rx: 38, ry: 14, fill: "rgba(220,30,30,0.40)", stroke: "rgba(255,60,60,0.88)", sw: 2.5 },
  ],
  crease: [
    { type: "path", d: "M84,172 Q121,157 158,172", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M84,172 Q121,157 158,172", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 16 },
    { type: "path", d: "M202,172 Q239,157 276,172", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M202,172 Q239,157 276,172", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 16 },
  ],
  inner_corner: [
    { type: "ellipse", cx: 88, cy: 182, rx: 12, ry: 10, fill: "rgba(255,210,110,0.36)", stroke: "rgba(255,225,130,0.92)", sw: 2 },
    { type: "ellipse", cx: 272, cy: 182, rx: 12, ry: 10, fill: "rgba(255,210,110,0.36)", stroke: "rgba(255,225,130,0.92)", sw: 2 },
  ],
  outer_corner: [
    { type: "path", d: "M154,176 L166,184 L154,192", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M206,192 L218,184 L206,176", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4.5 },
    { type: "path", d: "M154,176 L166,184 L154,192", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 13 },
    { type: "path", d: "M206,192 L218,184 L206,176", fill: "none", stroke: "rgba(220,30,30,0.25)", sw: 13 },
  ],
  eyeliner: [
    { type: "path", d: "M84,178 Q121,166 158,178", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M158,178 L148,168", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M276,178 Q239,166 202,178", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
    { type: "path", d: "M202,178 L212,168", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 3.5 },
  ],
  lash_line: [
    { type: "path", d: "M84,189 Q121,200 158,189", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4 },
    { type: "path", d: "M202,189 Q239,200 276,189", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 4 },
    { type: "path", d: "M84,189 Q121,200 158,189", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 12 },
    { type: "path", d: "M202,189 Q239,200 276,189", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 12 },
  ],
  under_eye: [
    { type: "ellipse", cx: 121, cy: 198, rx: 38, ry: 10, fill: "rgba(220,30,30,0.22)", stroke: "rgba(255,60,60,0.65)", sw: 1.8 },
    { type: "ellipse", cx: 239, cy: 198, rx: 38, ry: 10, fill: "rgba(220,30,30,0.22)", stroke: "rgba(255,60,60,0.65)", sw: 1.8 },
  ],
  nose_bridge: [{ type: "ellipse", cx: 180, cy: 224, rx: 11, ry: 45, fill: "rgba(255,210,110,0.32)", stroke: "rgba(255,225,130,0.92)", sw: 2 }],
  nose_sides: [
    { type: "ellipse", cx: 161, cy: 252, rx: 14, ry: 18, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
    { type: "ellipse", cx: 199, cy: 252, rx: 14, ry: 18, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.72)", sw: 2 },
  ],
  nose_tip: [{ type: "ellipse", cx: 180, cy: 265, rx: 18, ry: 13, fill: "rgba(220,30,30,0.32)", stroke: "rgba(255,60,60,0.78)", sw: 2 }],
  cheeks: [
    { type: "ellipse", cx: 98, cy: 268, rx: 58, ry: 44, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.78)", sw: 2.5 },
    { type: "ellipse", cx: 262, cy: 268, rx: 58, ry: 44, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.78)", sw: 2.5 },
  ],
  cheekbone: [
    { type: "ellipse", cx: 88, cy: 228, rx: 58, ry: 13, fill: "rgba(220,30,30,0.32)", stroke: "rgba(255,60,60,0.88)", sw: 2.5 },
    { type: "ellipse", cx: 272, cy: 228, rx: 58, ry: 13, fill: "rgba(220,30,30,0.32)", stroke: "rgba(255,60,60,0.88)", sw: 2.5 },
  ],
  cheek_highlight: [
    { type: "ellipse", cx: 102, cy: 215, rx: 30, ry: 12, fill: "rgba(255,200,100,0.38)", stroke: "rgba(255,220,120,0.90)", sw: 2 },
    { type: "ellipse", cx: 258, cy: 215, rx: 30, ry: 12, fill: "rgba(255,200,100,0.38)", stroke: "rgba(255,220,120,0.90)", sw: 2 },
  ],
  jawline: [
    { type: "path", d: "M24,240 Q28,300 56,340 Q90,378 130,393", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M336,240 Q332,300 304,340 Q270,378 230,393", fill: "none", stroke: "rgba(255,60,60,0.95)", sw: 5 },
    { type: "path", d: "M24,240 Q28,300 56,340 Q90,378 130,393", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 20 },
    { type: "path", d: "M336,240 Q332,300 304,340 Q270,378 230,393", fill: "none", stroke: "rgba(220,30,30,0.22)", sw: 20 },
  ],
  chin: [{ type: "ellipse", cx: 180, cy: 396, rx: 48, ry: 18, fill: "rgba(220,30,30,0.28)", stroke: "rgba(255,60,60,0.80)", sw: 2.5 }],
  lip_top: [{ type: "path", d: "M147,328 Q164,316 180,320 Q196,316 213,328 Q200,334 180,332 Q160,334 147,328Z", fill: "rgba(220,30,30,0.48)", stroke: "rgba(255,60,60,0.90)", sw: 2 }],
  lip_bottom: [{ type: "path", d: "M147,332 Q160,334 180,336 Q200,334 213,332 Q206,356 180,360 Q154,356 147,332Z", fill: "rgba(220,30,30,0.48)", stroke: "rgba(255,60,60,0.90)", sw: 2 }],
  mouth_corners: [
    { type: "ellipse", cx: 147, cy: 330, rx: 14, ry: 11, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.80)", sw: 2 },
    { type: "ellipse", cx: 213, cy: 330, rx: 14, ry: 11, fill: "rgba(220,30,30,0.35)", stroke: "rgba(255,60,60,0.80)", sw: 2 },
  ],
};

function ZoneLayer({ shapes }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || shapes.length === 0) return;

    element.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 0, offset: 0.25 },
        { opacity: 1, offset: 0.38 },
        { opacity: 0, offset: 0.5 },
        { opacity: 1, offset: 0.62 },
        { opacity: 1, offset: 1 },
      ],
      { duration: 1200, fill: "forwards", easing: "ease" }
    );
  }, [shapes]);

  return (
    <g ref={ref}>
      {shapes.map((shape, index) =>
        shape.type === "ellipse" ? (
          <ellipse
            key={index}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            fill={shape.fill || "none"}
            stroke={shape.stroke || "none"}
            strokeWidth={shape.sw || 1}
          />
        ) : (
          <path
            key={index}
            d={shape.d}
            fill={shape.fill || "none"}
            stroke={shape.stroke || "none"}
            strokeWidth={shape.sw || 1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )
      )}
    </g>
  );
}

export function FaceSVG({ zones, animKey }) {
  const shapes = zones.flatMap((zone) => ZONE_SHAPES[zone] || []);

  return (
    <svg viewBox="0 0 360 420" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <filter id="rglow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={FACE_PATH} fill="#f2c89a" stroke="#d4a066" strokeWidth="1.5" />
      <ellipse cx="22" cy="220" rx="13" ry="24" fill="#eab882" stroke="#d4a066" strokeWidth="1" />
      <ellipse cx="338" cy="220" rx="13" ry="24" fill="#eab882" stroke="#d4a066" strokeWidth="1" />
      <ellipse cx="121" cy="182" rx="36" ry="14" fill="white" opacity="0.78" />
      <ellipse cx="239" cy="182" rx="36" ry="14" fill="white" opacity="0.78" />
      <circle cx="121" cy="182" r="10" fill="#3a2518" opacity="0.88" />
      <circle cx="239" cy="182" r="10" fill="#3a2518" opacity="0.88" />
      <circle cx="124" cy="179" r="2.8" fill="white" opacity="0.65" />
      <circle cx="242" cy="179" r="2.8" fill="white" opacity="0.65" />
      <path d="M83,182 Q121,168 159,182" fill="none" stroke="#2a1810" strokeWidth="1.8" opacity="0.5" />
      <path d="M201,182 Q239,168 277,182" fill="none" stroke="#2a1810" strokeWidth="1.8" opacity="0.5" />
      <path d="M88,152 Q115,140 155,145" fill="none" stroke="#3a2518" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M205,145 Q245,140 272,152" fill="none" stroke="#3a2518" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path
        d="M172,185 Q164,230 158,258 Q168,270 180,272 Q192,270 202,258 Q196,230 188,185"
        fill="none"
        stroke="#c4906a"
        strokeWidth="1.4"
        opacity="0.4"
      />
      <path d="M147,328 Q164,316 180,320 Q196,316 213,328 Q206,356 180,360 Q154,356 147,328Z" fill="#cc8090" opacity="0.55" />

      {shapes.length > 0 && (
        <g key={animKey} filter="url(#rglow)">
          <ZoneLayer shapes={shapes} />
        </g>
      )}
    </svg>
  );
}

function CameraStage({ zones, animKey, videoRef, cameraError }) {
  return (
    <div style={CAMERA_STYLE}>
      {cameraError ? (
        <div style={FALLBACK_STYLE}>
          <FaceSVG zones={zones} animKey={animKey} />
        </div>
      ) : (
        <div style={MIRROR_LAYER_STYLE}>
          <video ref={videoRef} autoPlay muted playsInline style={VIDEO_STYLE} />
          <ZoneOverlay zones={zones} animKey={animKey} videoRef={videoRef} />
        </div>
      )}
    </div>
  );
}

function GlamCamAR() {
  const [stepIdx, setStepIdx] = useState(0);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [tutorial, setTutorial] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const location = useLocation();
  const videoRef = useRef(null);
  const preferences = location.state;

  const goStep = (index) => {
    setStepIdx(index);
    setAnimKey((value) => value + 1);
  };

  const goCustom = () => {
    setCustomMode((value) => !value);
    setAnimKey((value) => value + 1);
  };

  const instruction = customMode ? customText : tutorial?.steps?.[stepIdx] || "";
  const zones = parseZones(instruction);

  useEffect(() => {
    let active = true;
    let stream;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });

        if (!active || !videoRef.current) return;

        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraError("");
      } catch (error) {
        console.error("Camera access error:", error);
        if (active) setCameraError("Camera access unavailable");
      }
    }

    startCamera();

    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTutorial() {
      if (!preferences) return;

      try {
        let response;
        const look = preferences.predictedLook || preferences.look;

        if (look) {
          response = await fetch(`http://localhost:8000/tutorial/${encodeURIComponent(look)}`);
        } else {
          const params = new URLSearchParams();
          if (preferences.faceShape) params.append("face_shape", preferences.faceShape);
          if (preferences.makeup_style) params.append("makeup_style", preferences.makeup_style);
          if (preferences.hair_style) params.append("hair_style", preferences.hair_style);
          if (preferences.occasion) params.append("occasion", preferences.occasion);
          if (preferences.skill_level) params.append("skill_level", preferences.skill_level);
          response = await fetch(`http://localhost:8000/get_tutorial?${params.toString()}`);
        }

        const data = await response.json();
        const normalized = normalizeTutorialResponse(
          data,
          titleize(preferences.predictedLook || preferences.look || preferences.faceShape || "Tutorial")
        );

        if (!cancelled && normalized) {
          setTutorial(normalized);
          setStepIdx(0);
        }
      } catch (error) {
        console.error("Tutorial fetch error:", error);
      }
    }

    loadTutorial();

    return () => {
      cancelled = true;
    };
  }, [preferences]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">
          Glam<span>Cam</span>
        </div>
        <div className="badge">Anchored AR Preview</div>
      </div>

      <div className="body">
        <div className="sidebar">
          <div className="sidebar-title">Tutorials</div>

          {tutorial && (
            <button className={`tut-btn ${!customMode ? "active" : ""}`} type="button">
              <div className="tut-name">{tutorial.face_shape}</div>
              <div className="tut-count">{tutorial.total_steps} steps</div>
            </button>
          )}

          <div className="divider" />

          <button className={`custom-toggle ${customMode ? "active" : ""}`} onClick={goCustom} type="button">
            Try your own instruction
          </button>
        </div>

        <div className="centre">
          <div className="ar-live">
            <div className="ar-dot" />
            Smart Mirror AR Guidance
          </div>

          <div className="ar-frame">
            <div className="br" />
            <CameraStage zones={zones} animKey={animKey} videoRef={videoRef} cameraError={cameraError} />
          </div>

          <div className="zone-pills">
            {zones.length === 0 ? (
              <span className="no-zones">No zones detected</span>
            ) : (
              zones.map((zone) => (
                <span key={zone} className="pill">
                  {ZONE_META[zone] || zone}
                </span>
              ))
            )}
          </div>

          {instruction && <div className="instruction-quote">"{instruction}"</div>}
          {cameraError && <div className="instruction-quote">Camera unavailable, showing face diagram fallback.</div>}
        </div>

        <div className="right-panel">
          <div className="rp-header">
            <div className="rp-title">{customMode ? "Custom Instruction" : tutorial?.label || "Tutorial"}</div>
            <div className="rp-sub">
              {customMode ? "Type any makeup instruction below" : `Step ${stepIdx + 1} of ${tutorial?.steps?.length || 0}`}
            </div>
          </div>

          {customMode ? (
            <div className="custom-area">
              <label className="custom-label" htmlFor="custom-instruction">
                Instruction text
              </label>
              <textarea
                id="custom-instruction"
                className="custom-input"
                value={customText}
                onChange={(event) => {
                  setCustomText(event.target.value);
                  setAnimKey((value) => value + 1);
                }}
                placeholder="e.g. apply blush to the cheeks, contour the jawline, and highlight the inner corners"
              />

              <div className="hint-wrap">
                <div className="custom-hint">Try phrases like:</div>
                <div className="hint-tags">
                  {[
                    "full face",
                    "forehead",
                    "hairline",
                    "temples",
                    "brows",
                    "brow bone",
                    "eyelid",
                    "crease",
                    "inner corner",
                    "outer corner",
                    "eyeliner",
                    "lash line",
                    "under eye",
                    "nose bridge",
                    "nose sides",
                    "nose tip",
                    "cheeks",
                    "cheekbone",
                    "cheek highlight",
                    "jawline",
                    "chin",
                    "upper lip",
                    "lower lip",
                    "mouth corners",
                  ].map((keyword) => (
                    <span key={keyword} className="hint-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="steps-list">
              {tutorial?.steps?.map((step, index) => (
                <div
                  key={index}
                  className={`step-row ${index === stepIdx ? "active" : ""}`}
                  onClick={() => goStep(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") goStep(index);
                  }}
                >
                  <div className="step-num">{index + 1}</div>
                  <div className="step-text">{step}</div>
                </div>
              ))}
            </div>
          )}

          {!customMode && (
            <div className="nav-area">
              <button className="nav-btn" onClick={() => goStep(stepIdx - 1)} disabled={stepIdx === 0} type="button">
                Back
              </button>
              <button
                className="nav-btn primary"
                onClick={() => goStep(stepIdx + 1)}
                disabled={stepIdx >= (tutorial?.steps?.length || 1) - 1}
                type="button"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlamCamAR;
