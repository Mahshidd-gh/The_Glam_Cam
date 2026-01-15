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
# ======================
# CONFIG
# ======================

IMG_SIZE = 224
NUM_CLASSES = 5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ======================
# LOAD CLASS NAMES
# ======================
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
with open(MODELS_DIR/ "class_names.json", "r") as f:
    CLASS_NAMES = json.load(f)

# ======================
# MEDIAPIPE (LAZY INIT)
# ======================

def get_face_mesh():
    return mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=True
    )

# ======================
# GEOMETRY
# ======================

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

# ======================
# TRANSFORMS
# ======================

transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# ======================
# MODEL
# ======================

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

# ======================
# LOAD MODEL
# ======================

def load_model(weights_path= MODELS_DIR/"face_shape.pt"):
    model = Hybrid_Model()
    model.load_state_dict(torch.load(weights_path, map_location=DEVICE))
    model.to(DEVICE)
    model.eval()
    return model

MODEL = load_model()

# ======================
# PREDICTION
# ======================

def predict(image_bytes: bytes):
    face_mesh = get_face_mesh()

    image = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image")

    image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))

    landmarks = extract_landmarks(image, face_mesh)
    geom = geometry_features(landmarks)

    image_tensor = transform(image).unsqueeze(0).to(DEVICE)
    geom_tensor = torch.tensor(geom).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        outputs = MODEL(image_tensor, geom_tensor)
        pred_idx = torch.argmax(outputs, dim=1).item()

    return CLASS_NAMES[pred_idx]
