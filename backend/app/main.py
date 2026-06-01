from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import models, schemas
from .config import CORS_ORIGINS, LOW_STOCK_THRESHOLD
from .database import Base, engine, get_db
from .routers import customers, orders, products

# Simplified system: create tables on boot instead of wiring up Alembic.
# For something this size that's plenty - swap in migrations if it grows.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory & Order Management API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/dashboard", response_model=schemas.DashboardStats, tags=["meta"])
def dashboard(db: Session = Depends(get_db)):
    low = (
        db.query(models.Product)
        .filter(models.Product.quantity < LOW_STOCK_THRESHOLD)
        .order_by(models.Product.quantity)
        .all()
    )
    return schemas.DashboardStats(
        total_products=db.query(models.Product).count(),
        total_customers=db.query(models.Customer).count(),
        total_orders=db.query(models.Order).count(),
        low_stock=low,
    )
