from io import BytesIO
from pathlib import PurePath
import shutil
import subprocess
import threading
import time
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import BadZipFile, ZipFile

from docx import Document
from pypdf import PdfReader

from .errors import ApiError

MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
MAX_EXTRACTED_CHARS = 12000
MAX_PDF_PAGES = 80
MAX_OCR_PAGES = 10
MAX_OCR_SECONDS = 50
MAX_OCR_PAGE_SECONDS = 8
MIN_PAGE_TEXT_FOR_OCR = 40
MAX_DOCX_ENTRIES = 1000
MAX_DOCX_UNPACKED_BYTES = 64 * 1024 * 1024
_OCR_SLOT = threading.BoundedSemaphore(1)


def _normalize_text(value: str) -> str:
    lines = [" ".join(line.split()) for line in value.replace("\x00", "").splitlines()]
    return "\n".join(line for line in lines if line)


def _ocr_pdf_pages_locked(data: bytes, page_numbers: list[int]) -> dict[int, str]:
    tesseract = shutil.which("tesseract")
    if not tesseract:
        raise ApiError(503, "DOCUMENT_OCR_UNAVAILABLE", "服务器 OCR 组件暂未就绪，请稍后重试")
    try:
        import fitz
    except ImportError as exc:
        raise ApiError(503, "DOCUMENT_OCR_UNAVAILABLE", "服务器 OCR 组件暂未就绪，请稍后重试") from exc

    recognized: dict[int, str] = {}
    try:
        started = time.monotonic()
        with fitz.open(stream=data, filetype="pdf") as document:
            with TemporaryDirectory(prefix="zhixing-ocr-") as temporary:
                for number in page_numbers:
                    remaining = MAX_OCR_SECONDS - (time.monotonic() - started)
                    if remaining <= 0:
                        raise ApiError(422, "DOCUMENT_OCR_TIMEOUT", "扫描件处理时间较长，请拆分为更少页面后重试")
                    page = document[number]
                    image = Path(temporary) / f"page-{number + 1}.png"
                    page.get_pixmap(dpi=180, colorspace=fitz.csGRAY, alpha=False).save(image)
                    result = subprocess.run(
                        [tesseract, str(image), "stdout", "-l", "chi_sim+eng", "--oem", "1", "--psm", "6"],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        timeout=min(MAX_OCR_PAGE_SECONDS, remaining),
                        check=False,
                    )
                    if result.returncode != 0:
                        stderr = result.stderr.decode("utf-8", errors="replace")
                        if "Failed loading language" in stderr or "Error opening data file" in stderr:
                            raise ApiError(503, "DOCUMENT_OCR_UNAVAILABLE", "服务器缺少中文 OCR 语言包，请联系管理员配置后重试")
                        raise ApiError(422, "DOCUMENT_OCR_FAILED", f"PDF 第 {number + 1} 页识别失败，请尝试更清晰的文档")
                    recognized[number] = _normalize_text(result.stdout.decode("utf-8", errors="replace"))
    except ApiError:
        raise
    except subprocess.TimeoutExpired as exc:
        raise ApiError(422, "DOCUMENT_OCR_TIMEOUT", "PDF 页面识别超时，请拆分文档或尝试更清晰的文件") from exc
    except OSError as exc:
        raise ApiError(503, "DOCUMENT_OCR_UNAVAILABLE", "服务器 OCR 组件暂时无法运行，请稍后重试") from exc
    except Exception as exc:
        raise ApiError(422, "DOCUMENT_INVALID", "PDF 页面渲染失败，文件可能已损坏") from exc
    return recognized


def _ocr_pdf_pages(data: bytes, page_numbers: list[int]) -> dict[int, str]:
    # Tesseract is memory-heavy on small cloud instances; process one scanned PDF at a time.
    if not _OCR_SLOT.acquire(blocking=False):
        raise ApiError(429, "DOCUMENT_OCR_BUSY", "服务器正在识别另一份扫描件，请稍后重试", True)
    try:
        return _ocr_pdf_pages_locked(data, page_numbers)
    finally:
        _OCR_SLOT.release()


