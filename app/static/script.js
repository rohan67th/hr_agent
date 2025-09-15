document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const submitBtn = document.getElementById('submit-btn');
    const resultsContainer = document.getElementById('results-container');
    const scheduleSection = document.getElementById('schedule-section');
    const scheduleBtn = document.getElementById('schedule-btn');
    const viewSchedulesBtn = document.getElementById('view-schedules-btn');
    const schedulesListContainer = document.getElementById('schedules-list-container');
    const spinner = document.getElementById('spinner');
    
    // --- START: Theme Toggle Functionality ---
    const themeToggleBtn = document.getElementById('theme-toggle');

    // On page load, check for saved theme in localStorage
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️'; // Sun icon for dark mode
    }

    // Add click event listener to the toggle button
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            // Toggle the .dark-mode class on the body
            document.body.classList.toggle('dark-mode');
            
            let theme = 'light'; // Assume light theme
            
            // If body now has dark-mode class, theme is dark
            if (document.body.classList.contains('dark-mode')) {
                theme = 'dark';
                themeToggleBtn.textContent = '☀️'; // Change icon to sun
            } else {
                themeToggleBtn.textContent = '🌙'; // Change icon to moon
            }
            
            // Save the user's preference to localStorage
            localStorage.setItem('theme', theme);
        });
    }
    // --- END: Theme Toggle Functionality ---


    // Helper Functions
    function showSpinner() { spinner.style.display = 'flex'; }
    function hideSpinner() { spinner.style.display = 'none'; }

    function showToast(message, isError = false) {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            backgroundColor: isError 
                ? "linear-gradient(to right, #ff5f6d, #ffc371)" 
                : "linear-gradient(to right, #00b09b, #96c93d)",
        }).showToast();
    }

    // Form Submit
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const resumes = document.getElementById('resumes').files;
        if (resumes.length === 0) {
            showToast("Please upload at least one resume.", true);
            return;
        }

        for (const file of resumes) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showToast(`File ${file.name} is too large (max 5MB).`, true);
                return;
            }
            const allowedTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
            if (!allowedTypes.includes(file.type)) {
                showToast(`File type for ${file.name} is not supported.`, true);
                return;
            }
        }

        showSpinner();
        submitBtn.disabled = true;
        resultsContainer.innerHTML = '';
        scheduleSection.style.display = 'none';

        const formData = new FormData(form);

        try {
            const response = await fetch('/app/api/process/', { method: 'POST', body: formData });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const results = await response.json();
            displayResults(results);

        } catch (error) {
            console.error('Error:', error);
            showToast("An error occurred. Please check the console.", true);
        } finally {
            hideSpinner();
            submitBtn.disabled = false;
        }
    });

    // Display Results
    function displayResults(results) {
        resultsContainer.innerHTML = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No candidates found.</p>';
            return;
        }

        results.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';

            const skillsHTML = Array.isArray(candidate.skills)
                ? candidate.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')
                : 'No skills extracted.';

            card.innerHTML = `
                <div class="card-header">
                    <input type="checkbox" class="candidate-checkbox" data-name="${candidate.name}" data-email="${candidate.email || ''}">
                    <h3>${candidate.name || 'Name Not Found'}</h3>
                </div>
                <div class="card-body">
                    <p class="score">Score: ${candidate.score || 'N/A'}/100</p>
                    <p><strong>Experience:</strong> ${candidate.experience_years || 'N/A'} years</p>
                    <p><strong>Contact:</strong> ${candidate.email || 'N/A'} | ${candidate.phone || 'N/A'}</p>
                    <div class="skills-container">
                        ${skillsHTML}
                    </div>
                    <p><strong>Summary:</strong> ${candidate.summary || 'No summary provided.'}</p>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
        
        scheduleSection.style.display = 'block';
    }

    // Schedule
    scheduleBtn.addEventListener('click', async () => {
        const selectedCandidates = [];
        const checkboxes = document.querySelectorAll('.candidate-checkbox:checked');
        
        checkboxes.forEach(checkbox => {
            selectedCandidates.push({
                name: checkbox.getAttribute('data-name'),
                email: checkbox.getAttribute('data-email')
            });
        });

        if (selectedCandidates.length === 0) {
            showToast('Please select at least one candidate.', true);
            return;
        }

        showSpinner();
        scheduleBtn.disabled = true;

        try {
            const response = await fetch('/app/api/schedule/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidates: selectedCandidates }),
            });
            if (!response.ok) throw new Error('Failed to schedule interviews');
            const result = await response.json();
            showToast(result.message);
        } catch (error) {
            console.error('Scheduling Error:', error);
            showToast('An error occurred while scheduling.', true);
        } finally {
            hideSpinner();
            scheduleBtn.disabled = false;
        }
    });
    
    // View Schedules
    viewSchedulesBtn.addEventListener('click', async () => {
        schedulesListContainer.innerHTML = '<p>Loading schedules...</p>';
        schedulesListContainer.style.display = 'block'; // Make sure it's visible
        try {
            const response = await fetch('/app/api/schedules/');
            if (!response.ok) throw new Error('Failed to fetch schedules');
            
            const schedules = await response.json();
            displaySchedulesList(schedules);
        } catch (error) {
            schedulesListContainer.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    });

    function displaySchedulesList(schedules) {
        schedulesListContainer.innerHTML = '<h2>Upcoming Interviews</h2>';
        
        if (!schedules || schedules.length === 0) {
            schedulesListContainer.innerHTML += '<p>No upcoming interviews found.</p>';
            return;
        }

        const list = document.createElement('ul');
        schedules.forEach(schedule => {
            const listItem = document.createElement('li');
            const date = new Date(schedule.start_time).toLocaleString('en-IN', {
                dateStyle: 'full',
                timeStyle: 'short'
            });
            listItem.textContent = `${schedule.summary} - ${date}`;
            list.appendChild(listItem);
        });
        schedulesListContainer.appendChild(list);
    }
});