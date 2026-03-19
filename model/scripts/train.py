import os
import cv2
import json
import math
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
import torchvision.models as models
import mediapipe as mp

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

 
# CONFIG
DATA_PATH = "../data/train"
IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 15
NUM_CLASSES = 5
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

VALID_EXTENSIONS = (".jpg", ".jpeg", ".png")

 
# MEDIAPIPE
mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True
)

 
# GEOMETRY FUNCTIONS
def extract_landmarks(image):
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = mp_face_mesh.process(img_rgb)

    if not result.multi_face_landmarks:
        return None

    return np.array(
        [[lm.x, lm.y] for lm in result.multi_face_landmarks[0].landmark],
        dtype=np.float32
    )

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

 
# DATASET
class FaceShapeDataset(Dataset):
    def __init__(self, samples, labels, transform=None):
        self.samples = samples
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path = self.samples[idx]
        label = self.labels[idx]

        image = cv2.imread(img_path)
        if image is None:
            raise ValueError(f"Cannot read image: {img_path}")

        image = cv2.resize(image, (IMG_SIZE, IMG_SIZE))

        landmarks = extract_landmarks(image)
        geom = geometry_features(landmarks)

        if self.transform:
            image = self.transform(image)

        return image, torch.tensor(geom), label

 
# LOAD DATA
samples, labels = [], []

class_names = sorted([
    d for d in os.listdir(DATA_PATH)
    if os.path.isdir(os.path.join(DATA_PATH, d)) and not d.startswith(".")
])

class_map = {name: i for i, name in enumerate(class_names)}

print("Class map:", class_map)

for cls in class_names:
    cls_path = os.path.join(DATA_PATH, cls)
    for img in os.listdir(cls_path):
        if not img.lower().endswith(VALID_EXTENSIONS):
            continue

        img_path = os.path.join(cls_path, img)
        if os.path.isfile(img_path):
            samples.append(img_path)
            labels.append(class_map[cls])

X_train, X_test, y_train, y_test = train_test_split(
    samples, labels, test_size=0.2, stratify=labels
)

 
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

 
# TRAINING
model = Hybrid_Model().to(DEVICE)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=1e-4)

train_ds = FaceShapeDataset(X_train, y_train, transform)
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)

for epoch in range(EPOCHS):
    model.train()
    total_loss = 0

    for imgs, geoms, labels_batch in train_loader:
        imgs = imgs.to(DEVICE)
        geoms = geoms.to(DEVICE)
        labels_batch = labels_batch.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(imgs, geoms)
        loss = criterion(outputs, labels_batch)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()

    print(f"Epoch {epoch + 1}: Loss = {total_loss:.4f}")

 
# EVALUATION
test_ds = FaceShapeDataset(X_test, y_test, transform)
test_loader = DataLoader(test_ds, batch_size=BATCH_SIZE)

model.eval()
preds, gts = [], []

with torch.no_grad():
    for imgs, geoms, labels_batch in test_loader:
        outputs = model(imgs.to(DEVICE), geoms.to(DEVICE))
        preds.extend(torch.argmax(outputs, 1).cpu().numpy())
        gts.extend(labels_batch.numpy())

print(classification_report(gts, preds))

# SAVE MODEL
os.makedirs("../models", exist_ok=True)

torch.save(model.state_dict(), "../models/face_shape.pt")

with open("../models/class_names.json", "w") as f:
    json.dump(class_names, f)

print("Model and class names saved successfully")
