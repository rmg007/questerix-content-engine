# AI Curriculum Assistant - Deployment & Usage Guide

## 1. Setup Instructions (One-Time)

### A. Environment Configuration
The AI Generator runs client-side but requires a secure API key for Google Gemini.

1.  Get an API Key from [Google AI Studio](https://aistudio.google.com/).
2.  Open your local `.env` file in `admin-panel`.
3.  Add the key:
    ```env
    VITE_GEMINI_API_KEY=AIzaSy...YourKeyHere
    ```
4.  Restart the dev server (`npm run dev`) to load the new variable.

### B. Verify Dependencies
If you encounter build errors, ensure all packages are installed:
```bash
cd admin-panel
npm install
```
Specifically, we added: `pdfjs-dist`, `mammoth`, `@google/generative-ai`, `react-dropzone`.

---

## 2. Usage Workflow

1.  **Navigate:** Go into the **Questions** tab. Click the new **✨ AI Generator** button (top right).
2.  **Upload:** Drag & Drop your source PDF, Word Doc, or Text file.
3.  **Configure:** 
    *   **Select Skill:** Crucial! Choose the exact skill (e.g., "Integer Operations") so the CSV maps correctly.
    *   **Count/Difficulty:** Set your preferences.
4.  **Review Prompt:** 
    *   The system creates a default prompt.
    *   *Best Practice:* Add specific constraints like "No negative numbers" or "Use simple English".
5.  **Generate & Download:**
    *   Click "Generate". Wait ~10-20 seconds.
    *   Review the preview table.
    *   Click **Download CSV**.

---

## 3. Importing Requests (The Final Step)

1.  Open the downloaded CSV in Excel/Numbers.
2.  **Verify mapped columns:** Ensure `skill_title` matches exactly what is in your system.
3.  **Check Options:** For Multiple Choice, ensure the JSON string looks correct (e.g., `["A", "B"]`).
4.  **Upload to System:** Use the **Upload** button on the Questions page to bulk-insert these into the database. Ensure you select the correct domain/app context.

---

## 4. Troubleshooting

*   **"Missing API Key" Warning:** Check your `.env` file and restart the server.
*   **"PDF Parsing Failed":** Some PDFs are images only (scanned). These require OCR, which `pdfjs-dist` does not support. Use text-based PDFs.
*   **"Generation Failed":** If the file is too large (>100 pages), split it or copy-paste relevant text into a `.txt` file.
