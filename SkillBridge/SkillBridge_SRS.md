# SOFTWARE REQUIREMENTS SPECIFICATION

## SkillBridge

AI Resume Screener, Skill Gap Analyzer, Resume Suggestion Engine, and Personalized Career Roadmap System

Prepared for: SkillBridge Major Project  
Date: 27 March 2026

## Contents

1. Introduction  
1.1 Purpose  
1.2 Product Scope  
1.3 References  

2. Overall Description  
2.1 Product Perspective  
2.2 Product Functions  
2.3 User Classes and Characteristics  
2.4 Operating Environment  
2.5 Design and Implementation Constraints  
2.6 Assumptions and Dependencies  
2.7 System Architecture Overview  
2.8 System Workflow  

3. External Interface Requirements  
3.1 User Interfaces  
3.2 Hardware Interfaces  
3.3 Software Interfaces  
3.4 Communication Interfaces  

4. System Features  
4.1 User Registration and Multi-Mode Resume Submission  
4.2 Resume Image Capture and OCR Processing  
4.3 Resume Parsing and Skill Extraction  
4.4 Authentication and Session Handling  
4.5 Profile Management  
4.6 Personalized Home Dashboard  
4.7 Goal-Based Skill Assessment Exam  
4.8 Exam Evaluation and Skill Level Classification  
4.9 RAG-Based Career Roadmap Generation  
4.10 Saved Roadmap Progress View  
4.11 Resume Suggestion Module  

5. Non-Functional Requirements  
5.1 Performance Requirements  
5.2 Security Requirements  
5.3 Usability Requirements  
5.4 Reliability Requirements  
5.5 Availability Requirements  
5.6 Scalability Requirements  
5.7 Maintainability Requirements  
5.8 Portability Requirements  
5.9 Accuracy Requirements  
5.10 Data Integrity Requirements  

## 1. Introduction

### 1.1 Purpose

The purpose of SkillBridge is to help learners understand their current skill profile, improve the quality of their resume, identify gaps relative to their target role, and follow a personalized path toward career readiness. The system accepts resumes through document upload or image capture, extracts and analyzes the content, evaluates the learner through a goal-based assessment, generates resume suggestions, and produces a personalized learning roadmap. This Software Requirements Specification (SRS) defines the functional and non-functional requirements, system architecture, interfaces, constraints, and expected behavior of the revised SkillBridge platform.

### 1.2 Product Scope

SkillBridge is a web and mobile-ready AI career guidance platform for learners targeting roles such as Frontend Developer, Backend Developer, Full Stack Developer, Data Analyst, Data Scientist, Machine Learning Engineer, Cloud Engineer, Cybersecurity Analyst, UI/UX Designer, and Product Manager. The system allows users to create an account, submit a resume either by file upload or by capturing an image of the resume, extract text and skills from the submitted content, attempt a short role-aligned exam, receive a RAG-based personalized roadmap, and obtain resume improvement suggestions.

The revised platform is planned to use a React-based frontend for the web application, a mobile application for handheld devices, a Node.js and Express backend for business logic and APIs, a database for persistent storage, OCR support for image-based resume input, and a Retrieval-Augmented Generation pipeline for grounding roadmap recommendations in curated learning resources. The system aims to bridge the gap between resume content, demonstrated skill level, and a user’s target role by combining document analysis, exam-based validation, grounded recommendations, and resume enhancement support.

### 1.3 References

- Project source code: SkillBridge application
- Node.js documentation
- Express.js documentation
- React documentation
- SQLite documentation
- OCR library or service documentation for resume image text extraction
- Vector database or retrieval system documentation for RAG
- Google AI Studio / Gemini API documentation
- PDF, DOCX, and text parsing library documentation

## 2. Overall Description

### 2.1 Product Perspective

SkillBridge is designed as a client-server application that can serve both web and mobile clients. The system evolves from a server-rendered web application into a modern frontend-driven architecture with React for the web interface and a future mobile app for handheld usage. The platform combines resume intake, text extraction, skill analysis, assessment, recommendation generation, and resume feedback into a unified learning support workflow.

Unlike a generic resume parser, SkillBridge links resume evidence with a selected career goal and an exam-based skill validation process. Unlike a static recommendation tool, the revised system uses Retrieval-Augmented Generation to ground personalised roadmap recommendations in a curated knowledge base of learning resources, role expectations, and skill development materials. The product also introduces a resume suggestion module to help users improve their resume quality for their desired role.

