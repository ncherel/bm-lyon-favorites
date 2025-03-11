const verbose = false;

// Read ID from the URL
// sanitize and read the identifier (last 10 digits)
function getID() {
    const url = new URL(document.URL);
    url.search = '';
    url.hash = '';
    let string = url.toString();
    string = string.replaceAll(".locale=fr", "");
    return string.substring(string.length - 10);
}


// Get title from window title
function getTitle() {
    const title = document.querySelector("title").textContent;
    return title.split(" [")[0];
}


// Retrieve the list of IDs from storage
async function getList() {
    const result = await browser.storage.local.get({"ids": [], "titles": []});
    if (verbose) {
	console.log('Current list:', result.titles);
    }
    return result;
}

// Set the list of IDs in storage
async function setList(list) {
    return browser.storage.local.set(list);
}


// Wait for an element to appear in the DOM
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`Element with selector ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}


// Get the target element and add the button
async function getButtonBar() {
    try {
	// TODO: Find alternative (this is probably going to fail at some point)
	const bar = await waitForElement('main > div > div > div > div > div > div > div:last-child > div:last-child > div:last-child > div');
	if (verbose) {
	    console.log("Found button bar");
	}
    return bar;
  } catch (error) {
    console.error(error);
  }
}

// Update the button's appearance based on the favorites list
function updateButtonAppearance(button, list) {
    const id = getID();
    const icon = button.querySelector('.icon');
    const text = button.querySelector('.text');
  if (list.ids.includes(id)) {
    button.classList.add('favorited');
      text.textContent = 'Unfavorite';
      icon.textContent = 'favorite';
  } else {
    button.classList.remove('favorited');
      text.textContent = 'Favorite';
      icon.textContent = 'favorite_border';
  }
}

// Add the button to the page and setup the click event
async function addButton() {
  const list = await getList();
  const buttonBar = await getButtonBar();

    if (buttonBar) {
	// Create button from existing button
	const button = buttonBar.appendChild(buttonBar.children[0].cloneNode(true));

	// Add classes to find them easily
	const icon = button.children[0].children[0];
	icon.classList.add("icon");
	const text = button.children[0].children[1];
	text.classList.add("text");

	// Set icon and text based on presence in list
	updateButtonAppearance(button, list);

	button.addEventListener('click', function(e) {
	    toggleFavorite(list, button);
	});
  }
}

// Toggle the ID in the favorites list and update the button
function toggleFavorite(list, button) {
    const id = getID();
    const index = list.ids.indexOf(id);
    if (index !== -1) {
	list.ids.splice(index, 1); // Remove the ID from the list
	list.titles.splice(index, 1); // Remove the ID from the list
    } else {
	list.ids.push(id);
	list.titles.push(getTitle());
    }

    setList(list).then(() => {
      updateButtonAppearance(button, list);
      if (verbose) {
	  console.log('Updated list:', list);
      }
  });
}

// Function to handle URL changes
function handleUrlChange() {
    if (verbose) {
	console.log('URL changed:', window.location.href);
    }

    // Test if page is on an individual item
    if (document.URL.includes("ark:")) {	
	addButton();
    }
}

// Observe changes in the DOM
const observer = new MutationObserver(handleUrlChange);
observer.observe(document.querySelector("title"), { childList: true, subtree: true, characterData: true });

// Inject a script into the host page
const script = document.createElement('script');
script.src = browser.runtime.getURL('injected.js');
document.head.appendChild(script);

// Function to request a variable from the host page
function requestVariable(variableName) {
  // Send a message to the injected script
  window.postMessage({ type: 'GET_VARIABLE', variableName }, '*');
}

// Listen for responses from the injected script
window.addEventListener('message', (event) => {
  if (event.data.type === 'VARIABLE_RESPONSE') {
    const variableName = event.data.variableName;
      const variableValue = event.data.variableValue;
      window[variableName] = variableValue;

      if (variableName == "mobileSettings" && variableValue.apiToken) {
	  console.log("writing the apiToken");
	  browser.storage.local.set({"apiToken": variableValue.apiToken});
      }
      if (verbose) {
	  console.log(`Received ${variableName}:`, variableValue);
      }
      console.log(mobileSettings.apiToken);
  }
});

// Request a variable from the host page
setTimeout(() => {requestVariable('mobileSettings');}, 300);


