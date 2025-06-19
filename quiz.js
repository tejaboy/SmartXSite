/**
 * Helper function to add and remove multiple CSS classes from an element.
 * @param {HTMLElement} element - The DOM element to modify.
 * @param {string|string[]|null} addClasses - Class(es) to add. Can be a string or an array of strings. Null to add none.
 * @param {string|string[]|null} removeClasses - Class(es) to remove. Can be a string or an array of strings. Null to remove none.
 */
function setClasses(element, addClasses, removeClasses = []) {
    if (addClasses) {
        if (Array.isArray(addClasses)) {
            element.classList.add(...addClasses);
        } else {
            element.classList.add(addClasses);
        }
    }
    if (removeClasses) {
        if (Array.isArray(removeClasses)) {
            element.classList.remove(...removeClasses);
        } else {
            element.classList.remove(removeClasses);
        }
    }
}

/**
 * Represents a Multiple Choice Question (MCQ) Quiz application.
 * Handles rendering questions, processing answers, displaying feedback,
 * managing transitions, and tracking the score.
 */
class Quiz {
    /**
     * Initializes a new Quiz instance.
     * @param {Object} data - The quiz data containing an array of questions.
     * @param {string} containerId - The ID of the HTML element where the quiz will be rendered.
     */
    constructor(data, containerId) {
        this.questions = data.questions;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.quizContainer = document.getElementById(containerId);

        // DOM elements references, initialized after mounting the basic structure
        this.quizContentEl = null;
        this.questionEl = null;
        this.optionsContainerEl = null;
        this.feedbackEl = null;
        this.nextButton = null;
        this.restartButton = null;

        // Duration for CSS transitions in milliseconds
        this.transitionDuration = 500; // Must match CSS transition duration

        // Initialize the quiz structure and event listeners
        this.initializeElements();
        this.addEventListeners();
        // Display the first question
        this.displayQuestion();
    }

    /**
     * Sets up the initial HTML structure within the quiz container.
     * This function is now called when the quiz starts and when it restarts.
     */
    initializeElements() {
        this.quizContainer.innerHTML = `
            <div id="quiz-content" class="quiz-content-active">
                <div id="question-text" class="question-text"></div>
                <div id="options-container" class="options-grid"></div>
                <div id="feedback" class="feedback-message"></div>
            </div>
            <div class="button-container">
                <button id="next-button" class="quiz-button">Next Question</button>
                <button id="restart-button" class="quiz-button hidden-button">Restart Quiz</button>
            </div>
        `;

        // Get references to the newly created DOM elements
        this.quizContentEl = document.getElementById('quiz-content');
        this.questionEl = document.getElementById('question-text');
        this.optionsContainerEl = document.getElementById('options-container');
        this.feedbackEl = document.getElementById('feedback');
        this.nextButton = document.getElementById('next-button');
        this.restartButton = document.getElementById('restart-button');

        // Initial state for the next button
        this.nextButton.disabled = true;
        setClasses(this.nextButton, 'disabled-button');
    }

    /**
     * Adds event listeners to quiz elements.
     * This function is now called when the quiz starts and when it restarts.
     */
    addEventListeners() {
        // Event listener for option buttons (delegated to the container)
        this.optionsContainerEl.addEventListener('click', (event) => {
            const selectedOption = event.target.closest('.option-button');
            // Only process click if an option button was clicked AND the next button is currently disabled
            if (selectedOption && this.nextButton.disabled) {
                const selectedIndex = parseInt(selectedOption.dataset.index);
                this.handleAnswer(selectedIndex);
            }
        });

        // Event listener for the "Next Question" button
        this.nextButton.addEventListener('click', () => {
            if (!this.nextButton.disabled) { // Only proceed if the button is enabled
                this.nextQuestion();
            }
        });

        // Event listener for the "Restart Quiz" button
        this.restartButton.addEventListener('click', () => {
            this.resetQuiz();
        });
    }