### 2.2 Product Functions

SkillBridge provides a set of integrated functions that work together to evaluate learner readiness, improve resume quality, and guide users toward their target role. The main product functions are described below.

#### 2.2.1 User Registration and Secure Account Access

The system allows users to create an account by entering personal, educational, and career-goal information. During registration, the user can choose how to provide a resume and then proceed with secure account creation. The system also supports login, logout, and persistent user access management. Passwords are stored securely, and only authenticated users can access personalized features such as profile management, exams, roadmaps, and resume suggestions.

#### 2.2.2 Multi-Mode Resume Submission

The system allows users to submit their resume in more than one way. A user may upload a resume document in a supported file format such as PDF, DOCX, or TXT, or the user may capture a resume image through a device camera in the mobile application. This flexible intake model improves accessibility and makes the platform easier to use across desktop and mobile environments.

#### 2.2.3 OCR-Based Resume Image Processing

When a user chooses the image-capture option, the system performs Optical Character Recognition (OCR) on the captured resume image. The OCR component extracts readable text from the image so that the same analysis pipeline used for uploaded documents can be applied. This function enables mobile-first usage and supports learners who may only have a printed resume or a photographed copy of their document.

#### 2.2.4 Resume Parsing and Content Analysis

After receiving resume content from either file upload or OCR output, the system extracts text and performs structured analysis. It identifies resume sections and relevant signals such as education, experience mentions, and project descriptions. This function transforms raw resume content into machine-usable data that can support skill extraction, exam alignment, roadmap generation, and resume improvement suggestions.

#### 2.2.5 Skill Extraction and Profiling

The system detects technical and role-relevant skills from the resume using text analysis, maintained skill maps, and synonym matching. Extracted skills are stored as part of the user’s profile and are used to estimate the learner’s current starting point. These extracted skills also influence trending skill recommendations, exam generation, roadmap content, and resume suggestion outputs.

#### 2.2.6 User Profile Management

The system allows users to view and update their profile information at any time. This includes personal details, educational background, location, experience, selected career goal, resume text, and stored skills. Maintaining an up-to-date profile ensures that the recommendations and assessments generated by the system remain relevant to the learner’s current career direction.

#### 2.2.7 Resume Suggestion Generation

The resume suggestion module reviews the submitted resume and provides actionable improvements. It can identify weak or missing role-aligned skills, unclear phrasing, insufficient project descriptions, and poor evidence of impact or outcomes. The purpose of this function is to help users refine their resume so that it better reflects their target role and presents their strengths more effectively.

#### 2.2.8 Trending Skill and Role Guidance

The system provides users with trending skills and role-relevant guidance based on their selected goal and current profile. This function helps users understand which capabilities are currently important in the chosen domain and which additional areas they may need to learn in order to stay aligned with industry expectations.

#### 2.2.9 Goal-Based Skill Assessment

The system generates a short assessment tailored to the user’s career goal and extracted resume skills. The assessment is designed to verify whether the skills listed in the resume are supported by actual understanding. This function moves the platform beyond simple keyword matching by adding a validation layer that measures demonstrated skill awareness.

#### 2.2.10 Automated Exam Evaluation and Skill-Level Classification

After the user completes the assessment, the system scores the responses automatically and calculates an overall percentage. Based on the score, the system assigns a skill classification such as Beginner, Intermediate, or Advanced. This classification becomes an important input for generating a personalized roadmap and for helping users understand their present readiness level.

#### 2.2.11 RAG-Based Personalized Roadmap Generation

One of the central functions of SkillBridge is the generation of a personalized improvement roadmap. The revised system uses Retrieval-Augmented Generation (RAG), where relevant learning materials, role expectations, and resource documents are first retrieved from a curated knowledge base. These retrieved documents are then used as grounding context for the generation layer, which produces a roadmap containing phases, actions, and recommended resources. This function improves recommendation quality by grounding the output in actual reference material rather than relying only on general model knowledge.

#### 2.2.12 Learning Resource Recommendation

The system links roadmap phases with study materials such as documentation, tutorials, videos, projects, and domain-specific learning references. These recommendations are selected to match the learner’s current skill level, identified gaps, and target role. This function helps transform the roadmap from a high-level plan into an actionable learning path.

#### 2.2.13 Progress Persistence and Retrieval

The system stores important user outputs such as extracted skills, exam attempts, roadmap data, and resume suggestion history. This allows returning users to continue from where they left off, review earlier outputs, and measure improvement over time. Persistent storage also supports a smoother experience across sessions and across web and mobile usage.

#### 2.2.14 Cross-Platform Access

The revised platform is intended to support both web and mobile experiences. Web users interact with the system through a React-based frontend, while mobile users interact through a dedicated mobile application with camera-enabled resume capture. This function ensures that the same core workflow can be accessed through different client environments without changing the fundamental user journey.

### 2.3 User Classes and Characteristics

| User Class | Characteristics | Usage |
| --- | --- | --- |
| Guest User | New visitor with basic web or mobile app usage knowledge | Can access signup and login screens |
| Registered Learner | Primary user, may use web or mobile app, submits resume and selects career goal | Can manage profile, submit resume, take exam, view dashboard, receive roadmap, and view resume suggestions |
| Returning Learner | Existing user with persistent account and saved progress | Can log in again, review prior data, resubmit resume, retake exam, reopen roadmap, and monitor improvement |

### 2.4 Operating Environment

The revised system operates across web and mobile environments.

- Web frontend: React-based application running in modern browsers
- Mobile frontend: planned mobile application running on Android and iOS devices
- Backend: Node.js with Express for APIs, authentication, upload handling, orchestration, and business logic
- Database: SQLite in the current prototype, with future migration potential to a production-scale relational database
- File and media handling: support for uploaded documents and captured resume images
- OCR processing: extracts text from image-based resumes
- Resume parsing: supports PDF, DOCX, TXT, and OCR-produced text
- Text analysis: skill extraction and resume signal analysis
- RAG stack: retrieval component plus LLM generation component for grounded roadmap generation
- AI layer: optional LLM services for trends, question generation, roadmap generation, and resume suggestions

### 2.5 Design and Implementation Constraints

- The current implementation is a prototype and does not yet include the full React frontend, mobile app, OCR pipeline, or RAG stack.
- Resume uploads are currently limited to PDF, DOCX, and TXT in the existing implementation, while image capture is part of the revised scope.
- OCR accuracy may depend on image quality, lighting, camera angle, and text clarity.
- RAG quality depends on the quality and maintenance of the curated resource base.
- AI-generated features depend on the availability and reliability of external model services.
- Skill extraction accuracy depends on the maintained skill map, synonym coverage, and parsing quality.
- The current SQLite-based storage is suitable for prototype and moderate-scale use but may require migration for large-scale deployment.

### 2.6 Assumptions and Dependencies

The system assumes that:

- Users provide accurate profile details and target goals.
- Uploaded resumes and captured images contain readable text.
- Mobile users grant camera permissions when choosing image capture.
- The knowledge base for the RAG module is curated and updated periodically.
- Users have access to a modern browser or supported mobile device.

The system depends on:

- Node.js runtime
- React frontend stack for web
- Mobile app stack for Android
- Required npm and mobile dependencies
- File storage for resumes and captured images
- Database availability
- Retrieval layer and indexed knowledge base for RAG
- LLM provider for grounded generation and suggestion output

### 2.7 System Architecture Overview

SkillBridge follows a layered architecture:

| Layer | Technologies Used | Responsibilities |
| --- | --- | --- |
| Presentation Layer | React web frontend, future mobile app | Renders signup, login, dashboard, profile, exam, roadmap, and resume suggestion screens |
| Application Layer | Node.js, Express, service modules | Handles APIs, validation, authentication, resume processing orchestration, exam scoring, roadmap assembly, and suggestion generation |
| Intelligence Layer | OCR service, skill extraction engine, retrieval engine, LLM services | Extracts text from images, analyzes resume content, retrieves relevant resource documents, and generates grounded recommendations |
| Data Layer | SQLite or future relational DB, file storage, vector index or retrieval store | Stores user data, resume text, exam attempts, roadmaps, resume suggestions, uploaded files, image references, and retrieval knowledge sources |

