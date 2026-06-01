import os


def _build_db_url() -> str:
    # Most hosts (Render, Railway) hand you a single DATABASE_URL.
    # Fall back to individual pieces for local docker-compose.
    url = os.getenv("DATABASE_URL")
    if url:
        # SQLAlchemy wants postgresql:// not postgres://
        return url.replace("postgres://", "postgresql://", 1)

    user = os.getenv("POSTGRES_USER", "postgres")
    pw = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    name = os.getenv("POSTGRES_DB", "inventory")
    return f"postgresql://{user}:{pw}@{host}:{port}/{name}"


DATABASE_URL = _build_db_url()

# Comma separated list of origins allowed to hit the API.
# In prod set this to your deployed frontend URL.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]

# What counts as "running low" on the dashboard.
LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "10"))