    /**
     * Renders the current question and its options.
     * Manages the "slide-in" animation for the new question.
     */
    displayQuestion() {
        // Check if the quiz is complete
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const questionData = this.questions[this.currentQuestionIndex];

        // Reset feedback area and next button state
        setClasses(this.feedbackEl, null, ['feedback-visible', 'text-green', 'text-red']);
        this.feedbackEl.textContent = '';
        this.nextButton.disabled = true;
        setClasses(this.nextButton, 'disabled-button');
        setClasses(this.restartButton, 'hidden-button');

        // Add 'enter' class to prepare for slide-in animation (starts off-screen)
        setClasses(this.quizContentEl, 'quiz-content-enter', ['quiz-content-active', 'quiz-content-exit']);

        // Update content after classes are set for animation
        this.questionEl.textContent = questionData.question;
        this.optionsContainerEl.innerHTML = ''; // Clear previous options

        questionData.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.dataset.index = index; // Store original index for checking
            button.textContent = option;
            button.className = 'option-button'; // Use the pure CSS class
            this.optionsContainerEl.appendChild(button);
        });

        // Force reflow to ensure the `quiz-content-enter` state is applied before transitioning
        void this.quizContentEl.offsetWidth;

        // Transition to 'active' state (slides into view)
        setClasses(this.quizContentEl, 'quiz-content-active', 'quiz-content-enter');
    }

    /**
     * Handles the user's selected answer, provides feedback, and enables the next button.
     * @param {number} selectedIndex - The index of the option selected by the user.
     */
    handleAnswer(selectedIndex) {
        // Disable all option buttons to prevent multiple selections
        Array.from(this.optionsContainerEl.children).forEach(button => {
            button.disabled = true;
        });

        const questionData = this.questions[this.currentQuestionIndex];
        const correctIndex = questionData.correctIndex;
        const explanation = questionData.explanation;

        const selectedButton = this.optionsContainerEl.querySelector(`[data-index="${selectedIndex}"]`);
        const correctButton = this.optionsContainerEl.querySelector(`[data-index="${correctIndex}"]`);

        // Apply visual feedback
        if (selectedIndex === correctIndex) {
            this.score++;
            setClasses(selectedButton, 'correct-answer');
            this.feedbackEl.textContent = `Correct! ${explanation || ''}`;
            setClasses(this.feedbackEl, 'text-green');
        } else {
            setClasses(selectedButton, 'incorrect-answer');
            if (correctButton) {
                setClasses(correctButton, 'correct-answer'); // Highlight correct answer
            }
            this.feedbackEl.textContent = `Incorrect. The correct answer was: "${questionData.options[correctIndex]}". ${explanation || ''}`;
            setClasses(this.feedbackEl, 'text-red');
        }

        // Show feedback with a fade-in effect
        setClasses(this.feedbackEl, 'feedback-visible');

        // Enable the "Next Question" button
        this.nextButton.disabled = false;
        setClasses(this.nextButton, null, 'disabled-button');
    }

    /**
     * Advances to the next question with a "slide-out" and "slide-in" animation.
     */
    nextQuestion() {
        // Add 'exit' class to start the slide-out animation for the current question
        setClasses(this.quizContentEl, 'quiz-content-exit', 'quiz-content-active');

        // After the transition, update content and slide in the next question
        setTimeout(() => {
            this.currentQuestionIndex++;
            // Remove all feedback and option styling
            setClasses(this.feedbackEl, null, ['text-green', 'text-red', 'feedback-visible']);
            this.feedbackEl.textContent = ''; // Clear text for next question
            Array.from(this.optionsContainerEl.children).forEach(button => {
                setClasses(button, null, ['correct-answer', 'incorrect-answer']);
                button.disabled = false; // Re-enable options for the new question
            });
            this.displayQuestion(); // Display the next question
        }, this.transitionDuration); // Wait for the exit animation to complete
    }

    /**
     * Displays the final results of the quiz.
     * Manages the "slide-in" animation for the results screen.
     */
    showResults() {
        // Add 'exit' class to slide out the last question
        setClasses(this.quizContentEl, 'quiz-content-exit', 'quiz-content-active');

        setTimeout(() => {
            // Update content to show results
            this.quizContentEl.innerHTML = `
                <div class="quiz-result-title">Quiz Complete!</div>
                <div class="quiz-score-text score-display">You scored <span class="font-bold text-blue">${this.score}</span> out of <span class="font-bold text-blue">${this.questions.length}</span> questions.</div>
            `;

            // Prepare results for slide-in animation
            setClasses(this.quizContentEl, 'quiz-content-enter', 'quiz-content-exit');
            void this.quizContentEl.offsetWidth; // Force reflow

            // Slide in the results
            setClasses(this.quizContentEl, 'quiz-content-active', 'quiz-content-enter');

            // Adjust button visibility
            setClasses(this.nextButton, 'hidden-button');
            setClasses(this.restartButton, null, 'hidden-button');
            this.restartButton.disabled = false;
            setClasses(this.restartButton, null, 'disabled-button'); // Ensure restart is enabled
        }, this.transitionDuration);
    }

    /**
     * Resets the quiz to its initial state.
     */
    resetQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;

        // Re-initialize elements and add listeners to fix stale DOM references
        this.initializeElements();
        this.addEventListeners();

        setClasses(this.restartButton, 'hidden-button');
        setClasses(this.nextButton, null, 'hidden-button');
        this.displayQuestion(); // Start from the first question again
    }
}

// --- Quiz Initialization ---
// Ensure the DOM is fully loaded before initializing the quiz
window.onload = function() {
    // Get quiz data from localStorage and parse it
    const quizData = JSON.parse(localStorage.getItem('mcq'));

    // Create a new Quiz instance and pass your data and the container ID
    const quiz = new Quiz(quizData, 'quiz-app');
};