The revised architecture separates user interface concerns from backend services and introduces a retrieval layer for grounded roadmap generation. This architecture supports both browser-based and mobile-based usage while allowing future expansion.

### 2.8 System Workflow

The overall workflow is as follows:

1. A user signs up or logs in through the web or mobile client.
2. The user chooses how to submit the resume: document upload or image capture.
3. If an image is captured, the system runs OCR to extract readable text.
4. The system parses the resume text and extracts skills and related resume signals.
5. The user profile and extracted data are stored.
6. The dashboard shows extracted skills, trending skills, roadmap state, and resume suggestion access.
7. The user attempts a goal-based skill assessment exam.
8. The system scores the exam and classifies the user skill level.
9. The system retrieves relevant learning resources and role guidance from the knowledge base.
10. The RAG module generates a grounded personalized roadmap using retrieved context and user-specific signals.
11. The resume suggestion module generates feedback for improving the resume.
12. The user reviews the roadmap, learning resources, and resume suggestions through web or mobile interfaces.

## 3. External Interface Requirements

### 3.1 User Interfaces

The revised system provides responsive user interfaces across web and mobile channels. Major interfaces include:

- Signup and login screens
- Resume submission screen with two options: upload document or capture resume image
- Dashboard displaying extracted skills, trending skills, exam status, roadmap state, and resume suggestions
- Profile management screen for personal details and role selection
- Exam interface for answering multiple choice questions
- Roadmap interface for viewing phase-wise learning plans and grounded study materials
- Resume suggestion interface for displaying resume improvement feedback

The web interface is planned to be implemented using React. The mobile application will provide an optimized touch-friendly interface and native access to the device camera. The system must offer consistent navigation and a similar workflow across both platforms.

### 3.2 Hardware Interfaces

The system does not require specialized hardware beyond common user devices. Supported hardware contexts include:

- Desktop or laptop with keyboard, pointing device, and browser
- Smartphone or tablet with camera support for resume image capture
- Server environment capable of running Node.js and storing uploaded files and extracted data

### 3.3 Software Interfaces

The system interacts with the following software components:

- React frontend for the web application
- Mobile app frontend for Android and iOS
- Node.js runtime for server execution
- Express for API routing and middleware
- Database for persistent storage
- Upload handling middleware for file submissions
- OCR engine for image-to-text extraction
- PDF, DOCX, and TXT parsing libraries
- Skill extraction and text analysis libraries
- Retrieval engine and knowledge base index for RAG
- LLM provider for roadmap generation and resume suggestion generation

### 3.4 Communication Interfaces

The system follows client-server communication patterns:

- Web and mobile clients communicate with the backend using HTTP or HTTPS APIs
- Data exchange between clients and backend uses JSON for most requests and multipart form-data for file or image uploads
- Backend services communicate internally with OCR, retrieval, and generation modules
- The retrieval engine supplies context documents to the generation layer for grounded output
- Secure transmission should use HTTPS in production deployments

## 4. System Features

### 4.1 User Registration and Multi-Mode Resume Submission

#### 4.1.1 Description

This feature allows new users to create an account, select a career goal, and submit a resume using one of two methods: file upload or image capture. It validates required data, prevents duplicate registrations, and records the chosen resume submission method.

#### 4.1.2 Inputs

- Full name
- Email
- Phone number
- Password and confirm password
- Education
- Location
- Experience in years
- Career goal
- Resume submission mode
- Resume file or resume image

#### 4.1.3 Response Sequences

- User submits valid signup data with document upload -> system validates input -> file stored -> account created
- User submits valid signup data with image capture -> image stored -> OCR pipeline triggered -> account created
- User submits incomplete data -> system returns validation error
- User enters duplicate email -> system returns duplicate account error

#### 4.1.4 Functional Requirements

- REQ-1: The system shall allow account creation using a web or mobile interface.
- REQ-2: The system shall require all mandatory registration fields.
- REQ-3: The system shall allow the user to choose between resume upload and resume image capture.
- REQ-4: The system shall validate the selected submission mode before processing.
- REQ-5: The system shall reject duplicate email registrations.

#### 4.1.5 Outputs

- New user record
- Stored uploaded resume or stored captured resume image
- Submission mode record associated with the user

### 4.2 Resume Image Capture and OCR Processing

#### 4.2.1 Description

