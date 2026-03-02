# /extract-data
Usage: /extract-data <source> [--schema <fields>] [--format json|csv]
Extract structured data from unstructured text, files, or URLs using AI with schema validation.
## Steps
1. Identify the input type (text, file, URL)
2. For URLs: try JSON-LD/microdata extraction first, fall back to AI
3. For text/files: use AI extraction with the specified schema
4. Validate extracted data against the schema
5. Output in requested format (JSON default, CSV optional)
6. Flag low-confidence fields for human review
