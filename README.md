# Smart Print 🖨️

A cloud-based print management system that enables students to submit print jobs remotely while allowing print shop operators to review, approve, and automatically print documents through a local print agent.

## Problem Statement

Traditional printing workflows are inefficient and time-consuming:

* Students must physically visit print shops.
* Documents are often shared through WhatsApp or pen drives.
* Print settings need to be communicated manually.
* Shop owners have to manage multiple orders without a centralized system.
* Long queues result in wasted time and operational inefficiencies.

Smart Print digitizes the entire process by providing an end-to-end cloud-based printing solution.

---

## Solution

Smart Print allows users to:

* Upload documents remotely.
* Configure print settings such as copies, color mode, and page preferences.
* Submit print requests through a web interface.
* Receive a unique token for tracking.

Print shop operators can:

* View incoming requests.
* Approve or reject jobs.
* Manage the printing queue efficiently.

A local Python Print Agent continuously monitors approved jobs and automatically sends them to the connected printer.

---

## System Architecture

Student
   │
   ▼
Web Application
(HTML/CSS/JavaScript)
   │
   ▼
Node.js + Express Backend
(Hosted on Railway)
   │
   ▼
Firebase Firestore
   │
   ├───────────────► Operator Dashboard
   │
   ▼
Python Print Agent
(Local Shop Computer)
   │
   ▼
Printer

---

## Tech Stack

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Node.js
* Express.js

### Database

* Firebase Firestore

### File Upload Handling

* Multer

### Cloud Hosting

* Railway

### Print Automation

* Python

### Printer Integration

* Windows Print APIs / Adobe Reader

---

## Key Features

### Student Portal

* Upload PDF, DOC, DOCX, and image files
* Configure print preferences
* Specify copies and page settings
* Submit print requests remotely
* Receive job tokens

URL :- https://smart-print-production.up.railway.app/student

### Operator Dashboard

* View all incoming jobs
* Approve or reject requests
* Monitor job queue
* Manage print workflow

URL :- https://smart-print-production.up.railway.app/operator

### Automated Printing

* Local Python Print Agent
* Automatic job detection
* File download and print execution
* Status synchronization with database

---

## Project Workflow

### 1. Student Submission

The student uploads a document and selects print preferences.

Upload File
↓
Select Print Settings
↓
Submit Request

### 2. Backend Processing

The Node.js backend:

* Receives the request
* Stores uploaded files
* Generates a unique token
* Saves job details in Firestore

### 3. Operator Approval

The operator reviews the request and approves it.

Pending
↓
Approved

### 4. Automatic Printing

The Python Print Agent:

* Detects approved jobs
* Downloads the file
* Sends it to the printer
* Updates job status

Approved
↓
Downloading
↓
Printing
↓
Completed

---

## Why This Architecture?

Web browsers cannot directly access printers due to security restrictions.

To overcome this limitation:

1. The web application handles job submission.
2. Firestore acts as a central communication layer.
3. A local Python service acts as a bridge between the cloud and the printer.

This architecture provides:

* Security
* Scalability
* Reliability
* Hardware independence

---

## Future Enhancements

* Real-time Firestore listeners
* Payment gateway integration
* Student order tracking
* Multi-printer support
* Queue prioritization
* Print cost estimation
* Authentication and user accounts
* Mobile application
* Print analytics dashboard

---

## Installation

### Clone Repository

```bash
git clone https://github.com/tanveersingh3/smart-print.git
cd smart-print
```

### Install Dependencies

```bash
npm install
```

### Configure Firebase Credentials

Create the required environment variables or Firebase service account configuration.

### Start Backend

```bash
npm start
```

### Start Print Agent

```bash
python print_agent.py
```

---

## Use Cases

* College Print Shops
* University Libraries
* Coaching Centers
* Corporate Printing Services
* Internet Cafés
* Shared Office Spaces

---

## Impact

Smart Print reduces waiting time, eliminates manual file transfer, streamlines print operations, and creates a seamless cloud-to-printer workflow for both customers and print shop operators.

---

## Team

Built as part of an effort to modernize traditional printing workflows through cloud technologies and automation.

---

## License

This project is intended for educational and demonstration purposes.
