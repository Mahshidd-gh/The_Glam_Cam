from PIL import Image
import os

# 👇 adjust the paths to match your dataset structure
paths = ["../data/train", "../data/val", "../data/test"]
for dataset_path in paths:
    for root, dirs, files in os.walk(dataset_path):
        for file in files:
            if file.lower().endswith((".jpg", ".jpeg", ".png")):
                path = os.path.join(root, file)
                try:
                    # Try to fully open + load the image
                    img = Image.open(path)
                    img.load()
                except Exception as e:
                    print(f"❌ Corrupted: {path} ({e})")
                    os.remove(path)
                    print("   Removed.")
