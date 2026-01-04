# from keras.applications.mobilenet_v2 import preprocess_input
# from fastapi import FastAPI, UploadFile, File
# import tensorflow as tf
# import json
# import numpy as np
# from PIL import Image
# import io

# app = FastAPI()

# # Load model and classes
# model = tf.keras.models.load_model("../models/face_shape.keras")

# with open("../models/class_names.json") as f:
#     class_names = json.load(f)


# def preprocess(image: Image.Image):
#     image = image.resize((224, 224))
#     image = np.array(image)
#     image = preprocess_input(image)
#     image = np.expand_dims(image, axis=0)
#     return image

# @app.post("/predict")
# async def predict(file: UploadFile = File(...)):
#     contents = await file.read()
#     image = Image.open(io.BytesIO(contents)).convert("RGB")
#     x = preprocess(image)

#     preds = model.predict(x)

#     #debug output
#     print(dict(zip(class_names, preds[0])))
    
#     idx = int(np.argmax(preds))
#     return {
#         "class": class_names[idx],
#         "confidence": float(preds[0][idx])
#     }


from fastapi import FastAPI, UploadFile, File
import cv2
import mediapipe as mp
import numpy as np
import joblib
import json
from PIL import Image
import io

app = FastAPI()

clf = joblib.load("../models/face_shape_clf.pkl")

with open("../models/class_names.json") as f:
    class_names = json.load(f)

mp_face = mp.solutions.face_mesh.FaceMesh(static_image_mode=True)

def extract_landmarks(image):
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = mp_face.process(rgb)
    if not result.multi_face_landmarks:
        return None
    pts = result.multi_face_landmarks[0]
    return np.array([[p.x, p.y] for p in pts.landmark])

def face_metrics(pts):
    face_width = np.linalg.norm(pts[234] - pts[454])
    face_height = np.linalg.norm(pts[10] - pts[152])
    jaw_width = np.linalg.norm(pts[172] - pts[397])
    cheek_width = np.linalg.norm(pts[93] - pts[323])
    forehead_width = np.linalg.norm(pts[54] - pts[284])

    return np.array([
        face_height / face_width,
        jaw_width / cheek_width,
        forehead_width / jaw_width,
        cheek_width / face_width
    ]).reshape(1, -1)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image = np.array(image)

    pts = extract_landmarks(image)
    if pts is None:
        return {"error": "No face detected"}

    feats = face_metrics(pts)
    probs = clf.predict_proba(feats)[0]
    idx = int(np.argmax(probs))

    return {
        "face_shape": class_names[idx],
        "confidence": float(probs[idx])
    }
