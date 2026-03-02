# Structured Data Extraction
Extract structured data from unstructured text using AI with schema validation.
## Instructions
- Define the expected output schema using Zod or JSON Schema before extraction
- Use askJSON() pattern: instruct AI to return data matching the schema
- Validate extracted data against the schema — reject/retry on validation failure
- Support multiple input formats: plain text, HTML (sanitize first), PDF, CSV
- For web scraping: try structured data first (JSON-LD, microdata) before falling back to AI
- Batch large documents: chunk text and extract from each chunk, then merge results
- Handle ambiguity: when AI is uncertain, flag fields for human review
- Common extraction targets: dates, amounts, names, addresses, line items, categories
