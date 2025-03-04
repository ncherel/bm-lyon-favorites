// Map library ids to localized names
const all_libraries = [
    "1ARRDT",
    "2ARRDT",
    "3ARRDT",
    "3LAC",
    "4ARRDT",
    "5MENIV",
    "5STJE",
    "6ARRDT",
    "7GERLA",
    "7JMACE",
    "8ARRDT",
    "9VAISE",
    "9STRAM",
    "9LDUCH",
    "PARTDI"
]

const library_names = {
    "1ARRDT": "1er",
    "2ARRDT": "2e",
    "3ARRDT": "3e-Duguesclin",
    "3LAC": "3e-Lacassagne",
    "4ARRDT": "4e",
    "5MENIV": "5e-Ménival",
    "5STJE": "5e-St Jean",
    "6ARRDT": "6e",
    "7GERLA": "7e-Gerland",
    "7JMACE": "7e-J.Macé",
    "8ARRDT": "8e",
    "9VAISE": "9e-Vaise",
    "9STRAM": "9e-St. Rambert",
    "9LDUCH": "9e-Duchère",
    "PARTDI": "Part-Dieu"
};


function getLibraries() {
    return browser.storage.local.get({"libraries": null}).then((result) => {
	if (result.libraries) {
	    return result.libraries;
	}

	// Default to all true
	const default_libraries = {};
	for(i = 0; i < all_libraries.length; i++) {
	    default_libraries[all_libraries[i]] = true;
	}

	return default_libraries;
    });
}


addCheckboxes();


// Build the checkboxes for setting the list of libraries
function createCheckbox(value, text, container) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.id = "checkbox" + text;
    label.textContent = text;
    label.htmlFor = input.id;
    container.appendChild(input);
    container.appendChild(label);
    return input;
}


async function addCheckboxes() {
    my_libraries = await getLibraries();
    console.log(my_libraries);
    // build checkboxes
    for (i = 0; i < all_libraries.length; i++) {
	const container = document.querySelector("#checkbox-container");
	checkbox = createCheckbox(all_libraries[i], library_names[all_libraries[i]], container);
	checkbox.checked = my_libraries[all_libraries[i]];

	// Update local storage and redraw Table
	checkbox.addEventListener('change', function() {
	    console.log("click", this.value, this.checked);
	    my_libraries[this.value] = this.checked;
	    update_visibility(my_libraries);
	    browser.storage.local.set({"libraries": my_libraries});
	});
    }
}

function createLink(title, id) {
    const link = document.createElement('a');
    link.textContent = title;
    link.setAttribute("href", "https://catalogue.bm-lyon.fr/ark:/75584/pf" + id)
    return link;
}

// Function to populate the table
function populateTable(itemList) {
    // Create table headers based on the number of libraries 
    const tableHeadRow = document.querySelector('#itemTable thead tr');

    for (i = 0; i < all_libraries.length; i++) {
	const library_name = document.createElement('th');
	library_name.textContent = library_names[all_libraries[i]];
	tableHeadRow.appendChild(library_name);
    }

    // Add rows in the table
    const tableBody = document.querySelector('#itemTable tbody');

    // Clear existing rows in the table body
    tableBody.innerHTML = '';

    // Loop through the list of items and create a row for each item
    for (i = 0; i < itemList.titles.length; i++) {
        const row = document.createElement('tr');

        // Create cells for each property of the item
        const idCell = document.createElement('td');
        idCell.appendChild(createLink(itemList.titles[i], itemList.ids[i]));
        row.appendChild(idCell);

	for (const library in all_libraries) {
            const nameCell = document.createElement('td');
            nameCell.textContent = "?";
            row.appendChild(nameCell);
	}

        // Append the row to the table body
        tableBody.appendChild(row);
    }

    browser.storage.local.get("libraries").then((result) => {
	update_visibility(result.libraries);
    });
}

function update_visibility(my_libraries) {
    for(i = 0; i < all_libraries.length; i++) {
	const tableHeadRow = document.querySelector('#itemTable thead th:nth-child('+ (i+2) + ')');
	tableHeadRow.style.display = my_libraries[all_libraries[i]] ? '' : 'none';
	const cells = document.querySelectorAll('#itemTable tbody td:nth-child(' + (i+2) + ')');
	cells.forEach(cell => {
	    cell.style.display = my_libraries[all_libraries[i]] ? '' : 'none'
	});
    }
}

// Populate table
browser.storage.local.get({"ids": [], "titles": []}).then((result) => populateTable(result));

// Availability button
const button = document.querySelector("#book");
button.addEventListener("click", clickButton);

// Compute key
function hash(input) {
  const decodedString = input.normalize("NFC");
  let hash = 305419896;
  const length = decodedString.length;

  for (let i = 0; i < length; i++) {
    hash += decodedString.charCodeAt(i) * (i + 1);
  }

  return hash.toString();
}

async function callAPI(id, apiToken) {
    // URL formatting
    const base_url = "https://catalogue.bm-lyon.fr/in/rest/api/notice";
    const parameters = "?id=p::usmarcdef_" + id + "&locale=en&aspect=Stock&opac=true";

    // Add headers
    const headers = {
        "Accept": "application/json",
        "X-InMedia-Authorization": "Bearer null " + apiToken + " " + hash(parameters)
    };

    try {
        const response = await fetch(base_url + parameters, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
	console.log(json);
        return json;
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

function format_status(code, cell) {
    if (code == "On Shelf") {
	cell.textContent = "✓";
	cell.setAttribute("class", "available");
	return true;
    }
    else {
	cell.textContent = "✗";
	cell.setAttribute("class", "taken");
	return false;
    }
}

async function clickButton(event) {
    try {
        const result = await browser.storage.local.get({ "ids": [], "apiToken": null });

        const ids = result["ids"];
	const apiToken = result["apiToken"];

	const tableBody = document.querySelector('#itemTable tbody');

        for (i = 0; i < ids.length; i++) {
            const json = await callAPI(ids[i], apiToken);
            if (json) {
                // List of availabilities
                if (json["monographicCopies"]) {
		    for (j = 0; j < all_libraries.length; j++) {
			tableBody.children[i].children[j + 1].textContent = "✗";
			tableBody.children[i].children[j + 1].setAttribute("class", "unavailable");
		    }

                    for (const copy of json["monographicCopies"]) {
			let available = false;
			for (const exemplar of copy["children"]) {
			    const data = exemplar["data"];
			    if (!available) {
				const index = all_libraries.indexOf(data["branch"]);
				if (index != -1) {
				    available = available || format_status(data["stat_desc"], tableBody.children[i].children[index + 1]); 
				}
			    }
			}
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error processing URLs:", error);
    }
}


