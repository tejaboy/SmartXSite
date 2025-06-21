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