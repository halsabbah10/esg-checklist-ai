import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

from jinja2 import Template

from ..config import get_email_config, get_settings

logger = logging.getLogger(__name__)

# Get centralized email configuration
settings = get_settings()
email_config = get_email_config()


class EmailService:
    """Enhanced email service for notifications with centralized configuration"""

    def __init__(self):
        self.smtp_server = email_config["smtp_server"]
        self.smtp_port = email_config["smtp_port"]
        self.username = email_config["smtp_username"]
        self.password = email_config["smtp_password"]
        self.from_email = email_config["from_email"]
        self.use_tls = email_config["use_tls"]
        self.use_ssl = email_config["use_ssl"]
        self.enabled = email_config["enabled"]

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ) -> bool:
        """Send email notification"""
        try:
            if not self.username or not self.password:
                logger.warning("Email credentials not configured, skipping email")
                return False

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email or "noreply@esg.local"
            msg["To"] = ", ".join(to_emails)

            # Add text version
            text_part = MIMEText(body, "plain")
            msg.attach(text_part)

            # Add HTML version if provided
            if html_body:
                html_part = MIMEText(html_body, "html")
                msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_emails}")
            return True

        except Exception as e:
            logger.exception(f"Failed to send email: {e}")
            return False

    def send_ai_score_notification(
        self,
        user_email: str,
        filename: str,
        score: float,
        feedback: str,
        checklist_title: str,
    ) -> bool:
        """Send AI scoring notification"""

        template_text = """
ESG Checklist AI - Analysis Complete

Hello,

Your uploaded file "{{ filename }}" for checklist "{{ checklist_title }}" has been analyzed.

ESG Compliance Score: {{ score }}/1.0 ({{ score_percentage }}%)

Analysis Summary:
{{ feedback }}

{% if score >= 0.8 %}
✅ Excellent ESG compliance detected!
{% elif score >= 0.6 %}
⚠️ Good ESG compliance with room for improvement.
{% else %}
❌ Low ESG compliance - review recommended.
{% endif %}

Best regards,
ESG Checklist AI System
        """

        template_html = """
<html>
<body>
    <h2>ESG Checklist AI - Analysis Complete</h2>

    <p>Hello,</p>

    <p>Your uploaded file "<strong>{{ filename }}</strong>" for checklist "<strong>{{ checklist_title }}</strong>" has been analyzed.</p>

    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3>ESG Compliance Score: {{ score }}/1.0 ({{ score_percentage }}%)</h3>

        {% if score >= 0.8 %}
        <div style="color: #28a745; font-weight: bold;">✅ Excellent ESG compliance detected!</div>
        {% elif score >= 0.6 %}
        <div style="color: #ffc107; font-weight: bold;">⚠️ Good ESG compliance with room for improvement.</div>
        {% else %}
        <div style="color: #dc3545; font-weight: bold;">❌ Low ESG compliance - review recommended.</div>
        {% endif %}
    </div>

    <h4>Analysis Summary:</h4>
    <p style="background-color: #f8f9fa; padding: 10px; border-left: 4px solid #007bff;">
        {{ feedback }}
    </p>

    <p>Best regards,<br>
    <strong>ESG Checklist AI System</strong></p>
</body>
</html>
        """

        # Render templates
        text_template = Template(template_text)
        html_template = Template(template_html)

        context = {
            "filename": filename,
            "checklist_title": checklist_title,
            "score": score,
            "score_percentage": round(score * 100, 1),
            "feedback": feedback,
        }

        text_body = text_template.render(**context)
        html_body = html_template.render(**context)

        subject = (
            f"ESG Analysis Complete - {filename} (Score: {round(score * 100, 1)}%)"
        )

        return self.send_email([user_email], subject, text_body, html_body)

    def send_checklist_completion_notification(
        self,
        admin_emails: List[str],
        user_name: str,
        checklist_title: str,
        completion_rate: float,
    ) -> bool:
        """Send checklist completion notification to admins"""

        subject = f"ESG Checklist Completed - {checklist_title}"

        body = f"""
ESG Checklist Completion Notification

User: {user_name}
Checklist: {checklist_title}
Completion Rate: {completion_rate:.1%}

A user has completed an ESG checklist. Please review the results in the admin dashboard.

ESG Checklist AI System
        """

        return self.send_email(admin_emails, subject, body)


# Global email service instance
email_service = EmailService()


def send_ai_score_notification(
    user_email: str, filename: str, score: float, feedback: str, checklist_title: str
) -> bool:
    """Convenience function for sending AI score notifications"""
    return email_service.send_ai_score_notification(
        user_email, filename, score, feedback, checklist_title
    )


def send_admin_notification(
    admin_emails: List[str],
    user_name: str,
    checklist_title: str,
    completion_rate: float,
) -> bool:
    """Convenience function for sending admin notifications"""
    return email_service.send_checklist_completion_notification(
        admin_emails, user_name, checklist_title, completion_rate
    )
