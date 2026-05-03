# SkillBridge ER Diagram

This ER diagram represents the revised SkillBridge data model.

- `users`, `exam_attempts`, `roadmaps`, and `remember_tokens` already exist in the current implementation.
- `resume_submissions`, `resume_suggestions`, `roadmap_phases`, `knowledge_resources`, and `roadmap_resources` are planned entities for the next version with React, mobile resume capture, OCR, and RAG support.

```mermaid
erDiagram
    USERS {
        int id PK
        string full_name
        string email UK
        string phone
        string password_hash
        string education
        string location
        int experience_years
        string goal
        datetime created_at
    }

    RESUME_SUBMISSIONS {
        int id PK
        int user_id FK
        string submission_mode
        string file_name
        string image_path
        text extracted_text
        text extracted_skills_json
        string ocr_status
        datetime created_at
    }

    EXAM_ATTEMPTS {
        int id PK
        int user_id FK
        int score
        string level
        text answers_json
        datetime created_at
    }

    ROADMAPS {
        int id PK
        int user_id FK
        int exam_attempt_id FK
        string headline
        text summary
        datetime created_at
    }

    ROADMAP_PHASES {
        int id PK
        int roadmap_id FK
        int phase_order
        string title
        string duration
        text actions_json
    }

    RESUME_SUGGESTIONS {
        int id PK
        int user_id FK
        int resume_submission_id FK
        string target_role
        text suggestions_json
        datetime created_at
    }

    REMEMBER_TOKENS {
        int id PK
        int user_id FK
        string token_hash UK
        datetime expires_at
        datetime created_at
    }

    KNOWLEDGE_RESOURCES {
        int id PK
        string title
        string provider
        string resource_type
        string url
        string domain_tag
        text content_summary
        datetime created_at
    }

    ROADMAP_RESOURCES {
        int id PK
        int roadmap_phase_id FK
        int knowledge_resource_id FK
        string why_recommended
        string focus_area
    }

    USERS ||--o{ RESUME_SUBMISSIONS : submits
    USERS ||--o{ EXAM_ATTEMPTS : takes
    USERS ||--o{ ROADMAPS : receives
    USERS ||--o{ RESUME_SUGGESTIONS : gets
    USERS ||--o{ REMEMBER_TOKENS : owns

    RESUME_SUBMISSIONS ||--o{ RESUME_SUGGESTIONS : analyzed_for
    EXAM_ATTEMPTS ||--o{ ROADMAPS : informs
    ROADMAPS ||--|{ ROADMAP_PHASES : contains
    ROADMAP_PHASES ||--o{ ROADMAP_RESOURCES : includes
    KNOWLEDGE_RESOURCES ||--o{ ROADMAP_RESOURCES : recommended_as
```

## Notes

- `submission_mode` in `RESUME_SUBMISSIONS` can be values such as `upload` or `camera_capture`.
- `ocr_status` helps track whether the image-based resume text extraction succeeded.
- `ROADMAPS` links to `EXAM_ATTEMPTS` so roadmap generation can be tied to the assessment result used.
- `ROADMAP_PHASES` and `ROADMAP_RESOURCES` make the RAG-based roadmap easier to model relationally than storing all phases as one JSON field.
- In the current codebase, some of this information is still stored in JSON fields inside `users` and `roadmaps`; this ER diagram reflects the cleaner revised design for the next version.
