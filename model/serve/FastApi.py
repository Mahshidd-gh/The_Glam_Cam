from fastapi import FastAPI, UploadFile, File, HTTPException
from model.scripts.Face_recognition import predict

app = FastAPI(title="Face Shape Classification API")

@app.post("/predict")
async def predict_face_shape(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    image_bytes = await file.read()

    try:
        result = predict(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
