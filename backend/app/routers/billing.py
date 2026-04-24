from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserPlan
from app.config import settings
from app.routers.deps import get_current_user

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
        success_url="http://localhost:5173/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url="http://localhost:5173/billing/cancel",
        metadata={"user_id": str(current_user.id)},
    )
    return {"checkout_url": session.url}


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Billing not configured")
    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                price_id = session.get("line_items", {})
                if session.get("subscription"):
                    user.stripe_customer_id = session["customer"]
                    if settings.STRIPE_PRICE_ID_ENTERPRISE and price_id == settings.STRIPE_PRICE_ID_ENTERPRISE:
                        user.plan = UserPlan.ENTERPRISE
                    else:
                        user.plan = UserPlan.PRO
                    db.commit()

    return {"status": "ok"}
