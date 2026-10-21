from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import fitz
from docx import Document
from fastapi.testclient import TestClient

from app import documents
from app.main import create_app

AUTH = {'Authorization': 'Bearer test-access'}


def docx_bytes():
    document = Document()
    document.add_paragraph('请在2026年10月23日前提交项目书。')
    table = document.add_table(rows=1, cols=2)
    table.cell(0, 0).text = '提交渠道'
    table.cell(0, 1).text = '教学平台'
    output = BytesIO()
    document.save(output)
    return output.getvalue()


def test_docx_upload_extracts_paragraphs_and_table_without_saving(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post('/api/v1/documents/extract', headers=AUTH,
                               files={'file': ('通知.docx', docx_bytes(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')})
    assert response.status_code == 200
    assert response.json()['kind'] == 'Word'
    assert response.json()['text'] == '请在2026年10月23日前提交项目书。\n提交渠道 教学平台'
    assert response.json()['characters'] == len(response.json()['text'])
    assert response.json()['ocr_pages'] == 0


def test_docx_raw_endpoint_supports_app_content_uri_upload(settings):
    with TestClient(create_app(settings)) as client:
        response = client.post('/api/v1/documents/extract-raw?filename=%E9%80%9A%E7%9F%A5.docx', headers={
            **AUTH, 'Content-Type': 'application/octet-stream'
        }, content=docx_bytes())
    assert response.status_code == 200
    assert response.json()['kind'] == 'Word'


def test_raw_upload_reports_empty_content_and_rejects_oversize_before_reading(settings):
    with TestClient(create_app(settings)) as client:
        headers = {**AUTH, 'Content-Type': 'application/octet-stream'}
        empty = client.post('/api/v1/documents/extract-raw?filename=notice.pdf', headers=headers, content=b'')
        assert empty.status_code == 400
        assert empty.json()['code'] == 'DOCUMENT_EMPTY'
        large = client.post('/api/v1/documents/extract-raw?filename=notice.pdf',
                            headers={**headers, 'Content-Length': str(20 * 1024 * 1024 + 1)}, content=b'')
        assert large.status_code == 413
        assert large.json()['code'] == 'DOCUMENT_TOO_LARGE'


def test_document_upload_auth_type_and_size_are_enforced(settings):
    with TestClient(create_app(settings)) as client:
        assert client.post('/api/v1/documents/extract', files={'file': ('通知.docx', docx_bytes())}).status_code == 401
        unsupported = client.post('/api/v1/documents/extract', headers=AUTH, files={'file': ('通知.txt', b'text')})
        assert unsupported.status_code == 415
        too_large = client.post('/api/v1/documents/extract', headers=AUTH, files={'file': ('通知.pdf', b'x' * (20 * 1024 * 1024 + 1))})
        assert too_large.status_code == 413


def test_legacy_doc_uses_antiword_and_normalizes_extracted_text(monkeypatch):
    def fake_run(command, **kwargs):
        assert command[1:3] == ['-m', 'UTF-8.txt']
        assert Path(command[3]).read_bytes() == b'legacy Word bytes'
        assert kwargs['timeout'] == 10
        return SimpleNamespace(returncode=0, stdout='提交项目书\n\n教学平台'.encode())

    monkeypatch.setattr(documents.shutil, 'which', lambda name: '/usr/bin/antiword' if name == 'antiword' else None)
    monkeypatch.setattr(documents.subprocess, 'run', fake_run)
    text, kind, ocr_pages = documents.extract_document('通知.doc', b'legacy Word bytes')
    assert kind == 'Word'
    assert text == '提交项目书\n教学平台'
    assert ocr_pages == 0


def test_scanned_pdf_uses_chinese_ocr_and_returns_page_count(monkeypatch):
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_image(fitz.Rect(0, 0, 200, 100), stream=bytes.fromhex(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
        '0000000b49444154789c636000020000050001a5f645400000000049454e44ae426082'
    ))
    data = pdf.tobytes()
    pdf.close()
    calls = []

    def fake_run(command, **kwargs):
        calls.append(command)
        assert kwargs['timeout'] == 8
        assert command[-4:] == ['--oem', '1', '--psm', '6']
        return SimpleNamespace(returncode=0, stdout='请于2026年10月23日前提交项目书'.encode(), stderr=b'')

    monkeypatch.setattr(documents.shutil, 'which', lambda name: '/usr/bin/tesseract' if name == 'tesseract' else None)
    monkeypatch.setattr(documents.subprocess, 'run', fake_run)
    text, kind, ocr_pages = documents.extract_document('扫描通知.pdf', data)
    assert kind == 'PDF'
    assert text == '请于2026年10月23日前提交项目书'
    assert ocr_pages == 1
    assert len(calls) == 1


def test_scanned_pdf_explains_missing_ocr_runtime(monkeypatch):
    pdf = fitz.open()
    page = pdf.new_page()
    page.insert_image(fitz.Rect(0, 0, 200, 100), stream=bytes.fromhex(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
        '0000000b49444154789c636000020000050001a5f645400000000049454e44ae426082'
    ))
    data = pdf.tobytes()
    pdf.close()
    monkeypatch.setattr(documents.shutil, 'which', lambda _name: None)
    try:
        documents.extract_document('扫描通知.pdf', data)
    except documents.ApiError as error:
        assert error.status == 503
        assert error.code == 'DOCUMENT_OCR_UNAVAILABLE'
    else:
        raise AssertionError('scanned PDFs must explain when OCR is not available')


def test_scanned_pdf_limit_is_ten_pages():
    image = bytes.fromhex(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
        '0000000b49444154789c636000020000050001a5f645400000000049454e44ae426082'
    )
    pdf = fitz.open()
    for _ in range(11):
        page = pdf.new_page(width=200, height=100)
        page.insert_image(fitz.Rect(0, 0, 200, 100), stream=image)
    data = pdf.tobytes()
    pdf.close()
    try:
        documents.extract_document('长扫描通知.pdf', data)
    except documents.ApiError as error:
        assert error.status == 422
        assert error.code == 'DOCUMENT_OCR_TOO_MANY_PAGES'
        assert '10 页' in error.message
    else:
        raise AssertionError('more than ten image pages must be rejected before OCR')


def test_legacy_doc_explains_when_server_converter_is_missing(monkeypatch):
    monkeypatch.setattr(documents.shutil, 'which', lambda _name: None)
    try:
        documents.extract_document('通知.doc', b'legacy Word bytes')
    except documents.ApiError as error:
        assert error.status == 503
        assert '.docx' in error.message
    else:
        raise AssertionError('legacy DOC without a converter must return a clear error')
