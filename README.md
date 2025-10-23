# Smart Vision Captioner Agent (Frontend Edition)

A **local-first web interface** for generating image captions using **Salesforce BLIP** (via the Hugging Face Inference API) and refining them into concise, professional insights with **OpenRouter-hosted LLMs**.  
Everything runs **entirely in your browser** — no backend, no telemetry, no data sharing.

---

## ✨ Features

- 🧊 **Glassmorphic single-page UI** optimized for desktop and mobile.
- 🖼️ **Image input options**
  - Upload your own image file.
  - Use preloaded sample images in `smart-vision-captioner/samples/`.
- 🧠 **Dual inference pipeline**
  1. **Salesforce BLIP** — generates an image caption.
  2. **OpenRouter LLM** — transforms that caption into insights and recommendations.
- 🔐 **Privacy-first:** API keys are stored locally (`localStorage`) and never leave your browser.
- ⚙️ **Dynamic feedback:** status messages, error hints, and model switchers.

---

## 📁 Repository Layout

smart-vision-captioner/
├── index.html # Main web page structure
├── styles.css # Dark, glassmorphic theme
├── script.js # Core logic and API handlers
└── samples/ # Optional user images

yaml
Copy code

---

## ⚙️ Prerequisites

Before running the app, make sure you have:

1. A **modern browser** (Chrome, Edge, Firefox, or Safari).
2. **API credentials:**
   - Hugging Face token with access to Salesforce BLIP models.
   - OpenRouter API key (e.g. `qwen/qwen2.5-7b-instruct:free`).
3. *(Optional)* Add sample JPGs to `smart-vision-captioner/samples/`:
   - `burnt_pcb.jpg`
   - `lab_equipment.jpg`
   - `classroom.jpg`

> If these images are missing, the UI shows placeholders and guidance to add them.

---

## 🚀 Getting Started

1. **Clone or download** the repository:
   ```bash
   git clone https://github.com/yourusername/smart-vision-captioner.git
   cd smart-vision-captioner
