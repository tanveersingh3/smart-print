# 🖨️ SmartPrint
### AI-Powered Smart Printing Platform for Modern Print Shops

SmartPrint is an intelligent print management platform that digitizes the entire printing workflow between students and print shops. Instead of standing in queues and repeatedly explaining print settings, users simply upload their documents, configure (or let AI configure) the print settings, and submit the job online. Merchants receive structured print requests through a real-time dashboard and can print documents automatically using the Smart Print Agent.

---

## 🚀 Problem Statement

Traditional print shops still rely on manual communication between customers and operators.

Customers must:
- Wait in long queues
- Explain print settings repeatedly
- Send documents through WhatsApp
- Face printing mistakes due to miscommunication

Merchants struggle with:
- Managing multiple print requests simultaneously
- Repeatedly asking customers about print preferences
- Manual document handling
- Increased waiting time during peak hours

SmartPrint solves these problems by creating a complete digital printing workflow.

---

# ✨ Key Features

## 📄 Smart Document Upload

- Upload PDF documents
- Upload PNG/JPG images
- Automatic file validation
- Secure cloud-based job submission

---

## 🖼 Intelligent Image Printing

Unlike traditional print portals, SmartPrint intelligently handles image files.

Features include:

- Automatic image detection
- Images per Sheet (1, 2, 4, 6, 8, etc.)
- Automatic image arrangement
- Automatic conversion into print-ready PDF
- Optimized paper utilization

---

## 🤖 AI Print Assistant

SmartPrint uses AI to simplify printing decisions.

### AI Print Recommendations

The AI analyzes uploaded documents and recommends:

- Color or Black & White
- Portrait or Landscape
- Duplex or Single-sided printing
- Suggested paper usage
- Printing explanation

---

### ⚡ Quick Print

One-click printing.

The AI automatically configures all print settings, allowing users to submit print jobs within seconds.

---

### 💬 Natural Language Printing

Users can simply type instructions such as:

> Print this assignment in black & white, double-sided with two copies.

SmartPrint automatically understands the request and configures the print settings.

---

### 📝 OCR (Optical Character Recognition)

Extracts text from uploaded images and scanned documents.

Useful for:

- Scanned notes
- Handwritten pages
- Image-based assignments

---

## 🌱 Eco Print Score

SmartPrint promotes sustainable printing by generating a dynamic Eco Print Score.

The score considers:

- Paper usage
- Duplex printing
- Color printing
- Number of copies
- Estimated environmental impact

The score updates instantly whenever the print settings change.

---

## 👀 Print Preview

Before submission, users can preview their documents to verify:

- Orientation
- Layout
- Page order
- Overall appearance

This significantly reduces printing mistakes.

---

## 🎫 Token-Based Job Queue

Every submitted print request receives a unique token.

Benefits:

- Easy tracking
- Organized queue management
- Faster customer handling

---

# 🖥 Operator Dashboard

The operator dashboard provides merchants with a centralized interface to manage incoming print requests.

Features include:

- Live print queue
- Approve / Reject jobs
- View uploaded documents
- View print settings
- Download files
- Job status management
- Real-time synchronization using Firebase

---

# 🖨 Smart Print Agent

The Smart Print Agent automates printing after operator approval.

Responsibilities:

- Downloads approved files
- Sends documents directly to the connected printer
- Eliminates repetitive manual downloading
- Reduces operator workload

---

# ☁ Cloud Backend

SmartPrint uses Firebase Firestore for real-time synchronization.

Stores:

- Student information
- Print settings
- Job status
- Queue information
- Tokens
- Merchant operations

---

# 🌐 Deployment

Frontend and backend are deployed using **Railway**, providing:

- Cloud hosting
- Public access
- Automatic deployments
- HTTPS support

---

# 🛠 Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express.js

### Database

- Firebase Firestore

### AI

- OpenRouter API
- Llama Models

### Printing

- Python
- Adobe Acrobat Automation

### Cloud

- Railway

---

# 📱 Workflow

```text
Student Uploads Document
          │
          ▼
AI Analyzes Document
          │
          ▼
Print Settings Generated
          │
          ▼
Eco Score Updated
          │
          ▼
Preview Generated
          │
          ▼
Print Job Submitted
          │
          ▼
Firebase Firestore
          │
          ▼
Operator Dashboard
          │
          ▼
Operator Approval
          │
          ▼
Smart Print Agent
          │
          ▼
Printer
```

---

# 🌍 Future Vision

The vision of SmartPrint is to evolve into a complete intelligent printing ecosystem. A dedicated mobile application will allow users to discover nearby print shops, compare prices, waiting times, live queue lengths, customer ratings, and available services before placing an order. AI will recommend the most suitable print shop based on distance and workload, while personalized printing profiles, cloud document storage, and university LMS integration will make printing seamless. For merchants, SmartPrint will provide AI-powered operational insights and business recommendations. Ultimately, SmartPrint aims to become the **Google Maps for Printing**, connecting users and print shops through one intelligent platform.

---

# 📈 Impact

SmartPrint helps:

### Students

- Faster print submission
- No queue confusion
- Reduced printing mistakes
- Better user experience

### Merchants

- Faster order processing
- Reduced manual work
- Organized job management
- Improved customer experience
- Higher operational efficiency

---

# 🔒 Security

- Firebase Authentication
- Secure Firestore Rules
- Server-side validation
- File validation before processing

---

# 👨‍💻 Authors

Developed as part of the **Future Founders Program by OKCredit**.

Built with ❤️ to modernize campus printing.