This feature enables mobile and camera-capable users to capture an image of a resume instead of uploading a file. The system processes the image using OCR to extract machine-readable text and prepares it for resume analysis.

#### 4.2.2 Inputs

- Resume image
- Image metadata

#### 4.2.3 Response Sequences

- User captures image -> image uploaded -> OCR service extracts text -> extracted text passed to parsing pipeline
- OCR fails or image quality is insufficient -> system returns a retry or quality warning message

#### 4.2.4 Functional Requirements

- REQ-1: The system shall accept resume images from supported clients.
- REQ-2: The system shall perform OCR on captured resume images.
- REQ-3: The system shall pass OCR text into the same analysis pipeline used for uploaded resumes.
- REQ-4: The system shall notify the user if image quality prevents reliable extraction.

#### 4.2.5 Outputs

- OCR-extracted resume text
- Image quality feedback when required

### 4.3 Resume Parsing and Skill Extraction

#### 4.3.1 Description

This feature reads resume content from uploaded files or OCR output, normalizes text, detects skills using a predefined skill map and synonym matching, and extracts additional resume signals such as education, experience mentions, and project statements.

#### 4.3.2 Inputs

- Uploaded resume file path or OCR text
- Original file name or image source metadata

#### 4.3.3 Response Sequences

- Resume content received -> text normalized -> skills and resume metadata extracted -> result stored
- Resume content unreadable -> analysis fails -> system returns processing error

#### 4.3.4 Functional Requirements

- REQ-1: The system shall extract text from PDF, DOCX, and TXT resumes.
- REQ-2: The system shall accept OCR-generated text as resume input.
- REQ-3: The system shall identify skills using maintained keyword and synonym mapping.
- REQ-4: The system shall store extracted resume text and extracted skills.
- REQ-5: The system shall extract additional resume signals useful for recommendation and suggestion modules.

#### 4.3.5 Outputs

- Normalized resume text
- Extracted skill list with confidence values
- Detected education, experience, and project snippets

### 4.4 Authentication and Session Handling

#### 4.4.1 Description

This feature manages secure login, logout, session handling, and persistent authentication support across clients. Passwords are stored in hashed form, and the system protects authenticated routes and user-specific data.

#### 4.4.2 Inputs

- Email
- Password
- Session token or cookie

#### 4.4.3 Response Sequences

- Valid login submitted -> credentials verified -> session created -> user redirected to dashboard
- Invalid login submitted -> system returns login error
- Returning user with valid persistent authentication data -> session restored
- User logs out -> session cleared -> user returned to login screen

#### 4.4.4 Functional Requirements

- REQ-1: The system shall authenticate users using email and password.
- REQ-2: The system shall hash passwords before storing them.
- REQ-3: The system shall protect authenticated routes from unauthorized access.
- REQ-4: The system shall support persistent authentication where applicable.
- REQ-5: The system shall clear authentication state on logout.

#### 4.4.5 Outputs

- Authenticated user session
- Protected access to user-specific features

### 4.5 Profile Management

#### 4.5.1 Description

This feature lets authenticated users view and update stored profile information, including personal details, experience, target role, resume text, and detected skills.

#### 4.5.2 Inputs

- Updated user profile fields
- Updated resume-related information

#### 4.5.3 Response Sequences

- User opens profile -> existing data loads
- User submits valid changes -> system validates -> profile updates saved
- User submits invalid data -> system returns validation feedback

#### 4.5.4 Functional Requirements

- REQ-1: The system shall display current stored profile information.
- REQ-2: The system shall allow authenticated users to update their profile.
- REQ-3: The system shall validate required profile fields before saving.
- REQ-4: The system shall prevent email conflicts across user records.

#### 4.5.5 Outputs

- Updated user profile
- Validation or success message

### 4.6 Personalized Home Dashboard

#### 4.6.1 Description

This feature presents a summary view combining extracted resume skills, trending skills, latest exam result, roadmap state, and resume suggestion availability. It acts as the main control center for the user journey.

#### 4.6.2 Inputs

- User goal
- Extracted resume skills
- Latest exam attempt
- Latest roadmap state
- Latest resume suggestion state

#### 4.6.3 Response Sequences

- User opens dashboard -> system loads user data -> skills, trends, exam status, roadmap access, and suggestion access are displayed

