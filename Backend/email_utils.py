"""
Email notifications (BRD Section 11).

Render's free tier blocks outbound SMTP (ports 587/465), so raw smtplib
sends silently fail there. Primary delivery is now via Resend's HTTP API
(sends over HTTPS:443, never blocked). SMTP is kept as a fallback for
environments where SMTP does work (e.g. local dev, other hosts).

Configure in your environment:

    RESEND_API_KEY=re_xxxxxxxxxxxxxxxx      (from resend.com -> API Keys)
    EMAIL_FROM=ABI-TECH QA-Engine <onboarding@resend.dev>
        (use onboarding@resend.dev until you verify your own domain on
        Resend; after verifying a domain you can send as
        no-reply@yourdomain.com instead)

If RESEND_API_KEY is not set, falls back to SMTP using SMTP_USERNAME /
SMTP_PASSWORD (Gmail app password) -- works locally, not on Render free tier.
"""
import os
import smtplib
import ssl
from email.mime.text import MIMEText

import httpx
from sqlalchemy.orm import Session
import models

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "ABI-TECH QA-Engine <onboarding@resend.dev>")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "abitechqaengine@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)


def _send_via_resend(to_email: str, subject: str, body: str) -> bool:
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            json={
                "from": EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
                "User-Agent": "ABI-TECH-QA-Engine/1.0",
            },
            timeout=15,
        )
        if resp.status_code in (200, 201, 202):
            print(f"[email_utils] Sent '{subject}' to {to_email} via Resend API")
            return True
        print(f"[email_utils] Resend API FAILED ({resp.status_code}): {resp.text}")
        return False
    except Exception as exc:
        print(f"[email_utils] Resend API FAILED: {type(exc).__name__}: {exc}")
        return False


def _send_via_smtp(to_email: str, subject: str, body: str) -> bool:
    if not SMTP_PASSWORD:
        print("[email_utils] SMTP_PASSWORD not set -- skipping SMTP send.")
        return False

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
            print(f"[email_utils] Sent '{subject}' to {to_email} via STARTTLS:{SMTP_PORT}")
            return True
    except Exception as exc:
        print(f"[email_utils] STARTTLS:{SMTP_PORT} failed ({type(exc).__name__}: {exc}) -- retrying SSL:465")

    try:
        with smtplib.SMTP_SSL(SMTP_HOST, 465, context=context, timeout=15) as server:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
            print(f"[email_utils] Sent '{subject}' to {to_email} via SSL:465")
            return True
    except Exception as exc:
        print(f"[email_utils] SSL:465 FAILED: {type(exc).__name__}: {exc}")
        return False


def _deliver(to_email: str, subject: str, body: str) -> None:
    # Always echo to console for debugging/local dev visibility.
    print(f"\n----- EMAIL -----\nTo: {to_email}\nSubject: {subject}\n\n{body}\n-----------------\n")

    if RESEND_API_KEY:
        if _send_via_resend(to_email, subject, body):
            return
        print("[email_utils] Resend failed, falling back to SMTP...")

    _send_via_smtp(to_email, subject, body)


def send_email(
    db: Session,
    to_email: str,
    subject: str,
    body: str,
    event_type: str,
    organization_id: int | None = None,
) -> None:
    _deliver(to_email, subject, body)
    log = models.EmailLog(
        organization_id=organization_id,
        to_email=to_email,
        subject=subject,
        body=body,
        event_type=event_type,
    )
    db.add(log)
    db.commit()


def registration_confirmation_email(db, org: "models.Organization"):
    from models import SUBSCRIPTION_PLANS
    plan = SUBSCRIPTION_PLANS[org.subscription_plan_code]
    body = (
        f"Thank you for registering with ABI-TECH QA-Engine.\n\n"
        f"Subscription Plan: {plan['label']}\n"
        f"Amount: ${plan['amount']}\n\n"
        f"Please complete your payment using the link below.\n"
        f"Payment Link: /payment/{org.id}\n\n"
        f"Registration ID: {org.id}\n\n"
        f"Your registration will be reviewed after payment.\n\nThank you."
    )
    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Registration Received", body,
               "registration_confirmation", org.id)


def payment_successful_email(
    db,
    org: "models.Organization",
    payment: "models.Payment | None" = None,
    username: str | None = None,
    temp_password: str | None = None,
    login_url: str = "/login",
):
    """Sent to the Company Admin (org.admin_email) right after payment
    succeeds. Includes the payment details plus their login username
    (their registered email) and a temporary password so they can log
    in as soon as ABI-TECH approves the registration."""
    from models import SUBSCRIPTION_PLANS
    plan = SUBSCRIPTION_PLANS.get(org.subscription_plan_code, {})

    lines = [
        f"Hi {org.admin_name},",
        "",
        f"We have received your payment for {org.name}. Your registration is now "
        f"waiting for ABI-TECH admin approval.",
        "",
        "Payment Details:",
        f"  Plan: {plan.get('label', org.subscription_plan_code)}",
        f"  Amount Paid: ${payment.amount if payment else org.subscription_amount}",
    ]
    if payment:
        lines += [
            f"  Payment Gateway: {payment.gateway}",
            f"  Transaction Reference: {payment.reference}",
            f"  Paid At: {payment.paid_at}",
        ]

    if username and temp_password:
        lines += [
            "",
            "Your Company Login Account:",
            f"  Login URL: {login_url}",
            f"  Username (Email): {username}",
            f"  Temporary Password: {temp_password}",
            "",
            "Note: You will only be able to log in once ABI-TECH admin approves "
            "your registration. Please change your password on first login.",
        ]

    lines += ["", "Thank you."]
    body = "\n".join(lines)

    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Payment Successful", body,
               "payment_successful", org.id)


def approval_email(db, org: "models.Organization", username: str, temp_password: str, login_url: str):
    body = (
        f"Congratulations!\n\nYour organization has been approved.\n\n"
        f"Login URL: {login_url}\n"
        f"Username: {username}\n"
        f"Temporary Password: {temp_password}\n\n"
        f"Please change your password during first login."
    )
    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Registration Approved", body,
               "registration_approved", org.id)


def rejection_email(db, org: "models.Organization", reason: str):
    body = f"Unfortunately,\n\nYour registration has been rejected.\n\nReason: {reason}"
    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Registration Rejected", body,
               "registration_rejected", org.id)


def subscription_expired_email(db, org: "models.Organization"):
    body = f"Hi {org.admin_name},\n\nYour ABI-TECH QA-Engine subscription for {org.name} has expired. Please renew to restore access."
    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Subscription Expired", body,
               "subscription_expired", org.id)


def renewal_reminder_email(db, org: "models.Organization"):
    body = f"Hi {org.admin_name},\n\nYour subscription for {org.name} expires in 30 days. Renew soon to avoid interruption."
    send_email(db, org.admin_email, "ABI-TECH QA-Engine — Subscription Renewal Reminder", body,
               "renewal_reminder", org.id)
