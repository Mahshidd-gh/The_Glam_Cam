# model/serve/app.py
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
from PIL import Image
import io
import tensorflow as tf
import json
import os

app = FastAPI()
origins = [
    "http://localhost:3000",  # React app
    "http://localhost:8080",  # Spring Boot backend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
model = tf.keras.models.load_model("../models/face_shape.keras")
with open("../models/class_names.json", "r") as f:
    CLASS_NAMES = json.load(f)

IMG_SIZE = (224, 224)

def preprocess_image_bytes(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img) / 255.0
    return np.expand_dims(arr, axis=0)  # batch dim

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    content = await file.read()
    x = preprocess_image_bytes(content)
    preds = model.predict(x)  # shape (1, C)
    probs = preds[0].tolist()
    idx = int(np.argmax(preds))
    return JSONResponse({"label": CLASS_NAMES[idx], "index": idx, "probs": probs})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
