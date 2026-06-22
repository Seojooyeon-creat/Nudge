"""Helpers to enforce the { success, data, error } response envelope."""
from typing import Any

from fastapi.responses import JSONResponse


def ok(data: Any = None) -> dict:
    return {"success": True, "data": data, "error": None}


def fail(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": False, "data": None, "error": message},
    )
