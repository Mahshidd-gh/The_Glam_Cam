from fastapi import FastAPI, UploadFile, File, HTTPException
from model.scripts.Face_recognition import predict
from model.serve.database import fetch_tutorial
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Face Shape Classification API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
def get_tutorial(
    face_shape: str,
    makeup_style: str = None,
    hair_style: str = None,
    occasion: str = None,
    skill_level: str = None,
  
):
    def clean(val):
        return None if val in (None, "undefined", "") else val

    face_shape    = clean(face_shape)
    makeup_style  = clean(makeup_style)
    hair_style    = clean(hair_style)
    occasion      = clean(occasion)
    skill_level   = clean(skill_level)

    if not face_shape:
        raise HTTPException(status_code=400, detail="face_shape is required")
    

    print(face_shape, makeup_style, hair_style, occasion, skill_level)

    steps = fetch_tutorial(
        face_shape=face_shape.lower(),
        makeup_style=makeup_style.lower() if makeup_style else None,
        hair_style=hair_style.lower() if hair_style else None,
        occasion=occasion.lower() if occasion else None,
        skill_level=skill_level.lower() if skill_level else None,
        random_choice=True,
    )
    if steps:
        return steps  
    else:
        return {"message": "No tutorial found"}