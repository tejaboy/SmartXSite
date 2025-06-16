let extractedText = "";

// Helper function to detect specified element in the DOM
function waitForElementToExist(selector) {
	return new Promise((resolve) => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(() => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			subtree: true,
			childList: true,
		});
	});
}

// **Add Summarization Button**
waitForElementToExist(".d2l-popup-printdownload").then((elm) => {
	addButton(elm, "📓 Summarise", summarize);
});

function addButton(elm, text, onClick) {
	const firstChild = elm.firstElementChild;
	const button = document.createElement("d2l-button-subtle");
	button.setAttribute("text", text);
	button.setAttribute("type", "button");

	button.addEventListener("click", () => {
		console.log(`${text} button clicked!`);
		button.blur();
		onClick();
	});

	firstChild.appendChild(button);
}

// **Extract Text and Send to API**
async function summarize() {
	console.log("Summarization process is starting!");

	const loadingCircle = showLoadingOverlay("Summarizing in progress ...");

	const iframes = document.querySelectorAll("iframe");
	if (iframes.length === 0) {
		console.log("No iframes found.");
		hideLoadingOverlay(loadingCircle);
		return;
	}

	const iframe = iframes[0];

	try {
		if (iframe.contentWindow && iframe.contentWindow.document) {
			const iframeDocument = iframe.contentWindow.document;
			const viewer = iframeDocument.querySelector("#viewerContainer");

			if (viewer) {
				const allText = await extractTextPageByPage(viewer);
				extractedText = "";
				extractedText = [...new Set(allText.split(/ {2,}/))].join(" ");
				extractedText = extractedText.trim();
				console.log("Extracted text:", extractedText);
				console.log("Summerizing text with AI ...");

				if (chrome && chrome.storage && chrome.storage.local) {
					chrome.storage.local.set({ extractedText: extractedText }, () => {
						if (chrome.runtime.lastError) {
							console.error("Storage Error:", chrome.runtime.lastError);
						} else {
							console.log("Extracted text stored successfully.");
							chrome.runtime.sendMessage({ action: "open_popup" });

							hideLoadingOverlay(loadingCircle);
						}
					});
				} else {
					console.error("Chrome storage is not available.");
				}

				hideLoadingOverlay(loadingCircle);
			} else {
				console.log("PDF viewer element not found.");
				hideLoadingOverlay(loadingCircle);
			}
		} else {
			console.log("Iframe content not accessible.");
			hideLoadingOverlay(loadingCircle);
		}
	} catch (error) {
		console.error("Error extracting text:", error);
		hideLoadingOverlay(loadingCircle);
	}
}

// **Extract Text Page by Page**
async function extractTextPageByPage(viewer) {
	let allText = "";
	let currentScrollY = 0;
	let previousScrollY = -1;

	// Start from top
	viewer.scrollTop = 0;

	while (currentScrollY !== previousScrollY) {
		previousScrollY = currentScrollY;
		viewer.scrollTop += viewer.clientHeight;
		await new Promise((resolve) => setTimeout(resolve, 200));

		const text = extractTextFromElement(viewer);
		allText += " " + text;

		currentScrollY = viewer.scrollTop;
	}
	return allText;
}

// **Recursively Extract Text from PDF Elements**
function extractTextFromElement(element) {
	let text = "";
	const nodes = element.childNodes;

	for (const node of nodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			text += node.textContent;
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			text += " " + extractTextFromElement(node);
		}
	}
	return text;
}

function showLoadingOverlay(overlayText) {
	const overlay = document.createElement("div");
	overlay.id = "summary-overlay";
	overlay.style.position = "fixed";
	overlay.style.top = "0";
	overlay.style.left = "0";
	overlay.style.width = "100%";
	overlay.style.height = "100%";
	overlay.style.background = "rgba(0, 0, 0, 0.5)";
	overlay.style.display = "flex";
	overlay.style.flexDirection = "column"; // Change to column direction for vertical stacking
	overlay.style.justifyContent = "center";
	overlay.style.alignItems = "center";
	overlay.style.color = "#fff";
	overlay.style.fontSize = "20px";
	overlay.style.zIndex = "10000";

	// Create the circular loading element
	const loadingCircle = document.createElement("div");
	loadingCircle.style.border = "8px solid #f3f3f3"; // Light gray background
	loadingCircle.style.borderTop = "8px solid #3498db"; // Blue color for the rotating part
	loadingCircle.style.borderRadius = "50%";
	loadingCircle.style.width = "50px";
	loadingCircle.style.height = "50px";
	loadingCircle.style.animation = "spin 1.5s linear infinite"; // Smooth spinning animation

	// Create the text element
	const text = document.createElement("div");
	text.textContent = overlayText;
	text.style.marginTop = "10px";

	// Create a line break element
	const br = document.createElement("br");

	// Append elements to the overlay
	overlay.appendChild(loadingCircle);
	overlay.appendChild(br);  // Add line break
	overlay.appendChild(text);

	document.body.appendChild(overlay);

	// CSS for the animation
	const style = document.createElement("style");
	style.innerHTML = `
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
	`;
	document.head.appendChild(style);

	return loadingCircle;
}

