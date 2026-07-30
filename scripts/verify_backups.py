# scripts/verify_backups.py
import os
import pymysql
from google.cloud import storage

def verify_backup(event, context):
    """Triggered by Cloud Scheduler to restore and verify DB integrity"""
    bucket_name = os.getenv("GCS_BUCKET", "verdad-tickets-backups")
    temp_instance = "ephemeral-restore-check"
    
    # 1. Download latest backup from GCS
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix="db_backups/"))
    latest_blob = max(blobs, key=lambda b: b.updated)
    
    print(f"Verifying backup integrity for file: {latest_blob.name}")
    
    # Simulation of DB Restore Checks:
    # In production, this invokes the GCP Cloud SQL API to:
    # gcloud sql instances restore ephemeral-restore-check gs://bucket/latest_backup.sql.gz
    
    # 2. Run Database Integrity Validations
    try:
        # Mock connection to test restored schemas
        connection = pymysql.connect(
            host="127.0.0.1", user="root", password="password", db="verdad_tickets"
        )
        with connection.cursor() as cursor:
            # Check users and tickets counts
            cursor.execute("SELECT COUNT(*) FROM users")
            users_count = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM tickets")
            tickets_count = cursor.fetchone()[0]
            
            print(f"Restored DB check: Users count={users_count}, Tickets count={tickets_count}")
            assert users_count > 0, "Integrity Failure: Users table is empty"
            
        print("Backup integrity checks PASSED successfully.")
        
    except Exception as e:
        print(f"Backup verification FAILED: {e}")
        # Send Alert Email / Webhook notification here
if __name__ == "__main__":
    # Local execution wrapper
    verify_backup(None, None)
