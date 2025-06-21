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
// enhancedSequenceViewer
waitForElementToExist(".d2l-popup-printdownload").then((elm) => {
	const button = document.createElement("d2l-button-subtle");
	button.setAttribute("text", "📓 Summarise");
	button.setAttribute("type", "button");

	button.addEventListener("click", () => {
		button.blur();
		summarize();
	});

	elm.firstElementChild.appendChild(button);
});

// viewContent
waitForElementToExist(".d2l-page-header-side").then((elm) => {
	const firstElement = elm.lastElementChild;

	const link = document.createElement("a");
	link.className = "d2l-iterator-button d2l-iterator-button-notext";
	link.setAttribute("role", "button");
	link.href = "#";
	link.appendChild(document.createTextNode("📓 Summarise"));

	link.addEventListener("click", () => {
		summarize();
	});

	firstElement.appendChild(link);
});

// enforced -> HTML
// If URL is https://xsite.singaporetech.edu.sg/content/enforced/
if (window.location.href.includes("/content/enforced/")) {
	waitForElementToExist(".slide-menu-toolbar").then((toolbar) => {
		const summariseItem = document.createElement("li");
		summariseItem.id = "summarise";
		summariseItem.className = "toolbar-panel-button";

		const icon = document.createElement("span");
		icon.textContent = "📓";
		icon.style.display = "inline-block";
		icon.style.fontSize = "32px";        // make it visually match others
		icon.style.lineHeight = "32px";
		icon.style.width = "32px";
		icon.style.height = "32px";
		icon.style.textAlign = "center";

		const label = document.createElement("span");
		label.className = "slide-menu-toolbar-label";
		label.textContent = "Summarise";

		summariseItem.appendChild(icon);
		summariseItem.appendChild(document.createElement("br"));
		summariseItem.appendChild(label);

		summariseItem.addEventListener("click", () => {
			summarizeHTML();
		});

		toolbar.appendChild(summariseItem);
	});
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

				showSummaryPopup(extractedText);
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

function summarizeHTML() {
	const container = document.querySelector(".slides");

	if (!container) {
		console.error("No .slides container found.");
		return;
	}

	// Collect all section elements, including hidden ones
	const slides = container.querySelectorAll("section");

	let extractedText = "";

	slides.forEach(slide => {
		// Temporarily clone each slide to force access to innerText even if hidden
		const clone = slide.cloneNode(true);

		// Force visibility for hidden content
		clone.hidden = false;
		clone.style.display = "block";
		clone.removeAttribute("aria-hidden");

		// Append with some spacing between slides
		extractedText += clone.innerText.trim() + "\n\n";
	});

	extractedText = extractedText.trim();
	showSummaryPopup(extractedText);
}

/* Show Summary Popup */
function showSummaryPopup(text) {
	if (chrome && chrome.storage && chrome.storage.local) {
		chrome.storage.local.set({ extractedText: text }, () => {
			if (chrome.runtime.lastError) {
				console.error("Storage Error:", chrome.runtime.lastError);
			} else {
				console.log("Extracted text stored successfully.");
				chrome.runtime.sendMessage({ action: "open_popup" });
			}
		});
	} else {
		console.error("Chrome storage is not available.");
	}
}

/* Overlay for loading indication */
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