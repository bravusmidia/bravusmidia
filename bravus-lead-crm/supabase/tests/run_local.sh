#!/usr/bin/env bash
# Recria um banco local e roda migrations + testes (requer PostgreSQL 15+ local).
set -euo pipefail
DB=${DB:-crmtest}
cd "$(dirname "$0")/../.."
psql -q -c "drop database if exists $DB" -c "create database $DB"
for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql supabase/tests/01_rules_and_rls.sql; do
  psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"
done
