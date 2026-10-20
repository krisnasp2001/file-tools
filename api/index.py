import os
import tempfile
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Import local convert function
from convert_pdf_to_docx import convert

app = FastAPI(title="PDF to DOCX Converter on Vercel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/py/health")
def health():
    return {"status": "ok", "engine": "pdf2docx"}


@app.post("/api/py/convert")
async def convert_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    unique_id = str(uuid.uuid4())
    temp_dir = tempfile.gettempdir()
    input_path = os.path.join(temp_dir, f"input_{unique_id}.pdf")
    output_path = os.path.join(temp_dir, f"output_{unique_id}.docx")

    try:
        content = await file.read()
        with open(input_path, "wb") as f:
            f.write(content)

        convert(input_path, output_path)

        if not os.path.exists(output_path):
            raise HTTPException(status_code=500, detail="Conversion produced no output file")

        clean_name = os.path.splitext(file.filename)[0] + ".docx"
        return FileResponse(
            path=output_path,
            filename=clean_name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass
