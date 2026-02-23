# AI Content Engine

Python-based document processing and AI generation service for Questerix curriculum creation.

## Features

- 📄 **Document Parsing**: Extract text from PDF, DOCX, and images
- 🤖 **AI Generation**: Generate structured questions using Gemini Flash or GPT-4o-mini
- 🔒 **Secure**: API keys managed via environment variables
- 🚀 **Fast**: Async processing for large documents

## Setup

### Prerequisites

- Python 3.10+
- pip or uv (recommended)

### Installation

```bash
# Using uv (recommended for faster installs)
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Or using pip
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file:

```env
# AI Provider (gemini or openai)
AI_PROVIDER=gemini

# Gemini API Key (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API Key (optional, for fallback)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase (for direct integration)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Usage

### CLI Mode

```bash
# Extract text from a document
python -m content_engine extract lesson_plan.pdf --output extracted.txt

# Generate questions from text
python -m content_engine generate extracted.txt --skill-id <uuid> --difficulty easy:10,medium:20,hard:10 --output questions.json

# Full pipeline (extract + generate)
python -m content_engine pipeline lesson_plan.pdf --skill-id <uuid> --output questions.json
```

### Python API

```python
from content_engine import DocumentParser, QuestionGenerator

# Parse a document
parser = DocumentParser()
text = parser.parse("lesson_plan.pdf")

# Generate questions
generator = QuestionGenerator(model="gemini-1.5-flash")
questions = generator.generate(
    text=text,
    skill_id="skill-uuid",
    difficulty_distribution={"easy": 10, "medium": 20, "hard": 10}
)
```

## Architecture

```
content-engine/
├── src/
│   ├── parsers/          # Document extraction (PDF, DOCX, Image)
│   ├── generators/       # AI question generation
│   ├── validators/       # Schema validation (Pydantic)
│   └── utils/            # Helpers (prompts, token counting)
├── tests/
├── requirements.txt
└── README.md
```

## Integration with Admin Panel

The Admin Panel will call this service via:
1. **Browser-based extraction** (preferred): Uses pdfjs/mammoth in React, then sends text to AI via Edge Function
2. **Server-based extraction** (fallback): Uploads file to Supabase Storage, triggers this Python service

This README documents the standalone Python service. The primary integration path is browser-based for cost efficiency.
