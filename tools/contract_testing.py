"""
API Contract Testing Setup
Provides contract testing between frontend and backend using Pact-like approach.
"""

import json
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional


@dataclass
class APIEndpoint:
    """Represents an API endpoint contract."""

    method: str
    path: str
    request_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None
    status_codes: Optional[List[int]] = None
    auth_required: bool = False
    description: str = ""

    def __post_init__(self):
        if self.status_codes is None:
            self.status_codes = [200]


class APIContractManager:
    """Manages API contracts for frontend-backend communication."""

    def __init__(self):
        self.contracts: Dict[str, APIEndpoint] = {}
        self.load_contracts()

    def load_contracts(self):
        """Load API contracts from configuration."""

        # Authentication endpoints
        self.contracts["auth_login"] = APIEndpoint(
            method="POST",
            path="/auth/login",
            request_schema={
                "type": "object",
                "properties": {
                    "username": {"type": "string", "minLength": 1},
                    "password": {"type": "string", "minLength": 1},
                },
                "required": ["username", "password"],
            },
            response_schema={
                "type": "object",
                "properties": {
                    "access_token": {"type": "string"},
                    "token_type": {"type": "string"},
                    "user": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "integer"},
                            "username": {"type": "string"},
                            "email": {"type": "string"},
                        },
                    },
                },
                "required": ["access_token", "token_type"],
            },
            status_codes=[200],
            description="User authentication endpoint",
        )

        self.contracts["auth_register"] = APIEndpoint(
            method="POST",
            path="/auth/register",
            request_schema={
                "type": "object",
                "properties": {
                    "username": {"type": "string", "minLength": 3},
                    "email": {"type": "string", "format": "email"},
                    "password": {"type": "string", "minLength": 8},
                    "full_name": {"type": "string"},
                },
                "required": ["username", "email", "password"],
            },
            response_schema={
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "username": {"type": "string"},
                    "email": {"type": "string"},
                    "full_name": {"type": "string"},
                },
                "required": ["id", "username", "email"],
            },
            status_codes=[201],
            description="User registration endpoint",
        )

        # File management endpoints
        self.contracts["file_upload"] = APIEndpoint(
            method="POST",
            path="/files/upload",
            request_schema={
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
                "required": ["file"],
            },
            response_schema={
                "type": "object",
                "properties": {
                    "file_id": {"type": "string"},
                    "filename": {"type": "string"},
                    "size": {"type": "integer"},
                    "status": {"type": "string", "enum": ["uploaded", "processing", "completed"]},
                },
                "required": ["file_id", "filename", "size", "status"],
            },
            status_codes=[200, 201],
            auth_required=True,
            description="File upload endpoint",
        )

        self.contracts["file_list"] = APIEndpoint(
            method="GET",
            path="/files/",
            response_schema={
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "filename": {"type": "string"},
                                "size": {"type": "integer"},
                                "uploaded_at": {"type": "string", "format": "date-time"},
                                "status": {"type": "string"},
                            },
                        },
                    },
                    "total": {"type": "integer"},
                    "page": {"type": "integer"},
                    "per_page": {"type": "integer"},
                },
                "required": ["items", "total"],
            },
            status_codes=[200],
            auth_required=True,
            description="List uploaded files",
        )

        # ESG Checklist endpoints
        self.contracts["checklist_create"] = APIEndpoint(
            method="POST",
            path="/checklists/",
            request_schema={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "minLength": 1},
                    "description": {"type": "string"},
                    "category": {
                        "type": "string",
                        "enum": ["environmental", "social", "governance", "comprehensive"],
                    },
                },
                "required": ["title", "category"],
            },
            response_schema={
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "category": {"type": "string"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"},
                },
                "required": ["id", "title", "category", "created_at"],
            },
            status_codes=[201],
            auth_required=True,
            description="Create new ESG checklist",
        )

        self.contracts["checklist_list"] = APIEndpoint(
            method="GET",
            path="/checklists/",
            response_schema={
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "integer"},
                                "title": {"type": "string"},
                                "category": {"type": "string"},
                                "created_at": {"type": "string", "format": "date-time"},
                                "status": {"type": "string"},
                            },
                        },
                    },
                    "total": {"type": "integer"},
                    "page": {"type": "integer"},
                    "per_page": {"type": "integer"},
                },
                "required": ["items", "total"],
            },
            status_codes=[200],
            auth_required=True,
            description="List ESG checklists",
        )

        # AI Analysis endpoints
        self.contracts["ai_analyze"] = APIEndpoint(
            method="POST",
            path="/ai/analyze",
            request_schema={
                "type": "object",
                "properties": {
                    "file_id": {"type": "string"},
                    "checklist_id": {"type": "integer"},
                    "analysis_type": {
                        "type": "string",
                        "enum": ["quick", "comprehensive", "detailed"],
                    },
                },
                "required": ["file_id", "checklist_id"],
            },
            response_schema={
                "type": "object",
                "properties": {
                    "analysis_id": {"type": "string"},
                    "score": {"type": "number", "minimum": 0, "maximum": 100},
                    "categories": {
                        "type": "object",
                        "properties": {
                            "environmental": {"type": "number", "minimum": 0, "maximum": 100},
                            "social": {"type": "number", "minimum": 0, "maximum": 100},
                            "governance": {"type": "number", "minimum": 0, "maximum": 100},
                        },
                    },
                    "recommendations": {"type": "array", "items": {"type": "string"}},
                    "status": {"type": "string", "enum": ["processing", "completed", "failed"]},
                },
                "required": ["analysis_id", "score", "status"],
            },
            status_codes=[200, 202],
            auth_required=True,
            description="Analyze document with AI",
        )

    def validate_request(self, endpoint_name: str, data: Dict[str, Any]) -> bool:
        """Validate request data against contract."""
        if endpoint_name not in self.contracts:
            return False

        contract = self.contracts[endpoint_name]
        if not contract.request_schema:
            return True

        # Basic validation (in production, use jsonschema library)
        return self._validate_schema(data, contract.request_schema)

    def validate_response(self, endpoint_name: str, data: Dict[str, Any], status_code: int) -> bool:
        """Validate response data against contract."""
        if endpoint_name not in self.contracts:
            return False

        contract = self.contracts[endpoint_name]

        # Check status code
        if contract.status_codes and status_code not in contract.status_codes:
            return False

        if not contract.response_schema:
            return True

        # Basic validation (in production, use jsonschema library)
        return self._validate_schema(data, contract.response_schema)

    def _validate_schema(self, data: Dict[str, Any], schema: Dict[str, Any]) -> bool:
        """Basic schema validation (simplified)."""
        if schema.get("type") == "object":
            if not isinstance(data, dict):
                return False

            required_fields = schema.get("required", [])
            for field in required_fields:
                if field not in data:
                    return False

            properties = schema.get("properties", {})
            for field, field_schema in properties.items():
                if field in data and not self._validate_field(data[field], field_schema):
                    return False

        return True

    def _validate_field(self, value: Any, field_schema: Dict[str, Any]) -> bool:
        """Validate individual field against schema."""
        field_type = field_schema.get("type")

        if field_type == "string":
            if not isinstance(value, str):
                return False
            min_length = field_schema.get("minLength")
            if min_length and len(value) < min_length:
                return False
        elif field_type == "integer":
            if not isinstance(value, int):
                return False
        elif field_type == "number":
            if not isinstance(value, (int, float)):
                return False
            minimum = field_schema.get("minimum")
            maximum = field_schema.get("maximum")
            if minimum is not None and value < minimum:
                return False
            if maximum is not None and value > maximum:
                return False
        elif field_type == "array":
            if not isinstance(value, list):
                return False
        elif field_type == "object":
            if not isinstance(value, dict):
                return False

        return True

    def export_contracts(self, output_path: str = "api_contracts.json"):
        """Export contracts to JSON file for frontend consumption."""
        contracts_data = {}
        for name, contract in self.contracts.items():
            contracts_data[name] = asdict(contract)

        with open(output_path, "w") as f:
            json.dump(contracts_data, f, indent=2)

    def generate_typescript_types(self, output_path: str = "api_types.ts"):
        """Generate TypeScript type definitions from contracts."""
        ts_content = """// Auto-generated API types from contracts
// Do not edit manually

"""

        for name, contract in self.contracts.items():
            if contract.request_schema:
                ts_content += f"export interface {self._to_pascal_case(name)}Request {{\n"
                ts_content += self._schema_to_ts_interface(contract.request_schema)
                ts_content += "}\n\n"

            if contract.response_schema:
                ts_content += f"export interface {self._to_pascal_case(name)}Response {{\n"
                ts_content += self._schema_to_ts_interface(contract.response_schema)
                ts_content += "}\n\n"

        with open(output_path, "w") as f:
            f.write(ts_content)

    def _to_pascal_case(self, snake_str: str) -> str:
        """Convert snake_case to PascalCase."""
        components = snake_str.split("_")
        return "".join(word.capitalize() for word in components)

    def _schema_to_ts_interface(self, schema: Dict[str, Any], indent: str = "  ") -> str:
        """Convert JSON schema to TypeScript interface content."""
        content = ""
        properties = schema.get("properties", {})
        required = schema.get("required", [])

        for prop_name, prop_schema in properties.items():
            optional_marker = "" if prop_name in required else "?"
            ts_type = self._json_type_to_ts_type(prop_schema)
            content += f"{indent}{prop_name}{optional_marker}: {ts_type};\n"

        return content

    def _json_type_to_ts_type(self, schema: Dict[str, Any]) -> str:
        """Convert JSON schema type to TypeScript type."""
        json_type = schema.get("type", "any")

        if json_type == "string":
            enum_values = schema.get("enum")
            if enum_values:
                return " | ".join(f'"{val}"' for val in enum_values)
            return "string"
        if json_type in ("integer", "number"):
            return "number"
        if json_type == "boolean":
            return "boolean"
        if json_type == "array":
            items_schema = schema.get("items", {"type": "any"})
            items_type = self._json_type_to_ts_type(items_schema)
            return f"{items_type}[]"
        if json_type == "object":
            # For nested objects, we'd need to recursively generate interfaces
            return "object"
        return "any"


# Example usage and testing functions
def test_contract_validation():
    """Test contract validation functionality."""
    manager = APIContractManager()

    # Test valid login request
    valid_login = {"username": "testuser", "password": "testpass"}
    assert manager.validate_request("auth_login", valid_login) is True

    # Test invalid login request (missing password)
    invalid_login = {"username": "testuser"}
    assert manager.validate_request("auth_login", invalid_login) is False

    # Test valid login response
    valid_response = {
        "access_token": "jwt_token_here",
        "token_type": "bearer",
        "user": {"id": 1, "username": "testuser", "email": "test@example.com"},
    }
    assert manager.validate_response("auth_login", valid_response, 200) is True


if __name__ == "__main__":
    # Initialize contract manager
    manager = APIContractManager()

    # Export contracts for frontend
    manager.export_contracts("frontend/src/contracts/api_contracts.json")

    # Generate TypeScript types
    manager.generate_typescript_types("frontend/src/types/api_types.ts")

    # Run validation tests
    test_contract_validation()
