import cv2
import json
import math
import numpy as np
import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision.models as models
import mediapipe as mp
from pathlib import Path
 
# CONFIG
IMG_SIZE = 224
NUM_CLASSES = 5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

 
# LOAD CLASS NAMES
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
with open(MODELS_DIR/ "class_names.json", "r") as f:
    CLASS_NAMES = json.load(f)

 
# MEDIAPIPE
def get_face_mesh():
    return mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True
    )

 
# GEOMETRY
def dist(a, b):
    return math.dist(a, b)

def geometry_features(landmarks):
    if landmarks is None:
        return np.zeros(3, dtype=np.float32)

    jaw = dist(landmarks[234], landmarks[454])
    height = dist(landmarks[10], landmarks[152])
    cheek = dist(landmarks[93], landmarks[323])
    forehead = dist(landmarks[127], landmarks[356])

    return np.array([
        jaw / height,
        cheek / height,
        forehead / height
    ], dtype=np.float32)

def extract_landmarks(image, face_mesh):
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(img_rgb)

    if not result.multi_face_landmarks:
        return None

    return np.array(
        [[lm.x, lm.y] for lm in result.multi_face_landmarks[0].landmark],
        dtype=np.float32
    )

def is_valid_face(image, face_mesh, min_detection_confidence=0.7):
    """
    Returns (is_valid, landmarks) tuple.
    Uses MediaPipe's face detection score + a basic landmark sanity check.
    """
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(img_rgb)

    if not result.multi_face_landmarks:
        return False, None

    landmarks = np.array(
        [[lm.x, lm.y, lm.z] for lm in result.multi_face_landmarks[0].landmark],
        dtype=np.float32
    )


    xy = landmarks[:, :2]
    if np.any(xy < -0.1) or np.any(xy > 1.1):
        return False, None

   
   
    nose_tip = landmarks[1]       # nose tip
    left_eye = landmarks[33]      # left eye outer corner
    right_eye = landmarks[263]    # right eye outer corner
    chin = landmarks[152]         # chin

    eye_center_y = (left_eye[1] + right_eye[1]) / 2
    face_height = abs(chin[1] - eye_center_y)

    # Nose should be below eyes
    if nose_tip[1] <= eye_center_y:
        return False, None

    # Face height should be non-trivial
    if face_height < 0.05:
        return False, None

    eye_dy = abs(left_eye[1] - right_eye[1])
    eye_dx = abs(left_eye[0] - right_eye[0])
    if eye_dx > 0 and (eye_dy / eye_dx) > 0.3:  
        return False, None

    return True, landmarks[:, :2] 


 
# TRANSFORMS
transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

 
# MODEL
class CNNBackbone(nn.Module):
    def __init__(self):
        super().__init__()
        base = models.resnet18(pretrained=True)
        self.features = nn.Sequential(*list(base.children())[:-1])
        self.fc = nn.Linear(512, 256)

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)

class Hybrid_Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.cnn = CNNBackbone()
        self.geom_fc = nn.Linear(3, 64)

        self.classifier = nn.Sequential(
            nn.Linear(256 + 64, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, NUM_CLASSES)
        )

    def forward(self, image, geom):
        cnn_feat = self.cnn(image)
        geom_feat = self.geom_fc(geom)
        fused = torch.cat((cnn_feat, geom_feat), dim=1)
        return self.classifier(fused)

 
# LOAD MODEL
def load_model(weights_path= MODELS_DIR/"face_shape.pt"):
    model = Hybrid_Model()
    model.load_state_dict(torch.load(weights_path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

MODEL = load_model()

 
# PREDICTION
def predict(image_bytes: bytes):
    face_mesh = get_face_mesh()

    image = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image")

    image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))

    valid, landmarks = is_valid_face(image, face_mesh)

    if not valid:
        return {
            "face_shape": None,
            "confidence": 0.0,
            "error": "No valid face detected in the image"
        }

    geom = geometry_features(landmarks)

    image_tensor = transform(image).unsqueeze(0).to(DEVICE)
    geom_tensor = torch.tensor(geom).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = MODEL(image_tensor, geom_tensor)
        probs = torch.softmax(outputs, dim=1)[0]
        pred_idx = torch.argmax(probs).item()
        confidence = float(probs[pred_idx])

    # Two-tier threshold:
    # - Below 0.3 → reject outright
    # - 0.3 to 0.5 → return result but flag as low confidence
    if confidence < 0.3:
        return {
            "face_shape": None,
            "confidence": confidence,
            "error": "Low confidence prediction — face may be unclear or partially visible"
        }

    return {
        "face_shape": CLASS_NAMES[pred_idx],
        "confidence": confidence,
        "low_confidence": confidence < 0.5  # flag it but still return a result
    }