# Questerix Curriculum Hierarchy

This document explains the data hierarchy used in Questerix, ordered by dependency (Foundation → Dependent).

## 1. Subjects (Foundation)

- **Definition:** The absolute root. Represents broad fields of knowledge.
- **Example:** Mathematics, English, Science.
- **Note:** These exist independently of any application.

## 2. Apps (Linked to Subjects)

- **Definition:** The context layer. Packages a Subject for a specific audience or product.
- **Example:** "Math Grade 10", "Grammar Master".
- **Dependency:** Must be linked to a Subject.

## 3. Domains (Linked to Apps)

- **Definition:** Major containers or chapters within an App.
- **Example:** "Algebra I", "Punctuation", "Geometry".
- **Dependency:** Must be linked to an App.

## 4. Skills (Linked to Domains)

- **Definition:** Granular, verifyable competencies. This is what students master.
- **Example:** "Solving Linear Equations", "Using Oxford Commas".
- **Dependency:** Must be linked to a Domain.

## 5. Questions (Linked to Skills)

- **Definition:** Individual assessment items / test questions.
- **Example:** "Solve for x...", "Fix this sentence...".
- **Dependency:** Must be linked to a Skill.

---

## Concrete Examples

### Example 1: English Grammar

- **Subject:** English
- **App:** Grammar Master
- **Domain:** Punctuation
- **Skill:** Using Oxford Commas
- **Question:** "Which of the following sentences correctly uses an Oxford comma?"

### Example 2: Math 5th Grade

- **Subject:** Mathematics
- **App:** Grade 5 Math
- **Domain:** Geometry
- **Skill:** Calculating Area of Rectangles
- **Question:** "Find the area of a rectangle with length 5cm and width 3cm."
