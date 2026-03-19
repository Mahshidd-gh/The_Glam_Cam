from fastapi import FastAPI, UploadFile, File, HTTPException
from model.scripts.Face_recognition import predict
from model.serve.database import fetch_tutorial
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Face Shape Classification API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    
    print(face_shape, makeup_style, hair_style)

    steps = fetch_tutorial(
        face_shape=face_shape.lower(),
        makeup_style=makeup_style.lower(),
        hair_style=hair_style.lower(),
        random_choice=True
    )



    if steps:
        return {
            "face_shape": face_shape,
            "steps": steps,
            "total_steps": len(steps)
        }

    else:
        return {"message": "No tutorial found"}