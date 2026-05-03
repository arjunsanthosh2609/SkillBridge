# Job Imports

Place JSON files in this folder to ingest job-board requirements into the RAG knowledge base.

Supported format:

```json
[
  {
    "provider": "LinkedIn",
    "title": "Frontend Developer",
    "sourceUrl": "https://www.linkedin.com/jobs/view/example",
    "roleTarget": "frontend",
    "company": "Example Inc",
    "location": "Bengaluru",
    "summary": "Role summary copied from the public job description.",
    "skills": ["react", "typescript", "html", "css"],
    "tags": ["mid-level", "web", "product"]
  }
]
```

Recommended file names:

- `linkedin-jobs.json`
- `indeed-jobs.json`
- `naukri-jobs.json`

The ingestion pipeline reads these files at startup, so you can refresh the knowledge base by updating the JSON and restarting the app.