#### 4.6.4 Functional Requirements

- REQ-1: The system shall display resume-derived skills.
- REQ-2: The system shall show trending skills relevant to the target role.
- REQ-3: The system shall display latest exam status.
- REQ-4: The system shall indicate roadmap availability.
- REQ-5: The system shall indicate resume suggestion availability.

#### 4.6.5 Outputs

- Dashboard cards and summaries
- Access points to exam, roadmap, and resume suggestions

### 4.7 Goal-Based Skill Assessment Exam

#### 4.7.1 Description

This feature generates a short multiple-choice assessment tailored to the selected role and extracted skills. The exam is used to validate whether resume-listed skills align with demonstrated understanding.

#### 4.7.2 Inputs

- User goal
- Extracted resume skills

#### 4.7.3 Response Sequences

- User starts exam -> question set generated -> exam screen displayed
- Generation unavailable -> fallback question set supplied

#### 4.7.4 Functional Requirements

- REQ-1: The system shall generate a role-aware multiple choice exam.
- REQ-2: The system shall include a fixed number of questions per exam session.
- REQ-3: The system shall store the active question set until submission.
- REQ-4: The system shall support fallback exam generation if live AI generation is unavailable.

#### 4.7.5 Outputs

- Active exam question set
- Rendered exam interface

### 4.8 Exam Evaluation and Skill Level Classification

#### 4.8.1 Description

This feature scores submitted answers, computes a percentage score, classifies the learner’s level, and stores exam attempt history for future recommendation use.

#### 4.8.2 Inputs

- Submitted question responses
- Stored active question set

#### 4.8.3 Response Sequences

- User submits exam -> answers evaluated -> score computed -> level assigned -> result stored -> dashboard updated
- Missing question context -> user prompted to restart or reopen exam

#### 4.8.4 Functional Requirements

- REQ-1: The system shall score objective answers automatically.
- REQ-2: The system shall compute exam score as a percentage.
- REQ-3: The system shall classify users into skill-level categories.
- REQ-4: The system shall store exam attempt history for the user.

#### 4.8.5 Outputs

- Exam score
- Skill level classification
- Stored exam attempt record

### 4.9 RAG-Based Career Roadmap Generation

#### 4.9.1 Description

This feature generates a personalized roadmap after a completed assessment by combining user signals with retrieved documents from a curated knowledge base. The retrieval stage identifies relevant learning resources, role-aligned topics, and skill development materials. The generation stage then creates a grounded roadmap with phases, actions, and supporting study resources.

#### 4.9.2 Inputs

- User goal
- Resume skills
- Exam score
- Skill level classification
- Retrieved context documents from the knowledge base

#### 4.9.3 Response Sequences

- User requests roadmap -> latest exam result checked -> retrieval engine fetches relevant documents -> generation layer creates roadmap -> roadmap saved -> roadmap displayed
- Retrieval unavailable -> fallback roadmap generation used
- No exam available -> user redirected to dashboard or prompted to complete the exam

#### 4.9.4 Functional Requirements

- REQ-1: The system shall require a completed exam before roadmap generation.
- REQ-2: The system shall retrieve relevant resource documents before roadmap generation.
- REQ-3: The system shall generate a roadmap grounded in retrieved context.
- REQ-4: The system shall structure the roadmap into phases with actions and learning resources.
- REQ-5: The system shall save generated roadmaps for later viewing.
- REQ-6: The system shall provide a fallback roadmap path if the retrieval or generation layer is unavailable.

#### 4.9.5 Outputs

- Grounded personalized roadmap
- Phase-wise actions
- Retrieved and recommended study resources

### 4.10 Saved Roadmap Progress View

#### 4.10.1 Description

This feature allows users to reopen the most recently saved roadmap and continue reviewing the suggested progression path across sessions and devices.

#### 4.10.2 Inputs

- Latest saved roadmap
- Latest exam attempt
- User profile data

#### 4.10.3 Response Sequences

- User opens saved roadmap view -> system retrieves saved roadmap -> roadmap rendered
- No saved roadmap found -> user redirected to dashboard

#### 4.10.4 Functional Requirements

- REQ-1: The system shall retrieve the latest saved roadmap for the user.
- REQ-2: The system shall display roadmap phases, summary, and resources.
- REQ-3: The system shall prevent access to the roadmap progress view when no saved roadmap exists.

