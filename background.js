// Listen for messages from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	console.log("Message received:", message.action);

	if (message.action === "open_popup") {
		chrome.windows.create({
			url: chrome.runtime.getURL("summary.html"),
			type: "popup",
			width: 700, // Adjust as needed
			height: 600 // Adjust as needed
		});
	}
	
	return true;
});

// Function to keep the service worker alive
function keepServiceWorkerAlive() {
	setInterval(() => {
		// Perform a trivial operation to reset the idle timer
		chrome.runtime.getPlatformInfo(() => {
		});
	}, 20000); // Interval set to 20 seconds
}
  
// Call the function to start the keep-alive mechanism
keepServiceWorkerAlive();