function hideLoadingOverlay(loadingCircle) {
	const overlay = document.getElementById("summary-overlay");
	if (overlay) {
		document.body.removeChild(overlay);
	}
}

/* Quiz Helper */
waitForElementToExist(".d2l-button").then((elm) => {
    const elements = document.querySelectorAll('.d2l-quiz-question-autosave-container');
    console.log(elements.length);

    elements.forEach(elm => {
        // Create new div
        const newDiv = document.createElement("div");

        // Create new button
        const button = document.createElement("button");
        button.classList.add("d2l-button");
        button.textContent = "Eliminate 1"; // Set button text

        // Add click event listener
        button.addEventListener("click", () => {
            if (elm.dataset.aiAnswer) {
                // Use cached answer
                handleAiResponse(elm, button, JSON.parse(elm.dataset.aiAnswer));
            } else {
                // Fetch new answer
                button.textContent = "Asking AI ..."; // Change button text
                let question = getQuestion(elm);
                let optionElm = elm.querySelector(".dfs_c");

                if (optionElm) {
                    let optionBlocks = Array.from(optionElm.querySelectorAll("d2l-html-block"));

                    let options = optionBlocks.map(block => {
                        let parser = new DOMParser();
                        let doc = parser.parseFromString(block.getAttribute("html"), "text/html");
                        return doc.body.textContent.trim(); // Extract clean text
                    });

                    // Send data to AI server for elimination
                    fetch("http://localhost:5001/eliminate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            question: question,
                            options: options
                        }),
                    })
                    .then((response) => response.json())
                    .then((data) => {
                        console.log(data);
                        elm.dataset.aiAnswer = JSON.stringify(data); // Cache the answer
                        handleAiResponse(elm, button, data);
                    })
                    .catch((error) => {
                        console.error("Error in fetching AI response:", error);
                        button.remove(); // Remove button in case of error
                    });
                } else {
                    console.error("Options not found");
                    button.remove(); // Remove button if no options exist
                }
            }
        });

        // Append button to div
        newDiv.appendChild(button);

        // Append div as the last child of elm
        elm.appendChild(newDiv);
    });
});

function handleAiResponse(elm, button, data) {
    let optionElm = elm.querySelector(".dfs_c");
    let optionBlocks = Array.from(optionElm.querySelectorAll("d2l-html-block"));
    let options = optionBlocks.map(block => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(block.getAttribute("html"), "text/html");
        return doc.body.textContent.trim(); // Extract clean text
    });

    // Filter out the correct answer index and get the remaining options
    let incorrectOptions = options.filter((_, index) => index !== data.answer);

    // Filter out already eliminated options
    let availableIncorrectOptions = incorrectOptions.filter((option, index) => {
        let optionIndex = options.indexOf(option);
        let matchingBlock = optionBlocks[optionIndex];
        if (matchingBlock) {
            let label = matchingBlock.closest("label");
            return !label || !label.style.textDecoration.includes("line-through");
        }
        return true; // If no label, consider it available
    });

    // Select a random incorrect option
    let randomIncorrectOption;
    if (availableIncorrectOptions.length > 0) {
        randomIncorrectOption = availableIncorrectOptions[Math.floor(Math.random() * availableIncorrectOptions.length)];
        console.log("Random incorrect option:", randomIncorrectOption);

        // Find the index of the random incorrect option in the original option blocks
        let indexToEliminate = options.indexOf(randomIncorrectOption);

        // Ensure the index exists and isn't the correct answer
        if (indexToEliminate !== -1 && indexToEliminate !== data.answer) {
            // Find and strike through the eliminated option
            let matchingBlock = optionBlocks[indexToEliminate];
            if (matchingBlock) {
                let label = matchingBlock.closest("label");
                if (label) {
                    label.style.textDecoration = "line-through";
                    label.style.opacity = "0.5"; // Optional: Make it faded
                }
            }

            optionBlocks.splice(indexToEliminate, 1); // Remove the eliminated option

            if (availableIncorrectOptions.length === 1)
                button.remove(); // Remove button if only one option remains
            else
                button.textContent = "Eliminate 1 more"; // Change button text
        } else {
            console.error("Invalid index to eliminate");
        }
    } else {
        console.log("No more incorrect options to eliminate");
        button.remove(); // Remove button if no available incorrect option left
    }
}

function getQuestion(elm) {
	const htmlBlock = elm.querySelector("d2l-html-block");

    if (htmlBlock) {
        const tempDiv = document.createElement("div"); // Create a temporary div
        tempDiv.innerHTML = htmlBlock.getAttribute("html"); // Set the inner HTML
		return tempDiv.textContent.trim();
    }

	return null;
}