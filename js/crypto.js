// js/crypto.js
const LAST_KEY = "lastUsedKey";

// --- Web Crypto helpers ---

async function deriveKeyFromSeed(seed) {
	const enc = new TextEncoder();
	const seedBytes = enc.encode(seed);

	const hash = await crypto.subtle.digest("SHA-256", seedBytes);

	return crypto.subtle.importKey(
		"raw",
		hash,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"]
	);
}

function bufferToBase64(buffer) {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

// --- AES-GCM encryption ---

async function aesEncrypt(text, seed) {
	const key = await deriveKeyFromSeed(seed);
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const enc = new TextEncoder();
	const encoded = enc.encode(text);

	const ciphertext = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv
		},
		key,
		encoded
	);

	// prepend IV
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);

	return bufferToBase64(combined);
}

async function aesDecrypt(payload, seed) {
	const key = await deriveKeyFromSeed(seed);
	const data = new Uint8Array(base64ToBuffer(payload));

	const iv = data.slice(0, 12);
	const ciphertext = data.slice(12);

	const decrypted = await crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv
		},
		key,
		ciphertext
	);

	const dec = new TextDecoder();
	return dec.decode(decrypted);
}

// --- DOM refs ---

let seedSelect, messageInput, output, processBtn, copyBtn;

const importModal = document.getElementById("importModal");

if (importModal) {
	importModal.addEventListener("close", () => {

		if (importModal.returnValue !== "confirm") return;

		const nameInput = document.getElementById("importName");
		const seedInput = document.getElementById("importSeed");

		const name = nameInput.value.trim();
		const seed = seedInput.value.trim();

		try {
			let finalName = name;
			let counter = 1;

			// If name already exists, append (1), (2), ...
			while (Vault.get(finalName)) {
				finalName = `${name} (${counter++})`;
			}

			Vault.createImported(finalName, seed);

			// Refresh dropdown
			refreshSeedDropdown();

			// Select newly imported key
			seedSelect.value = finalName;
			setLastUsedKey(finalName);

		} catch (err) {
			alert(err.message);
		}

		nameInput.value = "";
		seedInput.value = "";
		checkInitializationState();
	});
}

// --- Helpers ---

function setLastUsedKey(name) {
	localStorage.setItem(LAST_KEY, name);
}

function getActiveSeed() {
	const entry = Vault.get(seedSelect.value);
	return entry ? entry.seed : null;
}

// --- Init ---

