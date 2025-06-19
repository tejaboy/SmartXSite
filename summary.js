import { CreateMLCEngine } from "./libs/webllm/webllm.js";

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
        chrome.storage.local.get(["extractedText"], async (data) => {
            if (chrome.runtime.lastError) {
                console.error("Error fetching data:", chrome.runtime.lastError);
                document.getElementById("summary").innerText = "Error loading summary.";
                document.getElementById("audioPlayer").outerHTML = "<p>Error loading song.</p>";
                return;
            }

			const hash = await generateHash(data.extractedText);
			console.log("Hash:", hash);

			if (localStorage.getItem(hash)) {
				console.log("Content already summarized.");	
				document.getElementById("content").style.display = "block";
				document.getElementById("summary").innerHTML = marked.parse(localStorage.getItem(hash));
				document.getElementById("status").innerText = "";
			}
			else {
				// Prompt Engineering Setup
				let promptText = `Summarize the following content in a structured format: ${data.extractedText} The summary should be concise and formatted into sections if necessary. Use markdown for formatting. Keep it 30% of the original length.`

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
		
					let fullText = "";
		
					try {
						// Use streaming
						const stream = await engine.chat.completions.create({
							messages,
							stream: true, // Enable streaming
						});
		
						for await (const chunk of stream) {
							const token = chunk.choices[0]?.delta?.content || ""; // Extract streamed content
							fullText += token;
		
							// Update the summary progressively
							document.getElementById("content").style.display = "block";
							document.getElementById("summary").innerHTML = marked.parse(fullText);
							document.getElementById("status").innerText = "";
						}
		
						localStorage.setItem(hash, fullText);
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
						const fullText = result.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";

						document.getElementById("summary").innerHTML = marked.parse(fullText);
						localStorage.setItem(hash, fullText);
					} catch (error) {
						console.error("Gemini error:", error);
						document.getElementById("summary").innerText = "Error generating Gemini summary.";
					}
				}
			}

			// Show the MCQ button
			document.getElementById("mcq-btn").style.display = "block";

			document.getElementById("mcq-btn").addEventListener("click", function() {
				generateMCQ(localStorage.getItem(hash));
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
	let promptText = `Generate *exactly three* multiple-choice questions based on the following content: ${fullText}. The question should be related to the content. Ask question from different sections of the content.`;
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

function generateHash(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    return crypto.subtle.digest('SHA-256', data).then(hashBuffer => {
        // Convert ArrayBuffer to hexadecimal string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    });
}