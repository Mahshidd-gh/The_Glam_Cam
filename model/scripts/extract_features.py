# import os
# import cv2
# import numpy as np
# import mediapipe as mp
# import json

# DATA_DIR = "../data"
# OUT_DIR = "../features"

# os.makedirs(OUT_DIR, exist_ok=True)

# mp_face = mp.solutions.face_mesh.FaceMesh(static_image_mode=True)

# def extract_landmarks(image):
#     rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
#     result = mp_face.process(rgb)
#     if not result.multi_face_landmarks:
#         return None
#     pts = result.multi_face_landmarks[0]
#     return np.array([[p.x, p.y] for p in pts.landmark])

# def face_metrics(pts):
#     face_width = np.linalg.norm(pts[234] - pts[454])
#     face_height = np.linalg.norm(pts[10] - pts[152])
#     jaw_width = np.linalg.norm(pts[172] - pts[397])
#     cheek_width = np.linalg.norm(pts[93] - pts[323])
#     forehead_width = np.linalg.norm(pts[54] - pts[284])

#     return [
#         face_height / face_width,
#         jaw_width / cheek_width,
#         forehead_width / jaw_width,
#         cheek_width / face_width
#     ]

# def process_split(split):
#     X, y = [], []
#     class_names = sorted(os.listdir(os.path.join(DATA_DIR, split)))

#     for idx, cls in enumerate(class_names):
#         folder = os.path.join(DATA_DIR, split, cls)
#         for img_name in os.listdir(folder):
#             path = os.path.join(folder, img_name)
#             img = cv2.imread(path)
#             if img is None:
#                 continue

#             pts = extract_landmarks(img)
#             if pts is None:
#                 continue

#             feats = face_metrics(pts)
#             X.append(feats)
#             y.append(idx)

#     return np.array(X), np.array(y), class_names

# X_train, y_train, class_names = process_split("train")
# X_val, y_val, _ = process_split("val")

# np.save(f"{OUT_DIR}/X_train.npy", X_train)
# np.save(f"{OUT_DIR}/y_train.npy", y_train)
# np.save(f"{OUT_DIR}/X_val.npy", X_val)
# np.save(f"{OUT_DIR}/y_val.npy", y_val)

# with open("../models/class_names.json", "w") as f:
#     json.dump(class_names, f)

# print("Feature extraction complete")
# print("Classes:", class_names)
