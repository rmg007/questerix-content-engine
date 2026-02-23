---
name: content-generator
description: Logic for generating and validating AI questions
---

# Content Generator Skill

This skill provides instructions for generating high-quality educational questions.

## Question Quality Standard

1. **Clarity**: Questions must have a single, unambiguous answer.
2. **Pedagogy**: Distractors in MCQs must represent common student misconceptions.
3. **Difficulty Balance**: Easy (recall), Medium (application), Hard (synthesis).

## Generation Process

1. **Ingestion**: Parse the source document (PDF/Text).
2. **Extraction**: Identify key learning objectives (Skills).
3. **Drafting**: Generate 3-5 questions per skill.
4. **Validation**: Run the `validators/question_schema.py` against the output.

## Command Reference

```bash
python -m src pipeline <file> --skill-id <uuid> --difficulty easy:2,medium:2,hard:1
```
