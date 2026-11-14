<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Git workflow

- Jobhunt development uses the `jobhunt` branch. Commit and push Jobhunt improvements to `origin/jobhunt`, not directly to `main`.
- After each implementation, run the appropriate checks, commit the task-related changes, and push to the current branch’s GitHub remote. The user has authorized routine commits and pushes after every implementation.
- Never force-push or overwrite unrelated work.
