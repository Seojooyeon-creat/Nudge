"""Nudge FastAPI entrypoint.

Run locally:
    uvicorn main:app --reload
"""
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings
from routers import auth, friends, reactions, status

app = FastAPI(title=settings.app_name)

# Allow the Expo app to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"success": True, "data": {"status": "ok"}, "error": None}


# Keep HTTPExceptions (401s from auth, 404s, etc.) in the envelope shape too —
# otherwise FastAPI's default handler returns {"detail": ...}.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "data": None, "error": exc.detail},
    )


# Keep request-validation failures (e.g. label too long) in the envelope shape.
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    message = first.get("msg", "Invalid request")
    return JSONResponse(
        status_code=422,
        content={"success": False, "data": None, "error": message},
    )


# Ensure even unexpected errors follow the { success, data, error } envelope.
@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": str(exc)},
    )


app.include_router(auth.router)
app.include_router(status.router)
app.include_router(friends.router)
app.include_router(reactions.router)
