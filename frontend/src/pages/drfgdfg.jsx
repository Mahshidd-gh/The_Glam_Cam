









//IMPORTS
import { useState, useRef, useEffect } from "react";


//CONSTANTS
const R = "rgba(220,30,30,";
const RS = "rgba(255,60,60,";



//KEYWORD → ZONE MAP
const KEYWORD_ZONES = [
  { keywords: ["jawline", "jaw line", "jaw", "ear to chin", "from ear to chin"], zones: ["jawline"] },
  { keywords: ["chin"], zones: ["chin"] },
  { keywords: ["corner of mouth", "mouth corner"], zones: ["mouth_corners"] },
  { keywords: ["apple of the cheek", "apple of cheek", "apple"], zones: ["apple_of_cheek"] },

  {
    keywords: [
      "cheekbone",
      "cheek bone",
      "hollow of the cheek",
      "hallows of the cheek",
      "under the cheekbone",
      "below the cheekbone"
    ],
    zones: ["cheekbone"]
  },

  { keywords: ["cheek"], zones: ["apple_of_cheek"] },
  { keywords: ["temple", "temples"], zones: ["temples"] },
  { keywords: ["center of the forehead", "centre of the forehead", "forehead"], zones: ["forehead_center"] },
  { keywords: ["hairline"], zones: ["hairline"] },
  { keywords: ["bridge of nose", "nose bridge", "bridge of the nose"], zones: ["nose_bridge"] },

  {
    keywords: [
      "side of the nose",
      "sides of the nose",
      "sides of nose",
      "side of nose",
      "nose sides"
    ],
    zones: ["nose_sides"]
  },

  { keywords: ["tip of the nose", "tip of nose", "nose tip"], zones: ["nose_tip"] },
  { keywords: ["brow bone", "browbone"], zones: ["brow_bone"] },
  { keywords: ["eyebrow", "brow"], zones: ["brows"] },
  { keywords: ["socket line", "eye socket", "socket"], zones: ["eye_socket"] },
  { keywords: ["cut crease", "crease"], zones: ["eye_crease"] },
  { keywords: ["upper lash line", "upper lashline", "mobile lid", "upper lid"], zones: ["eye_upper_lid"] },
  { keywords: ["lid"], zones: ["eye_upper_lid"] },
  { keywords: ["inner corner", "inner corners", "inside eye"], zones: ["eye_inner_corner"] },
  { keywords: ["outer v", "outer corner", "outer eye"], zones: ["eye_outer_v"] },

  {
    keywords: [
      "lower lash line",
      "lower lashline",
      "lash line",
      "lower waterline",
      "upper waterline",
      "waterline",
      "lower lids",
      "lower lid"
    ],
    zones: ["lash_line"]
  },

  { keywords: ["lashes", "lash"], zones: ["lash_line"] },
  { keywords: ["eyeliner", "liner", "wing", "tight-line"], zones: ["eyeliner"] },
  { keywords: ["cupid's bow", "cupids bow", "cupid bow", "top lip", "upper lip"], zones: ["lip_top"] },
  { keywords: ["lower lip", "bottom lip"], zones: ["lip_bottom"] },
  { keywords: ["lips", "lip"], zones: ["lip_top", "lip_bottom"] },
  { keywords: ["full face", "entire face", "all over", "evenly"], zones: ["full_face"] }
];



//TUTORIAL DATA
const TUTORIALS = [
  {
    id: 1,
    label: "Natural · Round",
    steps: [
      "Apply evenly across the full face.",
      "Blend along the jawline from ear to chin on both sides.",
      "Tap onto the apple of the cheek.",
      "Apply to the top lip and lower lip."
    ]
  },
  {
    id: 2,
    label: "Smokey · Round",
    steps: [
      "Apply across the full face.",
      "Blend into the temples and under the cheekbone.",
      "Sweep across the upper lid and blend up through the crease.",
      "Draw along the upper lash line and wing outward.",
      "Apply to the top lip and lower lip."
    ]
  },
  {
    id: 3,
    label: "Glam · Square",
    steps: [
      "Apply across the full face.",
      "Blend along the jawline from ear toward chin.",
      "Apply to the nose bridge and along the cheekbone.",
      "Sweep across the upper lid and blend into the crease.",
      "Sweep from the apple of the cheek toward the temple.",
      "Apply to the top lip and lower lip."
    ]
  }
];



