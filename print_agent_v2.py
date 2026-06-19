import firebase_admin
from firebase_admin import credentials, firestore
import requests
import os
import time
import subprocess

# =========================
# FIREBASE SETUP
# =========================

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("✅ Smart Print Agent running...")
print("Waiting for approved jobs...")

processed = set()

# =========================
# ADOBE READER PATH
# =========================

ADOBE = r"C:\Program Files (x86)\Adobe\Reader 8.0\Reader\AcroRd32.exe"

# =========================
# PRINT FUNCTION
# =========================

def print_file(file_url, file_name, job_data):
    try:
        print(f"📥 Downloading: {file_name}")

        response = requests.get(file_url, timeout=30)
        response.raise_for_status()

        downloads = os.path.join(
            os.path.expanduser("~"),
            "Downloads"
        )

        os.makedirs(downloads, exist_ok=True)

        save_path = os.path.join(downloads, file_name)

        with open(save_path, "wb") as f:
            f.write(response.content)

        print(f"✅ Saved to: {save_path}")

        print("🖨️ Sending to printer...")
        print(f"   Copies : {job_data.get('copies', 1)}")
        print(f"   Mode   : {job_data.get('color', 'bw')}")
        print(f"   Sides  : {job_data.get('sides', 'single')}")

        # Check Adobe exists
        if not os.path.exists(ADOBE):
            raise Exception(
                f"Adobe Reader not found at:\n{ADOBE}"
            )

        # Print using Adobe Reader (hidden/minimized)
        subprocess.Popen(
            [
                ADOBE,
                "/h",
                "/t",
                save_path
            ],
            creationflags=subprocess.CREATE_NO_WINDOW
        )

        time.sleep(5)

        print("✅ Print command sent!")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


# =========================
# CHECK APPROVED JOBS
# =========================

def check_jobs():

    jobs = (
        db.collection("jobs")
        .where("status", "==", "approved")
        .stream()
    )

    for job in jobs:

        job_id = job.id

        # Prevent duplicate processing
        if job_id in processed:
            continue

        processed.add(job_id)

        data = job.to_dict()

        file_url = data.get("fileUrl", "")
        file_name = data.get("fileName", "document.pdf")
        token = data.get("token", "?")
        name = data.get("name", "?")

        print(f"\n📋 New job #{token} from {name}")

        if not file_url:
            print("⚠️ No file URL")

            db.collection("jobs").document(job_id).update({
                "status": "error"
            })

            continue

        success = print_file(
            file_url,
            file_name,
            data
        )

        if success:

            db.collection("jobs").document(job_id).update({
                "status": "done"
            })

            print(f"✅ Job #{token} done!")

        else:

            db.collection("jobs").document(job_id).update({
                "status": "error"
            })

            print(f"❌ Job #{token} failed!")


# =========================
# MAIN LOOP
# =========================

while True:
    try:
        check_jobs()

    except Exception as e:
        print(f"❌ Agent Error: {e}")

    time.sleep(3)