# SkillBridge DFD Level 0

```mermaid
flowchart LR
    U[User] --> S[SkillBridge System]
    S --> U
    S --> KB[Knowledge Base]
    KB --> S
    S --> DB[(Database)]
    DB --> S
```
