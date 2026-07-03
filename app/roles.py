import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

from app.schemas import SelectedRole

ROLES_FILE = Path(__file__).resolve().parent / "data" / "roles.json"


class RoleSelectionConfig(BaseModel):
    allowMultiple: bool
    mergeInstruction: str


class RoleDefinition(BaseModel):
    id: str
    name: str
    category: str
    priority: int
    prompt: str


class RoleCatalog(BaseModel):
    roleSelection: RoleSelectionConfig
    roles: list[RoleDefinition]


class RoleQueryPayload(BaseModel):
    roleSelection: RoleSelectionConfig
    roles: list[RoleDefinition]


@lru_cache
def get_role_catalog() -> RoleCatalog:
    with ROLES_FILE.open(encoding="utf-8") as file:
        return RoleCatalog.model_validate(json.load(file))


def get_roles_by_id() -> dict[str, RoleDefinition]:
    catalog = get_role_catalog()
    return {role.id: role for role in catalog.roles}


def resolve_role_ids(role_ids: list[str]) -> tuple[list[RoleDefinition], list[str]]:
    if not role_ids:
        raise ValueError("At least one role id is required")

    catalog = get_role_catalog()
    unique_ids: list[str] = []
    seen: set[str] = set()
    for role_id in role_ids:
        if role_id in seen:
            continue
        seen.add(role_id)
        unique_ids.append(role_id)

    if not catalog.roleSelection.allowMultiple and len(unique_ids) > 1:
        raise ValueError("Only one role can be selected at a time")

    roles_by_id = get_roles_by_id()
    unknown_ids = [role_id for role_id in unique_ids if role_id not in roles_by_id]
    if unknown_ids:
        raise ValueError(f"Unknown role ids: {', '.join(unknown_ids)}")

    selected_roles = [roles_by_id[role_id] for role_id in unique_ids]
    selected_roles.sort(key=lambda role: role.priority, reverse=True)
    return selected_roles, unknown_ids


def build_role_query_payload(role_ids: list[str]) -> RoleQueryPayload:
    catalog = get_role_catalog()
    selected_roles, _ = resolve_role_ids(role_ids)
    return RoleQueryPayload(
        roleSelection=catalog.roleSelection,
        roles=selected_roles,
    )


def format_role_system_prompt(role_ids: list[str]) -> tuple[str, list[SelectedRole]]:
    payload = build_role_query_payload(role_ids)
    system_prompt = json.dumps(payload.model_dump(), indent=2)
    selected_roles = [
        SelectedRole(id=role.id, name=role.name, category=role.category)
        for role in payload.roles
    ]
    return system_prompt, selected_roles
