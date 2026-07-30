import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

class Settings:
    PROJECT_NAME: str = "Verdad Tickets API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkeychangeinproduction1234567890!")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://root:password@localhost:3306/verdad_tickets"
    )
    
    # AWS Storage / GCP Standby
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "verdad-tickets-attachments")
    GCP_GCS_BUCKET: str = os.getenv("GCP_GCS_BUCKET", "verdad-tickets-backups")

settings = Settings()