//UTILITY FUNCTIONS
function matchesKeyword(text, keyword) {
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z])${esc}(?![a-z])`, "i").test(text);
}

function parseZones(text) {
  const lower = text.toLowerCase();
  const zones = new Set();

  KEYWORD_ZONES.forEach(rule => {
    if (rule.keywords.some(k => matchesKeyword(lower, k)))
      rule.zones.forEach(z => zones.add(z));
  });

  return [...zones];
}




//  ZONE LAYER
function ZoneLayer({ shapes }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || shapes.length === 0) return;

    el.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 0, offset: 0.25 },
        { opacity: 1, offset: 0.38 },
        { opacity: 0, offset: 0.50 },
        { opacity: 1, offset: 0.62 },
        { opacity: 1, offset: 1 }
      ],
      { duration: 1200, fill: "forwards", easing: "ease" }
    );
  }, [shapes]);

  return (
    <g ref={ref}>
      {shapes.map((s, i) =>
        s.type === "ellipse"
          ? <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}
            fill={s.fill || "none"}
            stroke={s.stroke || "none"}
            strokeWidth={s.sw || 1} />
          : <path key={i} d={s.d}
            fill={s.fill || "none"}
            stroke={s.stroke || "none"}
            strokeWidth={s.sw || 1} />
      )}
    </g>
  );
}



//  FACE SVG
function FaceSVG({ zones }) {
  const shapes = zones.flatMap((z) => ZONE_SHAPES[z] || []);

  return (
    <svg viewBox="0 0 360 400" width="100%" height="100%">
      <ZoneLayer shapes={shapes} />
    </svg>
  );
}



//MAIN COMPONENT
function GlamCamAR() {

  const [tutorialIdx, setTutorialIdx] = useState(0);
  const tutorial = TUTORIALS[tutorialIdx];
  const [stepIdx, setStepIdx] = useState(0);
  const [customText, setCustomText] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const instruction = customMode ? customText : tutorial.steps[stepIdx] || "";
  const zones = parseZones(instruction);


  useEffect(() => {
    fetch(`http://localhost:8000/get_tutorial?face_shape=${data.face_shape}&makeup_style=${preferences.makeupType}&hair_style=${preferences.hairstyle}`)
      .then(r => r.json())
      .then(data => data.steps && setStepIdx(0))
      .catch(console.error);
  }, []);


  const goStep = () => {
    setStepIdx(s => s + 1);

  };

  const goTutorial = (i) => {
    setTutorialIdx(i);
    setStepIdx(0);
    setCustomMode(false);

  };

  const goCustom = () => {
    setCustomMode((v) => !v);

  };

  return (
    <div className="app">
      <div className="topbar">
        <div className="logo">Glam<span>Cam</span></div>
        <div className="badge">AR Preview</div>
      </div>
      <div className="body">

        {/* sidebar */}
        <div className="sidebar">
          <div className="sidebar-title">Tutorials</div>
          {TUTORIALS.map((t, i) => (
            <button key={t.id} className={`tut-btn ${!customMode && tutorialIdx === i ? "active" : ""}`}
              onClick={() => goTutorial(i)}>
              <div className="tut-name">{t.label}</div>
              <div className="tut-count">{t.steps.length} steps</div>
            </button>
          ))}
          <div className="divider" />
          <button className={`custom-toggle ${customMode ? "active" : ""}`} onClick={goCustom}>
            ✏️ Try your own instruction
          </button>
        </div>

        {/* centre */}
        <div className="centre">
          <div className="ar-live"><div className="ar-dot" /> AR Overlay Preview</div>
          <div className="ar-frame">
            <div className="br" />
            <FaceSVG zones={zones} />
          </div>
          <div className="zone-pills">
            {zones.length === 0
              ? <span className="no-zones">No zones detected</span>
              : zones.map(z => <span key={z} className="pill">{ZONE_META[z] || z}</span>)
            }
          </div>
          {instruction && <div className="instruction-quote">"{instruction}"</div>}
        </div>

        {/* right panel */}
        <div className="right-panel">
          <div className="rp-header">
            <div className="rp-title">{customMode ? "Custom Instruction" : tutorial.label}</div>
            <div className="rp-sub">{customMode ? "Type any instruction below" : `Step ${stepIdx + 1} of ${tutorial?.steps?.length || 0}`}</div>
          </div>

          {customMode ? (
            <div className="custom-area">
              <label className="custom-label">Instruction text</label>
              <textarea className="custom-input" value={customText}
                onChange={e => { setCustomText(e.target.value); }}
                placeholder="e.g. blend along the jawline from ear to chin" />
              <div className="hint-wrap">
                <div className="custom-hint">Anatomical zone keywords:</div>
                <div className="hint-tags">
                  {KEYWORD_ZONES.flatMap(z => z.keywords).slice(0, 25).map(k => (
                    <span key={k} className="hint-tag">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="steps-list">
              {tutorial.steps.map((s, i) => (
                <div key={i} className={`step-row ${i === stepIdx ? "active" : ""}`} onClick={() => goStep(i)}>
                  <div className="step-num">{i + 1}</div>
                  <div className="step-text">{s}</div>
                </div>
              ))}
            </div>
          )}

          {!customMode && (
            <div className="nav-area">
              <button className="nav-btn" onClick={nextStep}></button>
              <button className="nav-btn primary" onClick={() => goStep(stepIdx + 1)} disabled={stepIdx === tutorial?.steps?.length - 1}>Next →</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default GlamCamAR;