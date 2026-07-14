"""
Email notifications (BRD Section 11).

Sends real email via Gmail SMTP using the abitechqaengine@gmail.com
account. Configure the app password in the environment:

    SMTP_USERNAME=abitechqaengine@gmail.com
    SMTP_PASSWORD=<16-char Gmail App Password>

If SMTP_PASSWORD is not set (e.g. local dev), emails fall back to being
printed to the console and are always logged in the `email_log` table
either way.
"""
import os
import smtplib
import ssl
from email.mime.text import MIMEText

from sqlalchemy.orm import Session
import models

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "abitechqaengine@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USERNAME)


def _deliver(to_email: str, subject: str, body: str) -> None:
    # Always echo to console for debugging/local dev visibility.
    print(f"\n----- EMAIL -----\nFrom: {SMTP_FROM}\nTo: {to_email}\nSubject: {subject}\n\n{body}\n-----------------\n")

    if not SMTP_PASSWORD:
        # No app password configured -> skip real SMTP send (dev mode).
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to_email], msg.as_string())
    except Exception as exc:
        # Never crash the request because of an email failure -- log and move on.
        print(f"[email_utils] Failed to send email to {to_email}: {exc}")


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