def _extract_pdf(data: bytes) -> tuple[str, int]:
    try:
        reader = PdfReader(BytesIO(data), strict=False)
        if reader.is_encrypted and not reader.decrypt(""):
            raise ApiError(422, "DOCUMENT_ENCRYPTED", "PDF 已加密，暂时无法读取")
        if len(reader.pages) > MAX_PDF_PAGES:
            raise ApiError(422, "DOCUMENT_TOO_MANY_PAGES", "PDF 超过 80 页，请拆分后再导入")
        page_texts = [_normalize_text(page.extract_text() or "") for page in reader.pages]
        candidates = [index for index, text in enumerate(page_texts) if len(text) < MIN_PAGE_TEXT_FOR_OCR]
        if candidates:
            import fitz

            with fitz.open(stream=data, filetype="pdf") as document:
                image_pages = [index for index in candidates if document[index].get_images(full=True)]
            if len(image_pages) > MAX_OCR_PAGES:
                raise ApiError(422, "DOCUMENT_OCR_TOO_MANY_PAGES", "扫描版 PDF 单次最多识别 10 页，请拆分后再导入")
            if image_pages:
                recognized = _ocr_pdf_pages(data, image_pages)
                for index, text in recognized.items():
                    page_texts[index] = "\n".join(part for part in (page_texts[index], text) if part)
        return _normalize_text("\n".join(page_texts)), len(image_pages) if candidates else 0
    except ApiError:
        raise
    except ImportError as exc:
        raise ApiError(503, "DOCUMENT_OCR_UNAVAILABLE", "服务器 OCR 组件暂未就绪，请稍后重试") from exc
    except Exception as exc:
        raise ApiError(422, "DOCUMENT_INVALID", "PDF 文件损坏或格式不受支持") from exc


def _extract_docx(data: bytes) -> str:
    try:
        with ZipFile(BytesIO(data)) as archive:
            entries = archive.infolist()
            if len(entries) > MAX_DOCX_ENTRIES or sum(entry.file_size for entry in entries) > MAX_DOCX_UNPACKED_BYTES:
                raise ApiError(422, "DOCUMENT_TOO_COMPLEX", "Word 文档结构过大，暂时无法安全读取")
        document = Document(BytesIO(data))
        content = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                content.append("　".join(cell.text for cell in row.cells))
        return _normalize_text("\n".join(content))
    except ApiError:
        raise
    except (BadZipFile, KeyError, ValueError, OSError) as exc:
        raise ApiError(422, "DOCUMENT_INVALID", "Word 文件损坏或格式不受支持") from exc


def _extract_doc(data: bytes) -> str:
    antiword = shutil.which("antiword")
    if not antiword:
        raise ApiError(503, "DOCUMENT_CONVERTER_UNAVAILABLE", "服务器暂未启用旧版 .doc 解析，请先另存为 .docx 再试")
    try:
        with TemporaryDirectory(prefix="zhixing-doc-") as temporary:
            source = Path(temporary) / "notice.doc"
            source.write_bytes(data)
            result = subprocess.run(
                [antiword, "-m", "UTF-8.txt", str(source)],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                timeout=10,
                check=False,
            )
        if result.returncode != 0:
            raise ApiError(422, "DOCUMENT_INVALID", "Word 文件损坏或格式不受支持")
        return _normalize_text(result.stdout.decode("utf-8", errors="replace"))
    except subprocess.TimeoutExpired as exc:
        raise ApiError(422, "DOCUMENT_TOO_COMPLEX", "旧版 Word 文档处理超时，请另存为 .docx 后再试") from exc
    except ApiError:
        raise
    except OSError as exc:
        raise ApiError(503, "DOCUMENT_CONVERTER_UNAVAILABLE", "服务器暂时无法读取旧版 .doc 文档") from exc
    except Exception as exc:
        raise ApiError(422, "DOCUMENT_INVALID", "Word 文件损坏或格式不受支持") from exc


def extract_document(filename: str | None, data: bytes) -> tuple[str, str, int]:
    extension = PurePath(filename or "").suffix.lower()
    if len(data) > MAX_DOCUMENT_BYTES:
        raise ApiError(413, "DOCUMENT_TOO_LARGE", "文件不能超过 20 MB")
    if not data:
        raise ApiError(400, "DOCUMENT_EMPTY", "所选文件为空")
    ocr_pages = 0
    if extension == ".pdf":
        text, ocr_pages = _extract_pdf(data)
        kind = "PDF"
    elif extension == ".docx":
        text = _extract_docx(data)
        kind = "Word"
    elif extension == ".doc":
        text = _extract_doc(data)
        kind = "Word"
    else:
        raise ApiError(415, "DOCUMENT_UNSUPPORTED", "目前支持 PDF、.docx 和 .doc Word 文档")
    if not text:
        raise ApiError(422, "DOCUMENT_NO_TEXT", "未提取到可识别的文字，请确认文档清晰、未加密且内容完整")
    if len(text) > MAX_EXTRACTED_CHARS:
        raise ApiError(413, "DOCUMENT_TEXT_TOO_LONG", "提取文字超过 12000 字，请先拆分或删去无关页面")
    return text, kind, ocr_pages
