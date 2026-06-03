import firebase_admin
from firebase_admin import credentials, firestore
import requests, tempfile, os, time, subprocess, sys

# Init Firebase
cred = credentials.Certificate('serviceAccount.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

print('✅ Smart Print Agent running...')
print('Waiting for approved jobs...')

processed = set()

def print_file(file_url, file_name, job_data):
    try:
        print(f'📥 Downloading: {file_name}')
        response = requests.get(file_url, timeout=30)
        
        # Save to Downloads folder
        downloads = os.path.join(os.path.expanduser('~'), 'Downloads')
        save_path = os.path.join(downloads, file_name)
        
        with open(save_path, 'wb') as f:
            f.write(response.content)

        print(f'✅ Saved to: {save_path}')
        print(f'🖨️  Sending to printer...')
        print(f'   Copies : {job_data.get("copies", 1)}')
        print(f'   Mode   : {job_data.get("color", "bw")}')
        print(f'   Sides  : {job_data.get("sides", "single")}')

        # Windows — print using default app
        os.startfile(save_path, 'print')

        print(f'✅ Sent to printer!')
        return True

    except Exception as e:
        print(f'❌ Error printing: {e}')
        return False

def check_jobs():
    jobs = db.collection('jobs')\
             .where('status', '==', 'approved')\
             .stream()
    
    for job in jobs:
        job_id = job.id
        if job_id in processed:
            continue
            
        data = job.to_dict()
        file_url  = data.get('fileUrl', '')
        file_name = data.get('fileName', 'document')
        token     = data.get('token', '?')
        name      = data.get('name', '?')

        print(f'\n📋 New job #{token} from {name}')

        if file_url:
            success = print_file(file_url, file_name, data)
        else:
            print(f'⚠️  No file — manual print needed')
            success = True

        if success:
            processed.add(job_id)
            db.collection('jobs').document(job_id)\
              .update({'status': 'done'})
            print(f'✅ Job #{token} marked as done!')

# Main loop
while True:
    try:
        check_jobs()
    except Exception as e:
        print(f'Loop error: {e}')
    time.sleep(3)