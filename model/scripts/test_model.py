import tensorflow as tf
import numpy as np
from PIL import Image
import json

# load model
model = tf.keras.models.load_model("../models/face_shape.keras")

# load class names
with open("../models/class_names.json") as f:
    class_names = json.load(f)

# test on one image
img = Image.open("../data/test/Round/round (27).jpg").convert("RGB")  # change path to your image
img = img.resize((224, 224))
x = np.expand_dims(np.array(img) / 255.0, axis=0)

pred = model.predict(x)
pred_idx = np.argmax(pred)

print("Predicted:", class_names[pred_idx])
print("Probabilities:", pred[0])
