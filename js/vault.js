// js/vault.js

const VAULT_KEY = "seedVault";
const VAULT_ORDER_KEY = "seedVaultOrder";

function generateSeed(length = 16) {
	const chars =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
	let seed = "";
	for (let i = 0; i < length; i++) {
		seed += chars[Math.floor(Math.random() * chars.length)];
	}
	return seed;
}

function loadOrder() {
	try {
		return JSON.parse(localStorage.getItem(VAULT_ORDER_KEY)) || [];
	} catch {
		return [];
	}
}

function saveOrder(order) {
	localStorage.setItem(VAULT_ORDER_KEY, JSON.stringify(order));
}

const Vault = {

	_load() {
		try {
			return JSON.parse(localStorage.getItem(VAULT_KEY)) || {};
		} catch {
			return {};
		}
	},

	_save(vault) {
		localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
	},

	list() {
		const vault = this._load();
		const order = loadOrder();
		return order.filter(name => vault[name]);
	},

	get(name) {
		const vault = this._load();
		return vault[name] || null;
	},

	create(name) {
		if (!name) throw new Error("Key name is required");

		const vault = this._load();
		if (vault[name]) throw new Error("Key already exists");

		vault[name] = {
			seed: generateSeed()
		};

		this._save(vault);

		const order = loadOrder();
		order.push(name);
		saveOrder(order);
	},

	createImported(name, seed) {
		if (!name || !seed) {
			throw new Error("Name and key are required");
		}

		const vault = this._load();
		if (vault[name]) throw new Error("Key already exists");

		vault[name] = {
			seed
		};

		this._save(vault);

		const order = loadOrder();
		order.push(name);
		saveOrder(order);
	},

	remove(name) {
		const vault = this._load();
		if (!vault[name]) throw new Error("Key does not exist");

		delete vault[name];
		this._save(vault);

		const order = loadOrder().filter(n => n !== name);
		saveOrder(order);
	}
};
