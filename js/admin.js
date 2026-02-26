// js/admin.js

let selectedKeyName = null;

let tableBody,
generateBtn,
importBtn,
copyModal,
deleteModal,
importModal,
confirmCopyBtn;

function renderKeyList() {
	tableBody.innerHTML = "";

	const keys = Vault.list();

	if (keys.length === 0) {
		tableBody.innerHTML = `
		<li class="meta">There are no keys stored on this device</li>
		`;
		return;
	}

	keys.forEach(name => {
		const item = document.createElement("li");
		item.className = "key-item";
		item.innerHTML = `
			<span class="key-name">${name}</span>
			<div class="key-actions">
				<a class="control"
				   href="key.html?name=${encodeURIComponent(name)}">
					Edit
				</a>
			</div>
		`;
		tableBody.appendChild(item);
	});
}

function initAdmin() {
	tableBody = document.querySelector(".key-list");
	generateBtn = document.getElementById("generateKeyBtn");
	importBtn = document.getElementById("importKeyBtn");

	copyModal = document.getElementById("copyModal");
	importModal = document.getElementById("importModal");

	confirmCopyBtn = document.getElementById("confirmCopyBtn");

	// Table actions
	tableBody.addEventListener("click", (e) => {
		const btn = e.target.closest("button");
		if (!btn) return;

		selectedKeyName = btn.dataset.key;

		if (btn.dataset.action === "copy") copyModal.showModal();
		if (btn.dataset.action === "delete") deleteModal.showModal();
	});

	// Share key (invitation + seed)
	confirmCopyBtn.addEventListener("click", async () => {
		const entry = Vault.get(selectedKeyName);
		if (!entry || !entry.seed) return alert("Key not found");

		const baseUrl = new URL("index.html", window.location.href).href;
		const link = `${baseUrl}#invite=${encodeURIComponent(entry.seed)}&name=${encodeURIComponent(selectedKeyName)}`;

		const invitationText = `Layers key invitation:
${link}`;

		try {
			await navigator.clipboard.writeText(invitationText);
			copyModal.close();
		} catch {
			alert("Copy failed");
		}
	});

	// Generate
	generateBtn.addEventListener("click", () => {
		const name = prompt("Name this key:");
		if (!name) return;

		try {
			Vault.create(name);
			renderKeyList();
		} catch (err) {
			alert(err.message);
		}
	});

	// Import
	importBtn.addEventListener("click", () => {
		importModal.showModal();
	});

	importModal.addEventListener("close", () => {

		const nameInput = document.getElementById("importName");
		const seedInput = document.getElementById("importSeed");

		if (importModal.returnValue === "confirm") {
			const name = nameInput.value.trim();
			const seed = seedInput.value.trim();

			try {
				Vault.createImported(name, seed);
				renderKeyList();
			} catch (err) {
				alert(err.message);
			}
		}

		nameInput.value = "";
		seedInput.value = "";
	});

	renderKeyList();
	
	const resetBtn = document.getElementById("resetStorageBtn");

	if (resetBtn) {
	  resetBtn.addEventListener("click", () => {

		const confirmed = confirm(
		  "This will permanently delete all stored keys on this device.\n\nContinue?"
		);

		if (!confirmed) return;
		Object.keys(localStorage)
		  .filter(key => 
			key.startsWith("seedVault") ||
			key === "lastUsedKey" ||
			key === "layersImpactCount"
		  )
		  .forEach(key => localStorage.removeItem(key));

		location.reload();
	  });
	}
}