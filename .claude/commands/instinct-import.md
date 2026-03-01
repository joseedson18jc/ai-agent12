# /instinct-import
Usage: /instinct-import <filepath>
Imports instincts from JSON with confidence-weighted deduplication.
## Steps
1. Read and validate the JSON file
2. Compare against existing instincts
3. Merge with confidence-weighted dedup
4. Resolve conflicts (keep higher confidence)
5. Report imported/merged/skipped counts
