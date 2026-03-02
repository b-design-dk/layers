// js/key.js

function redirectToAdmin() {
	window.location.href = "admin.html";
}

function buildInviteLink(name, seed) {
	const baseUrl = new URL("index.html", window.location.origin).href;
	return `${baseUrl}#invite=${encodeURIComponent(seed)}&name=${encodeURIComponent(name)}`;
}

document.addEventListener("DOMContentLoaded", () => {

	// -------------------------
	// Routing & state
	// -------------------------

	const params = new URLSearchParams(window.location.search);

	const name = params.get("name");
	const from = params.get("from");

	if (!name) return redirectToAdmin();

	const entry = Vault.get(name);
	if (!entry) return redirectToAdmin();

	const seed = entry.seed;

	// Dynamic back link
	const backLink = document.querySelector('a[href="admin.html"]');
	if (from === "index" && backLink) {
		backLink.href = "index.html";
	}

	// Set title
	document.title = `Layers - Edit ${name}`;

	// -------------------------
	// Rename logic
	// -------------------------

	const nameInput = document.getElementById("keyNameInput");
	const saveBtn = document.getElementById("saveNameBtn");

	nameInput.value = name;

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

		Vault.createImported(newName, oldEntry.seed);
		Vault.remove(name);

		// Preserve "from" context on redirect
		let newUrl = `key.html?name=${encodeURIComponent(newName)}`;
		if (from === "index") {
			newUrl += "&from=index";
		}

		window.location.href = newUrl;
	});

	// -------------------------
	// Invite link
	// -------------------------

	const inviteLink = buildInviteLink(name, seed);

	// -------------------------
	// QR generation
	// -------------------------

	if (typeof QRCode !== "undefined") {

		const qrWrapper = document.getElementById("qrWrapper");
		qrWrapper.innerHTML = "";

		new QRCode(qrWrapper, {
			text: inviteLink,
			width: 260,
			height: 260,
			colorDark: "#202126",
			colorLight: "#EDEDED",
			correctLevel: QRCode.CorrectLevel.M
		});

	} else {
		console.warn("QRCode library not loaded");
	}

	// -------------------------
	// Share over URL
	// -------------------------

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

	// -------------------------
	// Delete logic
	// -------------------------

	const deleteBtn = document.getElementById("deleteKeyBtn");
	const deleteModal = document.getElementById("deleteModal");

	deleteBtn.addEventListener("click", () => {
		deleteModal.showModal();
	});

	deleteModal.addEventListener("close", () => {
		if (deleteModal.returnValue !== "confirm") return;

		Vault.remove(name);

		if (from === "index") {
			window.location.href = "index.html";
		} else {
			window.location.href = "admin.html";
		}
	});

});