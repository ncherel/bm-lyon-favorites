// Listen for messages from the content script
window.addEventListener('message', (event) => {
  // Check the origin and type of the message
  if (event.data.type === 'GET_VARIABLE') {
    const variableName = event.data.variableName;
    const variableValue = window[variableName];

    // Send the variable value back to the content script
    window.postMessage({ type: 'VARIABLE_RESPONSE', variableName, variableValue }, '*');
  }
});
