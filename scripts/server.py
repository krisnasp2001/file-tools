import os
import sys
import tempfile
import uuid

# Ensure script directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from convert_pdf_to_docx import convert

app = FastAPI(title="PDF to DOCX High-Fidelity Converter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "pdf-to-docx-converter"}


@app.post("/convert")
async def convert_pdf(file: UploadFile = File(...)):
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except Exception:
                pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
