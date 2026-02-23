# 📄 Document & AI Generator Setup

This guide explains how to configure the Content Engine for high-fidelity document parsing and AI generation.

## 🔑 1. Environment Configuration

Create a `.env` file in the root of the `Questerix-content-engine` folder:

```env
# Primary AI Provider
AI_PROVIDER=gemini # Options: gemini, openai

# API Keys
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here # Optional fallback

# Supabase (For direct database writes if needed)
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

## 📝 2. AI Prompt Engineering

The engine uses "System Instructions" found in `src/utils/prompts.py`. You can customize the "Personality" of the question generator here.

### Question Types Supported

- `multiple_choice`: Single correct answer with distractors.
- `mcq_multi`: Multiple correct answers.
- `text_input`: Numerical or short text match.
- `boolean`: True/False logic.
- `reorder_steps`: Sequencing tasks.

## 📑 3. Document Parsing Details

The engine uses a tiered parsing strategy:

1. **PDFs**: Uses `PyPDF2` (Standard) or `pdfplumber` (Legacy/Tables).
2. **Word**: Uses `python-docx` to preserve document structure.
3. **Images**: Uses `Pillow` for basic metadata, can be extended for OCR.

## 🧪 4. Local Testing Workflow

Before committing content to the production database:

1. Run a sample file through the pipeline.
2. Review the generated JSON for accuracy.
3. Check the `token_count` metadata to monitor your AI costs.
