from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.get(models.Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")

    # Roll repeated product lines together so someone can't sneak past the
    # stock check by splitting one product across two line items.
    wanted: dict[int, int] = {}
    for line in payload.items:
        wanted[line.product_id] = wanted.get(line.product_id, 0) + line.quantity

    total = Decimal("0")
    order_items = []

    for product_id, qty in wanted.items():
        product = db.get(models.Product, product_id)
        if not product:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, f"Product {product_id} not found"
            )

        if product.quantity < qty:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Not enough stock for '{product.name}': "
                f"{product.quantity} available, {qty} requested",
            )

        product.quantity -= qty  # reserve the stock
        line_total = product.price * qty
        total += line_total
        order_items.append(
            models.OrderItem(
                product_id=product.id,
                quantity=qty,
                unit_price=product.price,
            )
        )

    order = models.Order(
        customer_id=customer.id,
        total_amount=total,
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    # Cancelling an order puts the stock back where it came from.
    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product:
            product.quantity += item.quantity

    db.delete(order)
    db.commit()
