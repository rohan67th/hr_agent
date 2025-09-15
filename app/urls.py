from django.urls import path
from .views import ResumeProcessingView, ScheduleInterviewView, ListSchedulesView

urlpatterns = [
    path('api/process/', ResumeProcessingView.as_view(), name='process_resumes'),
    path('api/schedule/', ScheduleInterviewView.as_view(), name='schedule_interviews'),
    path('api/schedules/', ListSchedulesView.as_view(), name='list_schedules'),
]

