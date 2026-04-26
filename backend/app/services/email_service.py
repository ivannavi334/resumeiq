import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader

from app.config import settings

logger = logging.getLogger(__name__)

_template_dir = Path(__file__).parent.parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_template_dir)), autoescape=True)


async def _send(to: str, subject: str, html: str) -> None:
    if settings.ENVIRONMENT == "development":
        logger.info("[DEV EMAIL] To: %s | Subject: %s\n%.300s", to, subject, html)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent to %s: %s", to, subject)
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)


async def send_subscription_welcome(
    email: str,
    full_name: str | None,
    plan: str,
    amount_cents: int,
    currency: str,
) -> None:
    template = _jinja_env.get_template("subscription_welcome.html")
    html = template.render(
        name=full_name or email.split("@")[0],
        plan=plan.capitalize(),
        amount=f"{amount_cents / 100:.2f}",
        currency=currency.upper(),
        dashboard_url=f"{settings.FRONTEND_URL}/dashboard",
    )
    await _send(email, "Спасибо за подписку ResumeIQ!", html)


async def send_invoice_receipt(
    email: str,
    full_name: str | None,
    invoice_id: str,
    amount_cents: int,
    currency: str,
    invoice_pdf_url: str,
    plan: str,
    analyses_used: int,
) -> None:
    month_year = datetime.now().strftime("%B %Y")
    template = _jinja_env.get_template("invoice_receipt.html")
    html = template.render(
        name=full_name or email.split("@")[0],
        invoice_id=invoice_id,
        amount=f"{amount_cents / 100:.2f}",
        currency=currency.upper(),
        invoice_pdf_url=invoice_pdf_url,
        plan=plan.capitalize(),
        analyses_used=analyses_used,
        month_year=month_year,
        dashboard_url=f"{settings.FRONTEND_URL}/dashboard",
    )
    await _send(email, f"Ваш чек ResumeIQ — {month_year}", html)
