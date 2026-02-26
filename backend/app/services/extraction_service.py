import google.generativeai as genai
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import io
import docx
import pptx
from .config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
vision_model = genai.GenerativeModel("gemini-1.5-flash")

OCR_CONFIDENCE_THRESHOLD = 0.70

async def extract_text_from_file(file_bytes: bytes, filename: str) -> dict:
    """Route file to the appropriate extraction method based on extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    
    if ext == "pdf":
        return await extract_pdf(file_bytes)
    elif ext in ("png", "jpg", "jpeg"):
        return await extract_image(file_bytes)
    elif ext == "docx":
        return extract_docx(file_bytes)
    elif ext == "pptx":
        return extract_pptx(file_bytes)
    elif ext == "txt":
        return {"text": file_bytes.decode("utf-8"), "ocr_used": False, "confidence": 1.0}
    else:
        raise ValueError(f"Unsupported document format: {ext}")

async def extract_pdf(file_bytes: bytes) -> dict:
    """Extract text from PDF, with image fallback for scanned pages."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages = []
    ocr_used = False
    
    for page_num, page in enumerate(doc):
        text = page.get_text().strip()
        
        # If native text layer is thin/missing -> treat as scanned page
        if len(text) < 50:
            ocr_used = True
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            result = await extract_image(img_bytes, page_ref=f"p.{page_num+1}")
            pages.append({"page": page_num + 1, "text": result["text"], "ocr": True})
        else:
            pages.append({"page": page_num + 1, "text": text, "ocr": False})
            
    full_text = "\n\n".join(f"[Page {p['page']}]\n{p['text']}" for p in pages)
    return {
        "text": full_text, 
        "ocr_used": ocr_used, 
        "pages": pages, 
        "confidence": 0.9 if ocr_used else 1.0
    }

async def extract_image(img_bytes: bytes, page_ref: str = "img") -> dict:
    """Use Gemini Flash to transcribe images, with local Tesseract fallback."""
    # PRIMARY: Gemini Vision
    image = Image.open(io.BytesIO(img_bytes))
    prompt = (
        "Extract ALL text from this image EXACTLY as written. "
        "Preserve headers, bullet points, tables, and formatting. "
        "Do NOT summarize, interpret, or add any information not present in the image. "
        "Output only the raw extracted text."
    )
    
    try:
        response = vision_model.generate_content([prompt, image])
        gemini_text = response.text.strip()
        
        # FALLBACK: pytesseract if Gemini returns empty structure
        if len(gemini_text) < 20:
            tesseract_text = pytesseract.image_to_string(image, config="--psm 6")
            return {"text": tesseract_text, "ocr_used": True, "confidence": 0.60}
            
        return {"text": gemini_text, "ocr_used": True, "confidence": 0.92}
        
    except Exception as e:
        # Fallback on generic tesseract on quota/timeout issues
        tesseract_text = pytesseract.image_to_string(image)
        return {"text": tesseract_text, "ocr_used": True, "confidence": 0.50}

def extract_docx(file_bytes: bytes) -> dict:
    """Extract text from Word Document."""
    doc_io = io.BytesIO(file_bytes)
    doc = docx.Document(doc_io)
    text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    return {"text": text, "ocr_used": False, "confidence": 1.0}

def extract_pptx(file_bytes: bytes) -> dict:
    """Extract text from PowerPoint slides."""
    prs_io = io.BytesIO(file_bytes)
    prs = pptx.Presentation(prs_io)
    
    slides_text = []
    for i, slide in enumerate(prs.slides):
        slide_content = []
        for shape in slide.shapes:
            if hasattr(shape, "text"):
                slide_content.append(shape.text)
        if slide_content:
            slides_text.append(f"[Slide {i+1}]\n" + "\n".join(slide_content))
            
    full_text = "\n\n".join(slides_text)
    return {"text": full_text, "ocr_used": False, "confidence": 1.0}
