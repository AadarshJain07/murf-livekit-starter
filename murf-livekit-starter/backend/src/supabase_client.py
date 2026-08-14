"""Supabase client initialization for Revora backend.

Loads credentials exclusively from environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (with fallback to SUPABASE_KEY / SUPABASE_PUBLISHABLE_KEY)
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from supabase import Client, create_client

logger = logging.getLogger("revora.supabase")

# Load environment variables from backend .env.local / .env and workspace root
_backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(_backend_dir / ".env.local")
load_dotenv(_backend_dir / ".env")

_root_dir = _backend_dir.parent
load_dotenv(_root_dir / ".env.local")
load_dotenv(_root_dir / ".env")

_client: Optional[Client] = None


def get_supabase() -> Client:
    """Return a singleton Supabase client instance using environment credentials."""
    global _client
    if _client is not None:
        return _client

    url = (
        os.getenv("SUPABASE_URL")
        or os.getenv("VITE_SUPABASE_URL")
    )
    key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SERVICE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("SUPABASE_PUBLISHABLE_KEY")
        or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
    )

    if not url or not key:
        missing = []
        if not url:
            missing.append("SUPABASE_URL")
        if not key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        raise RuntimeError(
            f"Missing Supabase environment variable(s): {', '.join(missing)}. "
            "Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local or Railway environment."
        )

    _client = create_client(url, key)
    return _client
