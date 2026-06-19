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