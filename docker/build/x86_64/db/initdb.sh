#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c 'CREATE DATABASE "stash-box";' && \
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "stash-box" -c 'CREATE EXTENSION pg_trgm;'
