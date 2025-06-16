import { CreateMLCEngine } from "./libs/webllm/webllm.js";

// Hide content initially
document.getElementById("content").style.display = "none";
document.getElementById("mcq-btn").style.display = "none";

// Declare the engine as a global constant
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
				// Wait for the engine to be initialized
				const engine = await getEngine();

				document.getElementById("content").style.display = "block";

				// Prepare the message
				const messages = [
					{
						role: "user",
						content: `Summarize the following content in a structured format: ${data.extractedText} The summary should be concise and formatted into sections if necessary. Use markdown for formatting. Keep it 30% of the original length.`,
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

	const schema = {
		type: "object",
		properties: {
			question: { type: "string" },
			answer: {
				anyOf: [
				{ const: "A", type: "string" },
				{ const: "B", type: "string" },
				{ const: "C", type: "string" },
				{ const: "D", type: "string" }
				]
			},
			optionA: { type: "string" },
			optionB: { type: "string" },
			optionC: { type: "string" },
			optionD: { type: "string" },
			explanation: { type: "string" },
		},
		required: ["question", "answer", "optionA", "optionB", "optionC", "optionD", "explanation"]
	};
	
	// Convert JSON to string
	const response_format = {
		type: "json_object",
		schema: JSON.stringify(schema)
	};  

	const engine = await getEngine();
	const messages = [
		{
			role: "user",
			content: `Generate multiple-choice questions based on the following content: ${fullText}. The question should be related to the content. optionA, optionB, optionC and optionD must not be the same, and only one of them is the correct option.`,
		},
	];

	const reply = await engine.chat.completions.create({
		messages,
		temperature: 0.7,
		response_format,
	});

	document.getElementById("mcq-btn").innerText = "MCQ Generated!";
	const answer = JSON.parse(reply.choices[0].message.content);

	// Ask question
	const userAnswer = prompt(answer.question + "\n\nA: " + answer.optionA + "\nB: " + answer.optionB + "\nC: " + answer.optionC + "\nD: " + answer.optionD + "\n\n(Enter only A, B, C or D)");

	if (userAnswer.toUpperCase() == answer.answer) {
		alert("Correct! The correct answer is " + answer.answer + "\n\n" + answer.question + "\n\nA: " + answer.optionA + "\nB: " + answer.optionB + "\nC: " + answer.optionC + "\nD: " + answer.optionD);
	} else {
		alert("Incorrect! The correct answer is " + answer.answer + "\nExplanation: " + answer.explanation + "\n\n" + answer.question + "\n\nA: " + answer.optionA + "\nB: " + answer.optionB + "\nC: " + answer.optionC + "\nD: " + answer.optionD);
	}

	document.getElementById("mcq-btn").disabled = false;
	document.getElementById("mcq-btn").innerText = "Generate MCQ";
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