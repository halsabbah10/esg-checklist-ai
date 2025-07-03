# Audit System Integration

## Overview

The audit system provides comprehensive logging of all important actions in the ESG Checklist AI application. It tracks user actions, system events, and maintains a complete audit trail for compliance and monitoring.

## Fixed Issues

- ✅ Added missing `ip_address` and `user_agent` parameters to `AuditLog` model
- ✅ Fixed deprecated `datetime.utcnow()` usage with timezone-aware `datetime.now(timezone.utc)`
- ✅ Added comprehensive type annotations for better code safety
- ✅ Integrated audit logging with notification system

## Audit Functions

### Core Function

```python
log_action(db, user_id, action, resource_type, resource_id=None, details=None, ip_address=None, user_agent=None)
```

### Specialized Functions

- `log_file_action()` - For file upload, approval, rejection, comment actions
- `log_user_action()` - For login, logout, user management actions
- `log_checklist_action()` - For checklist creation, updates, deletions
- `log_notification_action()` - For notification sending and reading

## Usage Examples

### File Actions

```python
from app.utils.audit import log_file_action

# Log file upload
log_file_action(
    db=db,
    user_id=current_user.id,
    action="upload",
    file_id=file_record.id,
    details=f"Uploaded file: {filename}",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)

# Log status change
log_file_action(
    db=db,
    user_id=admin_user.id,
    action="approve",
    file_id=file_id,
    details="File approved after review",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)
```

### User Actions

```python
from app.utils.audit import log_user_action

# Log login
log_user_action(
    db=db,
    user_id=user.id,
    action="login",
    details="Successful login",
    ip_address=request.client.host,
    user_agent=request.headers.get("user-agent")
)
```

### Integration with FastAPI

```python
from fastapi import Request
from app.utils.audit import log_file_action

@router.post("/upload")
def upload_file(request: Request, ...):
    # ... file upload logic ...

    # Log the action
    log_file_action(
        db=db,
        user_id=current_user.id,
        action="upload",
        file_id=file_record.id,
        details=f"Uploaded {file.filename}",
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
```

## Integration with Notification System

The audit system is automatically integrated with the notification system. When notifications are sent, audit logs are automatically created:

```python
# This automatically creates an audit log entry
notify_user(
    db=db,
    user_id=target_user.id,
    title="File Approved",
    message="Your file has been approved",
    notification_type="success"
)
```

## Database Schema

The `AuditLog` model includes:

- `id` - Primary key
- `user_id` - User performing the action (nullable for system actions)
- `action` - Action type (e.g., "upload", "approve", "login")
- `resource_type` - Type of resource (e.g., "file", "user", "checklist")
- `resource_id` - ID of the affected resource
- `details` - Additional details (JSON string)
- `ip_address` - IP address of the user
- `user_agent` - User agent string
- `timestamp` - When the action occurred (timezone-aware)

## Indexes

- `idx_auditlog_user` - For querying by user
- `idx_auditlog_action` - For querying by action type
- `idx_auditlog_timestamp` - For time-based queries

## Best Practices

1. **Always include context**: Provide meaningful details about what happened
2. **Use specific action names**: "file_upload" not just "upload"
3. **Include IP and User Agent**: For security and troubleshooting
4. **Handle errors gracefully**: Don't let audit failures break main functionality
5. **Use specialized functions**: Use `log_file_action()` instead of generic `log_action()`

## Error Handling

All audit functions include error handling to prevent audit failures from breaking main application functionality:

```python
try:
    log_file_action(...)
except Exception as e:
    logger.warning(f"Audit logging failed: {e}")
    # Continue with main application logic
```

## Security Considerations

- Audit logs are immutable once created
- Include IP addresses for security monitoring
- Log both successful and failed actions
- Sensitive information should not be stored in details field
- Regular cleanup of old audit logs may be needed for storage management

## Compliance

The audit system supports compliance requirements by:

- Tracking all file operations (upload, review, approval, rejection)
- Recording user authentication events
- Maintaining timestamps with timezone information
- Preserving complete action history
- Supporting forensic analysis and reporting
