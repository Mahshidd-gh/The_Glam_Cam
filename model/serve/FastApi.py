from keras.applications.mobilenet_v2 import preprocess_input
from fastapi import FastAPI, UploadFile, File
import tensorflow as tf
import json
import numpy as np
from PIL import Image
import io

app = FastAPI()

# Load model and classes
model = tf.keras.models.load_model("../models/face_shape.keras")

with open("../models/class_names.json") as f:
    class_names = json.load(f)


def preprocess(image: Image.Image):
    image = image.resize((224, 224))
    image = np.array(image)
    image = preprocess_input(image)
    image = np.expand_dims(image, axis=0)
    return image

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    x = preprocess(image)

    preds = model.predict(x)

    #debug output
    print(dict(zip(class_names, preds[0])))
    
    idx = int(np.argmax(preds))
    return {
        "class": class_names[idx],
        "confidence": float(preds[0][idx])
    }
