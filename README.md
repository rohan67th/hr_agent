# HR AI Screening Agent 🤖

An autonomous AI agent built with Django and Google's Gemini API to screen job applicants, rank them based on a job description, and schedule interviews automatically via Google Calendar.

## Features ✨

* **Dynamic Job Input**: HR managers can paste any job description into the frontend.
* **Resume Parsing**: Supports both PDF and DOCX formats for resume uploads.
* **AI-Powered Ranking**: Leverages the Gemini LLM to analyze resume content against the job description, assigning a relevance score and generating a summary for each candidate.
* **Candidate Review Panel**: Displays a ranked list of candidates with their scores, summaries, and contact information.
* **Automated Interview Scheduling**: Integrates with the Google Calendar API to find open slots and automatically send interview invitations to selected candidates.

## System Architecture ⚙️

The application follows a simple, modular architecture:

**Frontend** (HTML/JS/CSS) `->` **Django Backend** (API Endpoints) `->` **AI Agent** (LangChain & Gemini) `->` **Google Calendar API**

1.  The user interacts with the single-page frontend.
2.  A `fetch` request is sent to the Django backend with the job description and resume files.
3.  The Django view triggers the AI agent, which processes each resume asynchronously.
4.  The agent calls the Gemini API to get structured data (score, summary, etc.).
5.  Results are sent back to the frontend.
6.  Upon selection, another request is sent to schedule interviews, triggering the Google Calendar API.



## Technology Stack 📚

* **Backend**: Python, Django
* **AI/LLM**: Google Gemini (`gemini-1.5-flash`), LangChain
* **Database**: SQLite3 (default)
* **Scheduling**: Google Calendar API
* **File Parsing**: `pypdf`, `python-docx`

## Setup and Installation 🚀

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd hr-ai-agent