#### 4.10.5 Outputs

- Saved roadmap progress page
- Persisted roadmap content for review

### 4.11 Resume Suggestion Module

#### 4.11.1 Description

This feature analyzes the submitted resume and generates suggestions to improve resume quality, relevance, and clarity for the selected target role. Suggestions may cover missing role-aligned skills, weak wording, insufficient project detail, formatting clarity, and opportunities to better present measurable outcomes.

#### 4.11.2 Inputs

- Resume text
- Extracted skills
- User goal
- Optional exam result and roadmap insights

#### 4.11.3 Response Sequences

- User requests resume suggestions -> resume analyzed -> suggestion categories generated -> feedback displayed
- Resume lacks sufficient content -> system displays limited-feedback notice

#### 4.11.4 Functional Requirements

- REQ-1: The system shall analyze resume content for role alignment.
- REQ-2: The system shall suggest missing or underrepresented skills relevant to the target role.
- REQ-3: The system shall provide actionable suggestions for improving phrasing, project descriptions, or clarity.
- REQ-4: The system shall present resume feedback in understandable categories.
- REQ-5: The system shall store or regenerate suggestions for later viewing.

#### 4.11.5 Outputs

- Resume suggestion report
- Role-alignment improvement points
- Actionable resume enhancement recommendations

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

The system should provide responsive user interactions across both web and mobile clients. Resume parsing and OCR processing should complete within reasonable time for typical submission sizes. Dashboard loading, exam scoring, resume suggestion generation, and roadmap generation should be timely enough for smooth end-user experience. Retrieval operations in the RAG pipeline should be optimized to avoid noticeable delays.

### 5.2 Security Requirements

Passwords must be stored in hashed form. Authenticated routes and APIs must not be accessible without valid authorization. Uploaded files and captured images must be validated before processing. Sensitive user data and resume content must be protected in storage and transit. Camera access on mobile clients must be permission-based. Production deployment should use HTTPS for secure communication.

### 5.3 Usability Requirements

The interface must remain simple, guided, and understandable for learners on both desktop and mobile devices. The resume submission flow should make it easy to choose between upload and image capture. OCR failure or low-quality image cases should provide clear guidance. Resume suggestions and roadmap recommendations should be presented in concise, actionable language.

### 5.4 Reliability Requirements

The system should continue operating even if some AI-enhanced components are unavailable. Fallback logic should exist for exam generation and roadmap generation, and OCR failures should be handled gracefully. The platform must avoid data loss during profile updates, resume processing, exam submission, and roadmap saving.

### 5.5 Availability Requirements

The platform should remain available whenever the hosting environment is active. Both web and mobile clients should be able to access the backend whenever network connectivity is available. Maintenance activity should minimize disruption to user access.

### 5.6 Scalability Requirements

The revised architecture should support growth in users, uploaded documents, captured images, retrieval documents, exam attempts, and generated roadmaps. The design should allow future migration from prototype storage to more scalable database, storage, and vector retrieval solutions.

### 5.7 Maintainability Requirements

The system should remain modular by separating frontend, backend, OCR, retrieval, parsing, and generation responsibilities. React components, backend APIs, and intelligence services should be independently maintainable. The architecture should support incremental enhancement of skill mappings, retrieval sources, suggestion logic, and mobile capabilities.

### 5.8 Portability Requirements

The system should operate across browsers, desktop environments, and supported mobile platforms. The web frontend should function on modern browsers, and the mobile app should support major Android and iOS devices. Backend deployment should remain portable across Node.js-compatible environments.

### 5.9 Accuracy Requirements

Resume parsing, OCR extraction, skill extraction, and suggestion generation should achieve reasonable accuracy for practical use. OCR output quality should be robust enough for clear resume photos. RAG-based roadmap generation should remain grounded in retrieved materials rather than relying only on general model knowledge. Exam scoring and classification must remain deterministic for the same answer set.

### 5.10 Data Integrity Requirements

The system must validate required fields before storing user data. User email addresses must remain unique. Resume files, captured images, OCR text, exam attempts, roadmap records, and suggestion records must remain associated with the correct user. Retrieved knowledge resources used for roadmap grounding should be versioned or managed to preserve consistency in recommendation behavior over time.
