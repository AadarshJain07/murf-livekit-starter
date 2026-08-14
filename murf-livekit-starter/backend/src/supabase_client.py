"""Bridge Supabase Client for Revora Backend.

Routes all database queries through Revora's secure server-side bridge
endpoint (`/api/public/db`) with connection pooling and fast timeouts.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

logger = logging.getLogger("revora.supabase_bridge")

# Load environment variables
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env.local")
load_dotenv(_backend_dir / ".env")

_root_dir = _backend_dir.parent
load_dotenv(_root_dir / ".env.local")
load_dotenv(_root_dir / ".env")


@dataclass
class APIResponse:
    data: list[dict[str, Any]] | None = None
    error: Any = None


class TableQueryBuilder:
    def __init__(self, table_name: str, client: "SupabaseBridgeClient") -> None:
        self.table_name = table_name
        self.client = client
        self.op: str = "select"
        self.select_columns: str = "*"
        self.values: Any = None
        self.on_conflict: Optional[str] = None
        self.filters: list[dict[str, Any]] = []
        self.order_spec: Optional[dict[str, Any]] = None
        self.limit_val: Optional[int] = None

    def select(self, columns: str = "*") -> "TableQueryBuilder":
        self.op = "select"
        self.select_columns = columns
        return self

    def insert(self, values: Any) -> "TableQueryBuilder":
        self.op = "insert"
        self.values = values
        return self

    def upsert(
        self, values: Any, on_conflict: Optional[str] = None
    ) -> "TableQueryBuilder":
        self.op = "upsert"
        self.values = values
        self.on_conflict = on_conflict
        return self

    def update(self, values: Any) -> "TableQueryBuilder":
        self.op = "update"
        self.values = values
        return self

    def eq(self, column: str, value: Any) -> "TableQueryBuilder":
        self.filters.append({"type": "eq", "col": column, "val": value})
        return self

    def is_(self, column: str, value: Any) -> "TableQueryBuilder":
        val = None if value in (None, "null", "NULL") else value
        self.filters.append({"type": "is", "col": column, "val": val})
        return self

    def order(
        self, column: str, desc: bool = False, ascending: Optional[bool] = None
    ) -> "TableQueryBuilder":
        if ascending is not None:
            is_asc = ascending
        else:
            is_asc = not desc
        self.order_spec = {"col": column, "ascending": is_asc}
        return self

    def limit(self, count: int) -> "TableQueryBuilder":
        self.limit_val = count
        return self

    def execute(self) -> APIResponse:
        return self.client.execute_query(self)


class SupabaseBridgeClient:
    def __init__(self, api_url: str, api_key: str) -> None:
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.endpoint = f"{self.api_url}/api/public/db"
        
        # Setup persistent connection session with retry & keepalive
        self.session = requests.Session()
        retries = Retry(total=2, backoff_factor=0.2, status_forcelist=[502, 503, 504])
        adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=retries)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

    def table(self, name: str) -> TableQueryBuilder:
        return TableQueryBuilder(name, self)

    def execute_query(self, builder: TableQueryBuilder) -> APIResponse:
        payload: dict[str, Any] = {
            "table": builder.table_name,
            "op": builder.op,
        }
        if builder.op in ("insert", "update", "upsert") and builder.values is not None:
            payload["values"] = builder.values
        if builder.on_conflict:
            payload["on_conflict"] = builder.on_conflict
        if builder.filters:
            payload["filters"] = builder.filters
        if builder.order_spec:
            payload["order"] = builder.order_spec
        if builder.limit_val is not None:
            payload["limit"] = builder.limit_val

        headers = {
            "x-revora-key": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            res = self.session.post(
                self.endpoint, headers=headers, json=payload, timeout=5.0
            )
            if res.status_code == 200:
                result = res.json()
                return APIResponse(data=result.get("data", []))
            else:
                logger.error("Bridge API error [%d]: %s", res.status_code, res.text)
                return APIResponse(data=None, error=res.text)
        except Exception as e:
            logger.error("Bridge API request failed: %s", e)
            return APIResponse(data=None, error=str(e))


_client: Optional[SupabaseBridgeClient] = None


def get_supabase() -> SupabaseBridgeClient:
    """Return a singleton Bridge Supabase Client instance."""
    global _client
    if _client is not None:
        return _client

    api_url = (
        os.getenv("REVORA_API_URL")
        or "http://localhost:3000"
    )
    api_key = (
        os.getenv("REVORA_API_KEY")
        or "a3f91c7e2b84d0169c5a73f0e18b42d7c6a91e35b08f24c79d1e6f3a52b80c14"
    )

    _client = SupabaseBridgeClient(api_url, api_key)
    return _client
