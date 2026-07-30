from fastapi import APIRouter

from app.api.endpoints import auth, users, tickets, dr, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(dr.router, prefix="/dr", tags=["disaster-recovery"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
