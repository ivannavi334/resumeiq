"""
Tests for /api/v1/billing/* endpoints (plans, checkout, Stripe webhooks).

All external calls (Stripe API, email service) are mocked so no real
network requests or charges occur.
"""
import json
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.models.user import User, UserPlan


# ---------------------------------------------------------------------------
# GET /api/v1/billing/plans
# ---------------------------------------------------------------------------

def test_get_plans_returns_three(client):
    response = client.get("/api/v1/billing/plans")
    assert response.status_code == 200
    plans = response.json()["plans"]
    assert len(plans) == 3


def test_get_plans_structure(client):
    plans = client.get("/api/v1/billing/plans").json()["plans"]
    ids = [p["id"] for p in plans]
    assert ids == ["free", "pro", "enterprise"]
    free = plans[0]
    assert free["price"] == 0
    assert free["limits"]["analyses_per_month"] == 3
    pro = plans[1]
    assert pro["price"] == 1900
    assert pro["limits"]["analyses_per_month"] == 50


# ---------------------------------------------------------------------------
# POST /api/v1/billing/create-checkout-session
# ---------------------------------------------------------------------------

def test_create_checkout_session_success(client, test_user, auth_headers):
    mock_session = MagicMock()
    mock_session.url = "https://checkout.stripe.com/pay/cs_test_abc123"

    with patch("stripe.checkout.Session.create", return_value=mock_session):
        response = client.post(
            "/api/v1/billing/create-checkout-session",
            params={"price_id": "price_pro_test"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["checkout_url"] == "https://checkout.stripe.com/pay/cs_test_abc123"


def test_create_checkout_session_unauthenticated(client):
    response = client.post(
        "/api/v1/billing/create-checkout-session",
        params={"price_id": "price_pro_test"},
    )
    assert response.status_code == 403


def test_create_checkout_session_billing_not_configured(client, test_user, auth_headers, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "")

    response = client.post(
        "/api/v1/billing/create-checkout-session",
        params={"price_id": "price_pro_test"},
        headers=auth_headers,
    )
    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# POST /api/v1/billing/webhook — checkout.session.completed
# ---------------------------------------------------------------------------

def test_webhook_checkout_completed_upgrades_user(client, test_user, db):
    user_id = str(test_user.id)

    mock_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_session_123",
                "customer": "cus_test_new_customer",
                "subscription": "sub_test_123",
                "amount_total": 1900,
                "currency": "usd",
                "metadata": {"user_id": user_id},
            }
        },
    }

    mock_line_items = MagicMock()
    mock_price = MagicMock()
    mock_price.price.id = "price_pro_test"
    mock_line_items.data = [mock_price]

    with patch("stripe.Webhook.construct_event", return_value=mock_event), \
         patch("stripe.checkout.Session.list_line_items", return_value=mock_line_items), \
         patch("app.services.email_service.send_subscription_welcome", new_callable=AsyncMock):

        response = client.post(
            "/api/v1/billing/webhook",
            content=b'{"fake": "payload"}',
            headers={
                "stripe-signature": "t=1234,v1=fakehmac",
                "content-type": "application/json",
            },
        )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

    db.refresh(test_user)
    assert test_user.plan == UserPlan.PRO
    assert test_user.stripe_customer_id == "cus_test_new_customer"


def test_webhook_checkout_completed_enterprise(client, test_user, db):
    user_id = str(test_user.id)

    mock_event = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_ent",
                "customer": "cus_enterprise",
                "subscription": "sub_ent",
                "amount_total": 9900,
                "currency": "usd",
                "metadata": {"user_id": user_id},
            }
        },
    }

    mock_line_items = MagicMock()
    mock_price = MagicMock()
    mock_price.price.id = "price_enterprise_test"
    mock_line_items.data = [mock_price]

    with patch("stripe.Webhook.construct_event", return_value=mock_event), \
         patch("stripe.checkout.Session.list_line_items", return_value=mock_line_items), \
         patch("app.services.email_service.send_subscription_welcome", new_callable=AsyncMock):

        response = client.post(
            "/api/v1/billing/webhook",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "t=1234,v1=fakehmac"},
        )

    assert response.status_code == 200
    db.refresh(test_user)
    assert test_user.plan == UserPlan.ENTERPRISE


# ---------------------------------------------------------------------------
# POST /api/v1/billing/webhook — invoice.payment_succeeded
# ---------------------------------------------------------------------------

def test_webhook_invoice_paid_sends_receipt(client, pro_user):
    mock_event = {
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "id": "in_test_invoice_123",
                "customer": "cus_test_customer",
                "amount_paid": 1900,
                "currency": "usd",
                "invoice_pdf": "https://stripe.com/invoice.pdf",
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event), \
         patch("app.services.email_service.send_invoice_receipt", new_callable=AsyncMock) as mock_receipt:

        response = client.post(
            "/api/v1/billing/webhook",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "t=1234,v1=fakehmac"},
        )

    assert response.status_code == 200
    mock_receipt.assert_called_once()
    call_kwargs = mock_receipt.call_args.kwargs
    assert call_kwargs["email"] == "prouser@example.com"
    assert call_kwargs["amount_cents"] == 1900


def test_webhook_invoice_paid_unknown_customer(client):
    """No user found for customer ID — should not raise, just log and return ok."""
    mock_event = {
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "customer": "cus_does_not_exist",
                "amount_paid": 0,
                "currency": "usd",
            }
        },
    }

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        response = client.post(
            "/api/v1/billing/webhook",
            content=b'{}',
            headers={"stripe-signature": "t=1234,v1=fakehmac"},
        )

    assert response.status_code == 200


# ---------------------------------------------------------------------------
# POST /api/v1/billing/webhook — invalid signature
# ---------------------------------------------------------------------------

def test_webhook_invalid_stripe_signature(client):
    import stripe

    with patch("stripe.Webhook.construct_event",
               side_effect=stripe.error.SignatureVerificationError("Invalid sig", "sig_header")):
        response = client.post(
            "/api/v1/billing/webhook",
            content=b'{"fake": "payload"}',
            headers={"stripe-signature": "invalid"},
        )

    assert response.status_code == 400
    assert "signature" in response.json()["detail"].lower()


def test_webhook_not_configured(client, monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "")

    response = client.post(
        "/api/v1/billing/webhook",
        content=b'{}',
        headers={"stripe-signature": "t=1,v1=x"},
    )
    assert response.status_code == 503
