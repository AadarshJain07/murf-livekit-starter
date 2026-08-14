# Revora Cloud Sync

use this file https://drive.google.com/file/d/1dDQKuzI2YMhLJAODBuTeJ_GE_VYdIrGb/view?usp=sharing and Update the existing Revora project to completely remove the current local SQLite/database-based storage and migrate the backend to Supabase PostgreSQL.

Requirements

Remove the dependency on local Revora.db, SQLite connections, and any local JSON/database mirrors used for persistent application data.

Do not change the existing Revora functionality, UI, quest logic, XP system, mastery calculations, analytics, memory behavior, escalations, outbound calls, or Day 9 maths-specialist handoff unless required for the database migration.

Preserve all existing function names and their behavior wherever possible so the rest of the codebase does not break.

Supabase setup

Use the existing Supabase project/database.

Create/use appropriate Supabase tables for all data currently stored locally, including:

Quest sessions

Quest attempts

User memory

Escalations

Any other persistent analytics/state currently stored in SQLite or local JSON

Use proper PostgreSQL types, primary keys, timestamps, indexes, and relationships where appropriate.

Backend

Replace SQLite operations such as:

sqlite3.connect(...)


with Supabase operations using the official Supabase Python client.

Create a clean reusable Supabase database module, for example:

backend/src/supabase_client.py


Load credentials only from environment variables:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY


Never hardcode credentials.

Use the service-role key only on the backend. Never expose it to the frontend.

Migration

Preserve the existing data model and behavior. Map existing operations such as:

start_session()
record_attempt()
end_session()
get_state()
build_boss_plan()
save_user_memory()
get_user_memory()
create_escalation()


to Supabase-backed implementations.

The dashboard must continue showing real data, not hardcoded values.

Environment

Update .env.example with:

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=


Do not commit real credentials.

Make the backend work both locally and on Railway.

Railway compatibility

Update the API server so it listens on Railway's dynamically assigned PORT:

port = int(os.getenv("PORT", "8082"))


and binds to:

0.0.0.0


Make sure CORS allows the existing hosted Revora frontend.

Cleanup

After the migration:

Remove unused sqlite3 imports.

Remove local database initialization code.

Remove unnecessary Revora.db creation/access.

Remove obsolete quest_state.json persistence if Supabase now provides that state.

Remove any dead database code created only for SQLite.

Do not create a second parallel database system.

Important

Before changing anything, inspect the entire existing codebase and identify every place that reads or writes the local database/files.

Do not blindly rewrite files.

The final architecture should be:

Revora Frontend
      ↓
Railway Backend / API
      ↓
Supabase PostgreSQL


Verify the migration by testing:

Start a quest.

Record a quest answer.

Complete a quest.

Read quest progress.

Read/write user memory.

Create an escalation.

Verify analytics/dashboard values update.

Verify the Day 9 maths-specialist handoff still works.

Restart the backend and confirm the data is still available from Supabase.

Confirm no sensitive Supabase credentials are exposed to the frontend.

Do not modify unrelated functionality. The goal is a clean local-database → Supabase migration while keeping the existing Revora system working exactly as before.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ab9772d8-1d07-44e0-a360-3c56703c6d5c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
