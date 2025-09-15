import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import os
import json
import docx
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
import google.generativeai as genai 
import PyPDF2
from django.shortcuts import render
def index_view(request):
    return render(request, 'landing.html')

# Configure the Gemini API key
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

def get_ai_analysis(job_description, resume_text):
    model = genai.GenerativeModel('gemini-1.5-flash') 

    prompt = f"""
    You are an expert HR analyst. Based on the following job description and resume, perform these actions:
    1. Score the candidate's suitability for the role on a scale of 1 to 100.
    2. Provide a 3-sentence summary highlighting the candidate's key skills and experience relevant to this job.
    3. Extract the candidate's name.

    Return this information in a strict JSON format with keys: "name", "score", and "summary". Do not include any other text or markdown formatting like ```json.

    ---
    Job Description:
    {job_description}
    ---
    Resume Text:
    {resume_text}
    ---
    """
    try:
        # Call the Gemini API
        response = model.generate_content(prompt) 
        
        # The result is in response.text
        result_text = response.text
        
        if '```json' in result_text:
            result_text = result_text.split('```json\n')[1].split('```')[0]

        return json.loads(result_text)
    except Exception as e:
        print(f"An error occurred with the Gemini API: {e}")
        return None

class ResumeProcessingView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        job_description = request.data.get('job_description')
        resumes = request.FILES.getlist('resumes')

        if not job_description or not resumes:
            return Response({"error": "Job description and resumes are required."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for resume_file in resumes:
            try:
                resume_text = ""
                if resume_file.name.endswith('.pdf'):
                    pdf_reader = PyPDF2.PdfReader(resume_file)
                    for page in pdf_reader.pages:
                        resume_text += page.extract_text()
                elif resume_file.name.endswith('.docx'):
                    doc = docx.Document(resume_file)
                    for para in doc.paragraphs:
                        resume_text += para.text + "\n"
                elif resume_file.name.endswith('.txt'):
                    resume_text = resume_file.read().decode('utf-8')
                else:
                    # Skip unsupported file types
                    continue

                if resume_text:
                    analysis = get_ai_analysis(resume_text, job_description)
                    if analysis:
                        results.append(analysis)
            except Exception as e:
                print(f"Error processing resume {resume_file.name}: {e}")
                continue

        sorted_results = sorted(results, key=lambda x: x.get('score', 0), reverse=True)
        return Response(sorted_results, status=status.HTTP_200_OK)    

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # IMPORTANT: The first time you run this, it will open a browser
            # for you to log in and authorize access.
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    
    service = build('calendar', 'v3', credentials=creds)
    return service

class ScheduleInterviewView(APIView):
    def post(self, request, *args, **kwargs):
        candidates = request.data.get('candidates')
        if not candidates:
            return Response({"error": "No candidates provided"}, status=status.HTTP_400_BAD_REQUEST)

        service = get_calendar_service()
        
        start_time = datetime.datetime.utcnow().replace(hour=9, minute=0, second=0, microsecond=0)
        if datetime.datetime.utcnow().hour >= 17: # If it's past 5 PM
             start_time += datetime.timedelta(days=1) # Move to tomorrow
        
        if start_time.weekday() >= 5: # If it's Saturday or Sunday
            start_time += datetime.timedelta(days=8 - start_time.weekday()) # Move to next Monday

        scheduled_count = 0
        for candidate in candidates:
            end_time = start_time + datetime.timedelta(minutes=30)
            
            event = {
                'summary': f"Interview with {candidate.get('name')}",
                'description': 'Initial screening interview.',
                'start': {
                    'dateTime': start_time.isoformat() + 'Z', # 'Z' indicates UTC time
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': end_time.isoformat() + 'Z',
                    'timeZone': 'UTC',
                },
                'attendees': [
                    # NOTE: In a real app, you'd parse the candidate's email from the resume.
                    # We are using a placeholder here. You would need to add 'email' to the
                    # data extracted by the Gemini API.
                    {'email': 'candidate.placeholder@example.com'},
                ],
            }

            service.events().insert(calendarId='primary', body=event).execute()
            scheduled_count += 1
            
            # Move to the next slot for the next candidate
            start_time += datetime.timedelta(minutes=30)
            
        return Response(
            {"message": f"Successfully scheduled {scheduled_count} interviews."},
            status=status.HTTP_200_OK
        )
    


# NEW AND IMPROVED VERSION
class ListSchedulesView(APIView):
    def get(self, request, *args, **kwargs):
        service = get_calendar_service()
        
        # Get the current time and set it to the beginning of the day (midnight) in UTC
        start_of_day = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        time_min = start_of_day.isoformat() + 'Z'

        events_result = service.events().list(
            calendarId='primary', 
            timeMin=time_min, # Now it searches from the start of today
            maxResults=20,
            singleEvents=True,
            orderBy='startTime',
            q='Interview with'
        ).execute()
        
        events = events_result.get('items', [])
        
        schedules = []
        if not events:
            # We can now return the list directly, no need for a special message here
            return Response([], status=status.HTTP_200_OK)
        
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            schedules.append({
                'summary': event['summary'],
                'start_time': start
            })
            
        return Response(schedules, status=status.HTTP_200_OK)