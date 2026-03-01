# /checkpoint
Usage: /checkpoint <name>
Saves current progress as a named checkpoint. Creates a git tag or stash for safe rollback points.
## Steps
1. Stage current changes
2. Create checkpoint commit or stash
3. Tag with the provided name
4. Confirm checkpoint creation