function initCrypto() {
	
	let hasEngaged = false;
	let justInitialized = false;

	seedSelect = document.getElementById("seedSelect");
	messageInput = document.getElementById("message");
	output = document.getElementById("output");
	processBtn = document.getElementById("processBtn");
	copyBtn = document.getElementById("copyBtn");

	refreshSeedDropdown();
	checkInitializationState();
	
	const initBtn = document.getElementById("initCreateBtn");

	if (initBtn) {
		initBtn.addEventListener("click", () => {
			const name = prompt("Name this key:");
			if (!name) return;

			try {
				Vault.create(name);
				refreshSeedDropdown();
				checkInitializationState();
				justInitialized = true;
				document.body.classList.add("just-initialized");
			} catch (err) {
				alert(err.message);
			}
		});
	}
	
	const shareInlineBtn = document.getElementById("shareInlineBtn");

	if (shareInlineBtn) {
		shareInlineBtn.addEventListener("click", async () => {
			const activeName = seedSelect.value;
			const entry = Vault.get(activeName);

			if (!entry || !entry.seed) return;

			const baseUrl = window.location.origin + window.location.pathname;
			const link = `${baseUrl}#invite=${encodeURIComponent(entry.seed)}&name=${encodeURIComponent(activeName)}`;

			const invitationText = `Layers key invitation:
	${link}`;

			try {
				await navigator.clipboard.	writeText(invitationText);

				const originalText = shareInlineBtn.textContent;
				shareInlineBtn.textContent = "Link copied to clipboard";

				setTimeout(() => {
					shareInlineBtn.textContent = originalText;
				}, 1500);

			} catch {
				alert("Copy failed");
			}
		});
	}
	
	seedSelect.addEventListener("change", () => {
		setLastUsedKey(seedSelect.value);
	});
	
	function autoGrow(el) {
		el.style.height = "auto";
		el.style.height = el.scrollHeight + "px";
	}

	// --- Process button ---

	processBtn.addEventListener("click", async () => {

	const seed = getActiveSeed();
	if (!seed) return alert("Select a key first");

	const input = messageInput.value.trim();
	if (input === "") return;

	const section = output.parentElement;

	// Lock button visually
	processBtn.classList.add("is-processing");
	processBtn.disabled = true;

	// Micro boot sequence
	setTimeout(async () => {

		// RESET OUTPUT STATE
		output.classList.remove("is-decrypted");
		section.classList.remove("section--decrypted");

		let decrypted = null;
		let matchedKeyName = null;

		// Try active key first
		try {
			const activeSeed = getActiveSeed();
			decrypted = await aesDecrypt(input, activeSeed);
			matchedKeyName = seedSelect.value;
		} catch {
			decrypted = null;
		}

		// If failed, try all other keys
		if (decrypted === null) {
			const keys = Vault.list();

			for (const name of keys) {
				if (name === seedSelect.value) continue;

				const entry = Vault.get(name);
				if (!entry) continue;

				try {
					decrypted = await aesDecrypt(input, entry.seed);
					matchedKeyName = name;
					break;
				} catch {
					// keep trying
				}
			}
		}

	if (decrypted !== null) {

		// Switch active key if needed
		if (matchedKeyName && matchedKeyName !== seedSelect.value) {
			seedSelect.value = matchedKeyName;
			setLastUsedKey(matchedKeyName);
		}

		// Decrypt mode
		output.value = decrypted;

		messageInput.value = "";
		autoGrow(messageInput);

		output.classList.add("is-decrypted");
		section.classList.add("section--decrypted");

		requestAnimationFrame(() => {
			autoGrow(output);
		});

	} else {

		// Encrypt mode
		const encrypted = await aesEncrypt(input, getActiveSeed());
		output.value = encrypted;

		autoGrow(output);
	}
			updateProcessButton();
			updateCopyButton();
			autoGrow(output);

			processBtn.classList.remove("is-processing");
			processBtn.disabled = false;

		}, 180);
	});

	// --- Copy button ---

	copyBtn.addEventListener("click", async () => {
		if (copyBtn.disabled) return;

		try {
			const encryptedValue = output.value.trim();

			const baseUrl = window.location.origin + window.location.pathname;
			const link = `${baseUrl}#msg=${encodeURIComponent(encryptedValue)}`;

			const message = `Layers encrypted message:
			${link}`;

			await navigator.clipboard.writeText(message);
			
			incrementImpact();
			updateImpactDisplay();

			copyBtn.textContent = "Copied to Clipboard";

			setTimeout(() => {

				output.value = "";
				messageInput.value = "";

				autoGrow(output);
				autoGrow(messageInput);

				updateCopyButton();
				updateProcessButton();

				// Reset system state
				hasEngaged = false;
				document.body.classList.remove("system-engaged");

			}, 1000);
			setTimeout(() => {
				copyBtn.textContent = "Copy Encrypted Message";
			}, 1500);

		} catch {
			alert("Copy failed");
		}
	});

	// --- State logic ---

	function updateProcessButton() {
		const value = messageInput.value.trim();
		const hasValue = value !== "";

		processBtn.disabled = !hasValue;

		if (!hasValue) {
			processBtn.textContent = "Process message";
			return;
		}

		processBtn.textContent = "Process message";
	}

	function updateCopyButton() {
		const value = output.value.trim();
		copyBtn.disabled = value === "";
	}

	// --- Events ---

	messageInput.addEventListener("input", () => {
		
		if (justInitialized) {
			justInitialized = false;
			document.body.classList.remove("just-initialized");
		}

		const value = messageInput.value.trim();
		const nowEngaged = value !== "";

		// First engagement transition
		if (!hasEngaged && nowEngaged) {
			hasEngaged = true;
			document.body.classList.add("system-engaged");
		}

		// Reset to idle
		if (hasEngaged && !nowEngaged) {
			hasEngaged = false;
			document.body.classList.remove("system-engaged");
		}

		updateProcessButton();
		autoGrow(messageInput);
	});

	// Initial state
	updateProcessButton();
	updateCopyButton();

	// Sync across tabs
	window.addEventListener("storage", (e) => {
		if (e.key === "seedVault" || e.key === "seedVaultOrder") {
			refreshSeedDropdown();
		}

		if (e.key === IMPACT_KEY) {
			updateImpactDisplay();
		}
		checkInitializationState();
	});
	
	// --- Handle incoming link message ---
	
	function handleHashMessage() {
		const hash = window.location.hash;

		if (hash.startsWith("#msg=")) {
			const encoded = hash.replace("#msg=", "");
			const decoded = decodeURIComponent(encoded);

			messageInput.value = decoded;
			messageInput.dispatchEvent(new Event("input"));

			history.replaceState(null, "", window.location.pathname);
		}
		
		if (hash.startsWith("#invite=")) {

			const params = new URLSearchParams(hash.substring(1)); // remove #

			const seed = params.get("invite");
			const name = params.get("name");

			const importModal = document.getElementById("importModal");
			const seedInput = document.getElementById("importSeed");
			const nameInput = document.getElementById("importName");

			if (importModal && seedInput) {
				seedInput.value = decodeURIComponent(seed || "");

				if (nameInput && name) {
					nameInput.value = decodeURIComponent(name);
				}

				importModal.showModal();
			}

			history.replaceState(null, "", window.location.pathname);
		}
	}

	// Run once on load
	handleHashMessage();

	// React to hash changes (same tab)
	window.addEventListener("hashchange", handleHashMessage);

	updateImpactDisplay();
}

// --- Dropdown refresh (kept outside for clarity) ---

function refreshSeedDropdown() {

	seedSelect.innerHTML = "";

	const keys = Vault.list();
	const lastUsed = localStorage.getItem(LAST_KEY);

	if (keys.length === 0) {
		const option = document.createElement("option");
		option.textContent = "No keys available";
		option.disabled = true;
		option.selected = true;
		seedSelect.appendChild(option);
		return;
	}

	keys.forEach(name => {
		const option = document.createElement("option");
		option.value = name;
		option.textContent = name;
		seedSelect.appendChild(option);
	});

	if (lastUsed && keys.includes(lastUsed)) {
		seedSelect.value = lastUsed;
	}
	
	setLastUsedKey(seedSelect.value);
}
// --- Initialization ---
function checkInitializationState() {
	const hasKeys = Vault.list().length > 0;

	document.body.classList.toggle("system-uninitialized", !hasKeys);
	document.body.classList.toggle("system-ready", hasKeys);
}