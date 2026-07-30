#!/bin/bash
# scripts/backup_aws_to_gcp.sh
set -e

# Configuration
DB_HOST="rds-primary.verdad.local"
DB_USER="root"
DB_NAME="verdad_tickets"
GCS_BUCKET="verdad-tickets-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="/tmp/verdad_backup_${TIMESTAMP}.sql"

echo "Starting database dump from AWS RDS..."
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --single-transaction --quick --lock-tables=false "$DB_NAME" > "$BACKUP_FILE"

echo "Compressing backup file..."
gzip "$BACKUP_FILE"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "Uploading database backup to Google Cloud Storage (GCP)..."
gsutil cp "$COMPRESSED_FILE" "gs://${GCS_BUCKET}/db_backups/"

echo "Backup complete and uploaded to GCP. Cleaning up local temp files..."
rm "$COMPRESSED_FILE"
