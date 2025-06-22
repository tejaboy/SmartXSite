import { CreateMLCEngine } from "./libs/webllm/webllm.js";
import { defaultSummaryPrompt, defaultMCQPrompt } from "./consts.js";

// Hide content initially
document.getElementById("content").style.display = "none";
document.getElementById("mcq-btn").style.display = "none";

// Set default model if not already set
if (!localStorage.getItem("model")) {
	localStorage.setItem("model", "Hermes-2-Pro-Llama-3-8B-q4f32_1-MLC");
}

// Lazy-loaded engine initialization
let enginePromise = null;
const getEngine = () => {
	if (!enginePromise) {
		enginePromise = CreateMLCEngine(localStorage.getItem("model"), {
			initProgressCallback: (initProgress) => {
				document.getElementById("status").innerText = initProgress.text;
				console.log(initProgress);
			},
		});
	}
	return enginePromise;
};

document.addEventListener("DOMContentLoaded", () => {
    if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(["extractedText", "url"], async (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data:", chrome.runtime.lastError);
                document.getElementById("summary").innerText = "Error loading summary.";
                document.getElementById("audioPlayer").outerHTML = "<p>Error loading song.</p>";
                return;
            }

			const url = "content_" + data.url;
			console.log("URL:", data.url);

			if (localStorage.getItem(url)) {
				console.log("Content already summarized.");	
				document.getElementById("content").style.display = "block";
				document.getElementById("summary").innerHTML = marked.parse(JSON.parse(localStorage.getItem(url)).summary);
				document.getElementById("status").innerText = "";

				// TODO: Compare hash, and if fullText is different, ask user if they want to regenerate summary
			}
			else {
				// Prompt Engineering Setup
				let promptText = localStorage.getItem("summarization_prompt") || defaultSummaryPrompt;
				promptText = promptText.replace("{content}", data.extractedText);

				// If the model is not Gemini, we can proceed with using webllm, else we need to handle Gemini differently
				if (!localStorage.getItem("model").includes("gemini")) {
					// Wait for the engine to be initialized
					const engine = await getEngine();

					// Prepare the message
					const messages = [
						{
							role: "user",
							content: promptText,
						},
					];
		
					let summary = "";
		
					try {
						// Use streaming
						const stream = await engine.chat.completions.create({
							messages,
							stream: true, // Enable streaming
						});
		
						for await (const chunk of stream) {
							const token = chunk.choices[0]?.delta?.content || ""; // Extract streamed content
							summary += token;
		
							// Update the summary progressively
							document.getElementById("content").style.display = "block";
							document.getElementById("summary").innerHTML = marked.parse(summary);
							document.getElementById("status").innerText = "";
						}
		
						localStorage.setItem(url, JSON.stringify({
							fullText: data.extractedText,
							summary: summary
						}));
					} catch (error) {
						console.error("Streaming error:", error);
						document.getElementById("summary").innerText = "Error generating summary.";
						return;
					}
				}
				else {
					// Handle Gemini API streaming request via HTTP
					const GEMINI_API_KEY = localStorage.getItem('gemini_key');
					const MODEL_ID = localStorage.getItem('model');

					const body = {
						contents: [
							{
								role: "user",
								parts: [
									{
										text: promptText
									},
								],
							},
						],
						generationConfig: {
							responseMimeType: "text/plain"
						}
					};

					document.getElementById("status").innerText = "";
					document.getElementById("content").style.display = "block";
					document.getElementById("summary").innerText = "Loading summary with Gemini...";

					try {
						const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify(body)
						});

						if (!response.ok) {
							throw new Error(`Request failed with status ${response.status}`);
						}

						const result = await response.json();
						const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";

						document.getElementById("summary").innerHTML = marked.parse(summary);
						localStorage.setItem(url, JSON.stringify({
							fullText: data.extractedText,
							summary: summary
						}));
					} catch (error) {
						console.error("Gemini error:", error);
						document.getElementById("summary").innerText = "Error generating Gemini summary.";
					}
				}
			}

			// Show the MCQ button
			document.getElementById("mcq-btn").style.display = "block";
			document.getElementById("mcq-btn").addEventListener("click", function() {
				generateMCQ(localStorage.getItem(url));
			});
        });
    } else {
        console.error("Chrome storage is not available.");
        document.getElementById("summary").innerText = "Storage access error.";
    }
});

async function generateMCQ(fullText) {
	document.getElementById("mcq-btn").disabled = true;
	document.getElementById("mcq-btn").innerText = "Generating MCQ ...";
	let result = null;

	// If the model is not Gemini, we can proceed with using webllm, else we need to handle Gemini differently
	let promptText = localStorage.getItem("mcq_prompt") || defaultMCQPrompt;
	promptText = promptText.replace("{content}", fullText);

	console.log("Prompt Text:", promptText);
	if (!localStorage.getItem("model").includes("gemini")) {
		result = await generateMCQWebLLM(promptText);
	} else {
		result = await generateMCQGemini(promptText);
	}

	// Show error if result is null or empty and stop MCQ generation
	if (result === null || result === undefined || result.trim() === "") {
		alert("Failed to generate MCQ. Please try again.");
		document.getElementById("mcq-btn").disabled = false;
		document.getElementById("mcq-btn").innerText = "Generate MCQ";
		return;
	}

	// Save MCQ and reset UI
	localStorage.setItem("mcq", result);
	document.getElementById("mcq-btn").disabled = false;
	document.getElementById("mcq-btn").innerText = "Generate MCQ";

	// Popup quiz.html
	window.open("quiz.html", "Quiz", "width=800,height=600");
}

const questionSchema = {
    "type": "object",
    "properties": {
        "questions": {
            "type": "array",
            "items": {
                "type": "object", // TODO: use maxItem and minItem when supported by Gemini and WebLLM (https://json-schema.org/understanding-json-schema/reference/array#length)
                "properties": {
                    "question": {
                        "type": "string"
                    },
                    "options": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },
                    "correctIndex": {
                        "type": "integer"
                    },
                    "explanation": {
                        "type": "string"
                    }
                },
                "required": [
                    "question",
                    "options",
                    "correctIndex",
                    "explanation"
                ]
            },
        }
    },
    "required": [
        "questions",
    ]
}

async function generateMCQWebLLM(promptText) {
	// Convert JSON to string
	const response_format = {
		type: "json_object",
		schema: JSON.stringify(questionSchema)
	};

	const engine = await getEngine();
	const messages = [
		{
			role: "user",
			content: promptText,
		},
	];

	console.log("Generating MCQ with WebLLM:");

	const reply = await engine.chat.completions.create({
		messages,
		temperature: 0.7,
		response_format,
	});

	console.log("Generated MCQ:", reply.choices[0].message.content);

	return reply.choices[0].message.content;
}

async function generateMCQGemini(promptText) {
	const GEMINI_API_KEY = localStorage.getItem('gemini_key');
	const MODEL_ID = localStorage.getItem('model');

	const body = {
		contents: [
			{
				role: "user",
				parts: [
					{
						text: promptText
					},
				],
			},
		],
		generationConfig: {
			responseMimeType: "application/json",
			"responseSchema": questionSchema,
		}
	};

	try {
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(body)
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const result = await response.json();
		return result.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
		
	} catch (error) {
		console.error("Gemini error:", error);
		return null;
	}
}