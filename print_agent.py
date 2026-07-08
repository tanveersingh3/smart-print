import firebase_admin
from firebase_admin import credentials, firestore
import requests
import os
import time
import subprocess
import fitz

# =========================
# FIREBASE SETUP
# =========================

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("✅ Smart Print Agent V2 running...")
print("Waiting for approved jobs...")

processed = set()

# =========================
# PDF B&W CONVERTER
# =========================
ADOBE = r"C:\Program Files (x86)\Adobe\Reader 8.0\Reader\AcroRd32.exe"

def convert_to_bw(input_pdf, output_pdf):

    doc = fitz.open(input_pdf)
    new_doc = fitz.open()

    for page_num in range(len(doc)):

        page = doc.load_page(page_num)

        pix = page.get_pixmap(
            matrix=fitz.Matrix(2, 2),
            colorspace=fitz.csGRAY
        )

        img_pdf = fitz.open()

        rect = fitz.Rect(
            0,
            0,
            pix.width,
            pix.height
        )

        page_new = img_pdf.new_page(
            width=pix.width,
            height=pix.height
        )

        page_new.insert_image(
            rect,
            pixmap=pix
        )

        pdf_bytes = img_pdf.tobytes()

        temp_pdf = fitz.open(
            "pdf",
            pdf_bytes
        )

        new_doc.insert_pdf(temp_pdf)

    new_doc.save(output_pdf)

    doc.close()
    new_doc.close()


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

        color_mode = str(
            job_data.get("color", "color")
        ).lower()

        if color_mode == "bw":

            bw_path = save_path.replace(
                ".pdf",
                "_bw.pdf"
            )

            print("🎨 Converting PDF to B&W...")

            convert_to_bw(
                save_path,
                bw_path
            )

            save_path = bw_path

            print(
                f"✅ B&W PDF created: {save_path}"
            )

        print("🖨️ Sending to printer...")
        print(f"   Copies : {job_data.get('copies', 1)}")
        print(f"   Mode   : {job_data.get('color', 'bw')}")
        print(f"   Sides  : {job_data.get('sides', 'single')}")

        if not os.path.exists(ADOBE):
            raise Exception(
                f"Adobe Reader not found at:\n{ADOBE}"
            )

        copies = int(
            job_data.get(
                "copies",
                1
            )
        )

        for i in range(copies):

            print(
                f"🖨️ Printing copy {i + 1}/{copies}"
            )

            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = subprocess.SW_MINIMIZE

            subprocess.Popen(
                [
                    ADOBE,
                    "/h",
                    "/t",
                    save_path
                ],
                startupinfo=si
            )

            time.sleep(3)

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