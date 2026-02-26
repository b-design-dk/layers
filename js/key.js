// js/key.js

function getKeyNameFromUrl() {
	const params = new URLSearchParams(window.location.search);
	return params.get("name");
}

function redirectToAdmin() {
	window.location.href = "admin.html";
}

function buildInviteLink(name, seed) {
	const baseUrl = new URL("index.html", window.location.origin).href;
	return `${baseUrl}#invite=${encodeURIComponent(seed)}&name=${encodeURIComponent(name)}`;
}

document.addEventListener("DOMContentLoaded", () => {

	const name = getKeyNameFromUrl();
	if (!name) return redirectToAdmin();

	const entry = Vault.get(name);
	if (!entry) return redirectToAdmin();

	const seed = entry.seed;

	// Set title
	document.title = `Layers - Edit ${name}`;

	// Populate input
	const nameInput = document.getElementById("keyNameInput");
	nameInput.value = name;
	
	const saveBtn = document.getElementById("saveNameBtn");

	nameInput.addEventListener("input", () => {
		const newName = nameInput.value.trim();

		const changed = newName !== name;
		const valid = newName.length > 0;

		saveBtn.disabled = !(changed && valid);
	});

	saveBtn.addEventListener("click", () => {
		const newName = nameInput.value.trim();

		if (!newName || newName === name) return;

		if (Vault.get(newName)) {
			alert("A key with this name already exists.");
			return;
		}

		const oldEntry = Vault.get(name);
		if (!oldEntry) return;

		// Create new
		Vault.createImported(newName, oldEntry.seed);

		// Remove old
		Vault.remove(name);

		// Redirect to new URL
		window.location.href =
			`key.html?name=${encodeURIComponent(newName)}`;
	});

	// Build invite link
	const inviteLink = buildInviteLink(name, seed);
	
	// --- QR generation ---
	if (typeof QRCode !== "undefined") {

		const qrWrapper = document.getElementById("qrWrapper");

		// Clear in case of reload/navigation edge case
		qrWrapper.innerHTML = "";

		new QRCode(qrWrapper, {
			text: inviteLink,
			width: 260,
			height: 260,
			colorDark: "#E6EAF2",
			colorLight: "#0B0F14",
			correctLevel: QRCode.CorrectLevel.M
		});

	} else {
		console.warn("QRCode library not loaded");
	}

	// Copy button
	const copyBtn = document.getElementById("copyInviteBtn");
	copyBtn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(inviteLink);
			copyBtn.textContent = "Copied";
			setTimeout(() => {
				copyBtn.textContent = "Share over URL";
			}, 1200);
		} catch {
			alert("Copy failed");
		}
	});

	// Delete
	const deleteBtn = document.getElementById("deleteKeyBtn");
	const deleteModal = document.getElementById("deleteModal");

	deleteBtn.addEventListener("click", () => {
		deleteModal.showModal();
	});

	deleteModal.addEventListener("close", () => {
		if (deleteModal.returnValue !== "confirm") return;

		Vault.remove(name);
		window.location.href = "admin.html";
	});

});