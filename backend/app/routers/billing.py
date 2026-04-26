import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User, UserPlan
from app.routers.deps import get_current_user
from app.services import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
def get_plans():
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "3 resume analyses per month",
                    "Basic ATS score",
                    "General suggestions",
                ],
                "limits": {"analyses_per_month": settings.FREE_PLAN_ANALYSES_PER_MONTH},
            },
            {
                "id": "pro",
                "name": "Pro",
                "price": 1900,
                "currency": "usd",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRICE_ID_PRO,
                "features": [
                    "50 resume analyses per month",
                    "Advanced ATS score",
                    "Job description matching",
                    "Keyword optimization",
                    "Priority support",
                ],
                "limits": {"analyses_per_month": settings.PRO_PLAN_ANALYSES_PER_MONTH},
            },
            {
                "id": "enterprise",
                "name": "Enterprise",
                "price": 9900,
                "currency": "usd",
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRICE_ID_ENTERPRISE,
                "features": [
                    "Unlimited analyses",
                    "All Pro features",
                    "API access",
                    "Team management",
                    "Custom integrations",
                    "Dedicated support",
                ],
                "limits": {"analyses_per_month": settings.ENTERPRISE_PLAN_ANALYSES_PER_MONTH},
            },
        ]
    }


@router.post("/create-checkout-session")
def create_checkout_session(
    price_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing not configured")
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = stripe.checkout.Session.create(
        customer_email=current_user.email,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/dashboard?upgraded=true",
        cancel_url=f"{settings.FRONTEND_URL}/billing",
        metadata={"user_id": str(current_user.id)},
    )
    return {"checkout_url": session.url}


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db: Session = Depends(get_db),
):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing not configured")
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(event["data"]["object"], db, stripe)

    elif event_type == "invoice.payment_succeeded":
        await _handle_invoice_paid(event["data"]["object"], db)

    return {"status": "ok"}


async def _handle_checkout_completed(session: dict, db: Session, stripe) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        return

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not session.get("subscription"):
        return

    line_items = stripe.checkout.Session.list_line_items(session["id"], limit=1)
    price_id = line_items.data[0].price.id if line_items.data else None

    user.stripe_customer_id = session["customer"]
    if settings.STRIPE_PRICE_ID_ENTERPRISE and price_id == settings.STRIPE_PRICE_ID_ENTERPRISE:
        user.plan = UserPlan.ENTERPRISE
    else:
        user.plan = UserPlan.PRO
    db.commit()

    try:
        await email_service.send_subscription_welcome(
            email=user.email,
            full_name=user.full_name,
            plan=user.plan.value,
            amount_cents=session.get("amount_total") or 0,
            currency=session.get("currency") or "usd",
        )
    except Exception as exc:
        logger.error("Failed to send welcome email to %s: %s", user.email, exc)


async def _handle_invoice_paid(invoice: dict, db: Session) -> None:
    stripe_customer_id = invoice.get("customer")
    if not stripe_customer_id:
        return

    user = db.query(User).filter(User.stripe_customer_id == stripe_customer_id).first()
    if not user:
        logger.warning("No user found for stripe_customer_id %s", stripe_customer_id)
        return

    try:
        await email_service.send_invoice_receipt(
            email=user.email,
            full_name=user.full_name,
            invoice_id=invoice.get("id", ""),
            amount_cents=invoice.get("amount_paid") or 0,
            currency=invoice.get("currency") or "usd",
            invoice_pdf_url=invoice.get("invoice_pdf") or "",
            plan=user.plan.value,
            analyses_used=user.analyses_used_this_month,
        )
    except Exception as exc:
        logger.error("Failed to send invoice receipt to %s: %s", user.email, exc)
