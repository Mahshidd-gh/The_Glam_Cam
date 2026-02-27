from fastapi import FastAPI, UploadFile, File, HTTPException
from model.scripts.Face_recognition import predict
from database import fetch_tutorial

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

@app.get("/get_tutorial")
def get_tutorial(face_shape: str, makeup_style: str = None, hair_style: str = None):
    
    steps = fetch_tutorial(
        face_shape=face_shape,
        makeup_style=makeup_style,
        hair_style=hair_style,
        random_choice=True
    )

    if steps:
        return {
            "face_shape": face_shape,
            "steps": steps
        }
    else:
        return {"message": "No tutorial found"}