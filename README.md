# SmartPrint 🖨️
### Smart Campus Print Queue System

A web-based print queue system that eliminates long waiting times and manual configuration errors at school, college, and coaching stationery shops. Students configure and submit print jobs remotely from their phone. The operator approves with one click. A Python agent running on the shop PC automatically downloads and prints the document — no manual steps needed.

---

## The Problem

Students at coaching centres and colleges waste **10–20 minutes** per visit at the print shop during peak times and exam season.

The traditional process:
- Student physically visits shop and joins queue
- Shares document via USB or WhatsApp
- Operator manually downloads the file
- Operator configures settings (B&W/colour, pages, copies) — often incorrectly
- Verbal back-and-forth causes wrong settings and costly reprints
- Student waits through all of this standing at the counter

---

## The Solution

SmartPrint moves the entire configuration step to the student — before they even leave their room.

The operator's only job is to click **Approve**. Everything else is automatic.

---

## How It Works

```
Student opens link on phone
        ↓
Uploads document + configures all settings
(B&W/colour, pages, copies, sides, page range)
        ↓
Submits job → gets token number + estimated wait time
        ↓
Operator sees job on dashboard in real time
(all settings already filled — nothing to configure)
        ↓
Operator clicks Approve ✓
        ↓
Python agent on shop PC detects approval in Firebase
        ↓
Agent downloads file automatically
        ↓
Agent sends to printer — no dialog, no clicks
        ↓
Student gets notified → collects printout
```

---

## Live Demo

| | URL |
|---|---|
| 🎓 Student page | https://smart-print-production.up.railway.app/student |
| 🖥️ Operator dashboard | https://smart-print-production.up.railway.app/operator |

---

## Features

### Student Page (mobile-first)
- Upload PDF, Word, JPG from any device
- Configure B&W / Full Colour / Mixed (select specific pages for colour)
- Set copies, sides, paper size, page range
- Images per sheet layout (1, 2, 4, 6, 9, 12 images per sheet)
- Urgent print option (moves to front of queue)
- UPI payment toggle
- Live queue status — jobs ahead + estimated wait time
- Token number displayed after submission

### Operator Dashboard (desktop)
- Real-time job queue — auto-refreshes every 5 seconds
- All print settings pre-filled by student — nothing to configure
- One-click Approve button
- Reject option with reason
- Live stats — pending, printing, done today, revenue
- Completed jobs history sidebar
- Live clock

### Print Agent (runs on shop PC)
- Lightweight Python script
- Runs silently in the background
- Watches Firebase for approved jobs every 3 seconds
- Downloads file automatically to shop PC
- Sends directly to printer — **no dialog, no clicks, fully automatic**
- Marks job as done in Firebase after printing
- Starts automatically on Windows boot

---

## Why Automatic Printing Needs a Local Agent

Browsers cannot send files directly to printers — this is a security restriction built into every browser that cannot be bypassed by any code. This is the same reason why every professional print management system (PaperCut, PrinterLogic, UniPrint) uses a local agent running on the shop PC.

The Python print agent is the piece that makes printing truly automatic. The browser handles the queue and approval UI. The agent handles the actual printing.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Student & Operator UI | HTML, CSS, Vanilla JavaScript |
| Backend API | Node.js + Express |
| Database | Firebase Firestore (real-time) |
| File Storage | Railway Persistent Volume |
| Hosting | Railway |
| Print Agent | Python 3 |

---

## Project Structure

```
smart-print/
├── public/
│   ├── student.html       # Student submission page (mobile-first)
│   └── operator.html      # Operator dashboard (desktop)
├── server.js              # Node.js backend API
├── print_agent.py         # Python print agent (runs on shop PC)
├── package.json
├── README.md
└── .gitignore
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/jobs | Submit a new print job with file |
| GET | /api/jobs | Get all pending jobs |
| PATCH | /api/jobs/:id/approve | Approve a job |
| PATCH | /api/jobs/:id/reject | Reject a job |
| PATCH | /api/jobs/:id/processing | Mark as processing (prevents reload) |

---

## Setup Guide

### 1. Backend — Deploy to Railway

```bash
git clone https://github.com/tanveersingh3/smart-print
cd smart-print
npm install
```

Add these environment variables in Railway dashboard:
```
GOOGLE_APPLICATION_CREDENTIALS_JSON = <paste full Firebase service account JSON>
RAILWAY_PUBLIC_DOMAIN = smart-print-production.up.railway.app
PORT = 8080
```

Push to GitHub — Railway auto-deploys on every push.

### 2. Print Agent — Setup on Shop PC

**Step 1** — Install Python from python.org (tick "Add to PATH")

**Step 2** — Install required libraries:
```bash
pip install firebase-admin requests
```

**Step 3** — Copy these two files to shop PC (e.g. C:\SmartPrint\):
- `print_agent.py`
- `serviceAccount.json`

**Step 4** — Run the agent:
```bash
python print_agent.py
```

**Step 5** — Keep it running in the background. Minimise the window.

### 3. Auto-start on Windows Boot

Create `start.bat` in `C:\SmartPrint\`:
```bat
@echo off
cd C:\SmartPrint
python print_agent.py
```

Move this file to `shell:startup` folder so it runs automatically every morning.

---

## Current Status

| Component | Status |
|---|---|
| Student submission page | ✅ Built and live |
| Operator dashboard | ✅ Built and live |
| Real-time job queue | ✅ Working across browsers |
| File upload and storage | ✅ Working (persistent volume) |
| Print agent | ✅ Built and tested locally |
| Shop PC deployment | 🔄 Testing at coaching centre this week |
| Real student testing | 🔄 Planned — 10 students over 3 days |

---

## Built By

**Team Loan Lelo**
POC built for OkCredit internship programme
