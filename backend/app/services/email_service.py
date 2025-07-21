"""
Email automation service for ESG checklist notifications and reporting
Integrates with existing export functionality to provide email delivery options
"""

import logging
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from jinja2 import Environment, FileSystemLoader

from ..config import get_settings

logger = logging.getLogger(__name__)


class EmailService:
    """Email service for ESG checklist automation notifications"""

    def __init__(self):
        self.settings = get_settings()
        
        # Initialize Jinja2 template environment
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        template_dir.mkdir(parents=True, exist_ok=True)
        
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=True
        )
        
        # Create default templates if they don't exist
        self._ensure_templates_exist()

    def _ensure_templates_exist(self):
        """Create default email templates if they don't exist"""
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        
        templates = {
            "incomplete_checklist.html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
        .highlight { background-color: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .incomplete-items { background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 15px 0; }
        .missing-items { background-color: #d1ecf1; padding: 15px; border-radius: 4px; margin: 15px 0; }
        ul { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>ESG Checklist Review Required</h2>
            <p><strong>File:</strong> {{ filename }}</p>
            <p><strong>Analysis Date:</strong> {{ analysis_date }}</p>
        </div>
        
        <div class="content">
            <p>Dear Audit Team,</p>
            
            <p>Your ESG checklist has been reviewed and requires attention. Please see the details below:</p>
            
            <div class="highlight">
                <strong>Completion Summary:</strong>
                <ul>
                    <li>Total Questions: {{ total_questions }}</li>
                    <li>Complete: {{ complete_count }}</li>
                    <li>Incomplete: {{ incomplete_count }}</li>
                    <li>Missing: {{ missing_count }}</li>
                    <li>Completion Rate: {{ completion_rate }}%</li>
                </ul>
            </div>
            
            {% if incomplete_items %}
            <div class="incomplete-items">
                <h3>Incomplete Items ({{ incomplete_items|length }})</h3>
                <p>The following questions need more detailed responses:</p>
                <ul>
                {% for item in incomplete_items[:10] %}
                    <li>{{ item.question }}</li>
                {% endfor %}
                {% if incomplete_items|length > 10 %}
                    <li><em>... and {{ incomplete_items|length - 10 }} more items</em></li>
                {% endif %}
                </ul>
            </div>
            {% endif %}
            
            {% if missing_items %}
            <div class="missing-items">
                <h3>Missing Information ({{ missing_items|length }})</h3>
                <p>The following questions require responses:</p>
                <ul>
                {% for item in missing_items[:10] %}
                    <li>{{ item.question }}</li>
                {% endfor %}
                {% if missing_items|length > 10 %}
                    <li><em>... and {{ missing_items|length - 10 }} more items</em></li>
                {% endif %}
                </ul>
            </div>
            {% endif %}
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Review the attached file and address the identified gaps</li>
                <li>Complete all missing responses</li>
                <li>Enhance incomplete responses with more detail</li>
                <li>Resubmit the updated checklist</li>
            </ul>
            
            <p>If you have any questions about these requirements, please contact the Advisory team.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the ESG Checklist AI system.</p>
            <p>Generated on {{ analysis_date }} | Internal Audit Department</p>
        </div>
    </div>
</body>
</html>
            """,
            
            "missing_submission.html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
        .alert { background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>ESG Checklist Submission Required</h2>
            <p><strong>Audit:</strong> {{ audit_name }}</p>
            <p><strong>Due Date:</strong> {{ due_date }}</p>
        </div>
        
        <div class="content">
            <p>Dear Advisory Team,</p>
            
            <div class="alert">
                <strong>Missing ESG Checklist Submission</strong><br>
                No ESG checklist has been received for the audit: <strong>{{ audit_name }}</strong>
            </div>
            
            <p><strong>Required Action:</strong></p>
            <ul>
                <li>Follow up with the audit team to request ESG checklist submission</li>
                <li>Provide the checklist template if needed</li>
                <li>Set a deadline for submission</li>
                <li>Monitor for compliance</li>
            </ul>
            
            <p>This notification will continue until the checklist is received and processed.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated notification from the ESG Checklist AI system.</p>
            <p>Generated on {{ current_date }} | Internal Audit Department</p>
        </div>
    </div>
</body>
</html>
            """,
            
            "summary_report.html": """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .content { background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .footer { margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; font-size: 12px; color: #666; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border-left: 4px solid #007bff; }
        .summary-card.complete { border-left-color: #28a745; }
        .summary-card.incomplete { border-left-color: #ffc107; }
        .summary-card.missing { border-left-color: #dc3545; }
        .summary-number { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .audit-list { margin: 20px 0; }
        .audit-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #6c757d; }
        .audit-item.complete { border-left-color: #28a745; }
        .audit-item.incomplete { border-left-color: #ffc107; }
        .audit-item.missing { border-left-color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ESG Checklist Review Summary</h1>
            <p><strong>Review Period:</strong> {{ review_period }}</p>
            <p><strong>Generated:</strong> {{ report_date }}</p>
        </div>
        
        <div class="content">
            <h2>Executive Summary</h2>
            
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-number">{{ total_audits }}</div>
                    <div>Total Audits</div>
                </div>
                <div class="summary-card complete">
                    <div class="summary-number">{{ complete_audits }}</div>
                    <div>Complete</div>
                </div>
                <div class="summary-card incomplete">
                    <div class="summary-number">{{ incomplete_audits }}</div>
                    <div>Incomplete</div>
                </div>
                <div class="summary-card missing">
                    <div class="summary-number">{{ missing_audits }}</div>
                    <div>Missing</div>
                </div>
            </div>
            
            <h3>Overall Completion Rate: {{ overall_completion_rate }}%</h3>
            
            {% if audit_details %}
            <h2>Audit Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Audit Name</th>
                        <th>Status</th>
                        <th>Completion Rate</th>
                        <th>Last Updated</th>
                        <th>Issues</th>
                    </tr>
                </thead>
                <tbody>
                {% for audit in audit_details %}
                    <tr>
                        <td>{{ audit.name }}</td>
                        <td>
                            <span class="status-badge {{ audit.status.lower() }}">
                                {{ audit.status }}
                            </span>
                        </td>
                        <td>{{ audit.completion_rate }}%</td>
                        <td>{{ audit.last_updated }}</td>
                        <td>{{ audit.issue_count }}</td>
                    </tr>
                {% endfor %}
                </tbody>
            </table>
            {% endif %}
            
            {% if recommendations %}
            <h2>Recommendations</h2>
            <ul>
            {% for recommendation in recommendations %}
                <li>{{ recommendation }}</li>
            {% endfor %}
            </ul>
            {% endif %}
        </div>
        
        <div class="footer">
            <p>This report was automatically generated by the ESG Checklist AI system.</p>
            <p>For questions or support, contact the Internal Audit Advisory team.</p>
        </div>
    </div>
</body>
</html>
            """
        }
        
        for filename, content in templates.items():
            template_path = template_dir / filename
            if not template_path.exists():
                template_path.write_text(content.strip())
                logger.info(f"Created email template: {filename}")

    def send_incomplete_checklist_notification(
        self,
        to_emails: List[str],
        analysis_result: Dict[str, Any],
        checklist_file_path: Optional[str] = None
    ) -> bool:
        """Send notification about incomplete checklist to audit team"""
        
        if not self.settings.enable_email_notifications:
            logger.info("Email notifications disabled, skipping incomplete checklist notification")
            return True
        
        try:
            # Extract completeness data
            completeness = analysis_result.get('metadata', {}).get('checklist_completeness', {})
            
            template_data = {
                'filename': analysis_result.get('file_info', {}).get('filename', 'Unknown'),
                'analysis_date': analysis_result.get('created_at', ''),
                'total_questions': completeness.get('total', 0),
                'complete_count': completeness.get('summary', {}).get('complete', 0),
                'incomplete_count': completeness.get('summary', {}).get('incomplete', 0),
                'missing_count': completeness.get('summary', {}).get('missing', 0),
                'completion_rate': round(completeness.get('completion_rate', 0) * 100, 1),
                'incomplete_items': [item for item in completeness.get('items', []) 
                                   if item.get('status', '').lower() == 'incomplete'],
                'missing_items': [item for item in completeness.get('items', []) 
                                if item.get('status', '').lower() == 'missing']
            }
            
            subject = f"ESG Checklist Review Required - {template_data['filename']}"
            
            template = self.jinja_env.get_template('incomplete_checklist.html')
            html_content = template.render(**template_data)
            
            # Create plain text version
            text_content = f"""
ESG Checklist Review Required

File: {template_data['filename']}
Analysis Date: {template_data['analysis_date']}

Completion Summary:
- Total Questions: {template_data['total_questions']}
- Complete: {template_data['complete_count']}
- Incomplete: {template_data['incomplete_count']}
- Missing: {template_data['missing_count']}
- Completion Rate: {template_data['completion_rate']}%

Please review the attached file and address the identified gaps.

This is an automated notification from the ESG Checklist AI system.
            """.strip()
            
            attachments = []
            if checklist_file_path and Path(checklist_file_path).exists():
                attachments.append(checklist_file_path)
            
            return self._send_email(
                to_emails=to_emails,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                attachments=attachments
            )
            
        except Exception as e:
            logger.error(f"Failed to send incomplete checklist notification: {e}")
            return False

    def send_missing_submission_alert(
        self,
        to_emails: List[str],
        audit_name: str,
        due_date: Optional[str] = None
    ) -> bool:
        """Send alert about missing ESG checklist submission to Advisory team"""
        
        if not self.settings.enable_email_notifications:
            logger.info("Email notifications disabled, skipping missing submission alert")
            return True
        
        try:
            from datetime import datetime
            
            template_data = {
                'audit_name': audit_name,
                'due_date': due_date or 'Not specified',
                'current_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            subject = f"Missing ESG Checklist - {audit_name}"
            
            template = self.jinja_env.get_template('missing_submission.html')
            html_content = template.render(**template_data)
            
            text_content = f"""
Missing ESG Checklist Submission

Audit: {audit_name}
Due Date: {template_data['due_date']}

No ESG checklist has been received for this audit. Please follow up with the audit team.

This is an automated notification from the ESG Checklist AI system.
Generated on {template_data['current_date']}
            """.strip()
            
            return self._send_email(
                to_emails=to_emails,
                subject=subject,
                text_content=text_content,
                html_content=html_content
            )
            
        except Exception as e:
            logger.error(f"Failed to send missing submission alert: {e}")
            return False

    def send_summary_report(
        self,
        to_emails: List[str],
        summary_data: Dict[str, Any],
        attachments: Optional[List[str]] = None
    ) -> bool:
        """Send comprehensive summary report to stakeholders"""
        
        if not self.settings.enable_email_notifications:
            logger.info("Email notifications disabled, skipping summary report")
            return True
        
        try:
            from datetime import datetime
            
            template_data = {
                'review_period': summary_data.get('review_period', 'Current'),
                'report_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'total_audits': summary_data.get('total_audits', 0),
                'complete_audits': summary_data.get('complete_audits', 0),
                'incomplete_audits': summary_data.get('incomplete_audits', 0),
                'missing_audits': summary_data.get('missing_audits', 0),
                'overall_completion_rate': summary_data.get('overall_completion_rate', 0),
                'audit_details': summary_data.get('audit_details', []),
                'recommendations': summary_data.get('recommendations', [])
            }
            
            subject = f"ESG Checklist Summary Report - {template_data['review_period']}"
            
            template = self.jinja_env.get_template('summary_report.html')
            html_content = template.render(**template_data)
            
            text_content = f"""
ESG Checklist Summary Report

Review Period: {template_data['review_period']}
Generated: {template_data['report_date']}

Summary:
- Total Audits: {template_data['total_audits']}
- Complete: {template_data['complete_audits']}
- Incomplete: {template_data['incomplete_audits']}
- Missing: {template_data['missing_audits']}
- Overall Completion Rate: {template_data['overall_completion_rate']}%

This is an automated report from the ESG Checklist AI system.
            """.strip()
            
            return self._send_email(
                to_emails=to_emails,
                subject=subject,
                text_content=text_content,
                html_content=html_content,
                attachments=attachments or []
            )
            
        except Exception as e:
            logger.error(f"Failed to send summary report: {e}")
            return False

    def _send_email(
        self,
        to_emails: List[str],
        subject: str,
        text_content: str,
        html_content: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """Send email using SMTP configuration"""
        
        if not self.settings.smtp_server or not self.settings.from_email:
            logger.error("SMTP configuration incomplete")
            return False
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.settings.from_email
            msg['To'] = ', '.join(to_emails)
            msg['Subject'] = subject
            
            # Add text content
            msg.attach(MIMEText(text_content, 'plain'))
            
            # Add HTML content if provided
            if html_content:
                msg.attach(MIMEText(html_content, 'html'))
            
            # Add attachments if provided
            if attachments:
                for attachment_path in attachments:
                    if Path(attachment_path).exists():
                        with open(attachment_path, 'rb') as f:
                            attach = MIMEApplication(f.read())
                            attach.add_header(
                                'Content-Disposition',
                                'attachment',
                                filename=Path(attachment_path).name
                            )
                            msg.attach(attach)
            
            # Send email
            with smtplib.SMTP(self.settings.smtp_server, self.settings.smtp_port) as server:
                if self.settings.smtp_use_tls:
                    server.starttls()
                elif self.settings.smtp_use_ssl:
                    server = smtplib.SMTP_SSL(self.settings.smtp_server, self.settings.smtp_port)
                
                if self.settings.smtp_username and self.settings.smtp_password:
                    server.login(self.settings.smtp_username, self.settings.smtp_password)
                
                server.send_message(msg)
            
            logger.info(f"Email sent successfully to {to_emails}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False


# Global email service instance
email_service = EmailService()


def get_email_service() -> EmailService:
    """Get email service instance"""
    return email_service