const CACHE_NAME = "layers-v1.47.1";

const ASSETS = [
	"/",
	"/index.html",
	"/admin.html",
	"/manifest.json",

	// styles
	"/style/style.css",

	// scripts
	"/js/bootstrap.js",
	"/js/crypto.js",
	"/js/vault.js",
	"/js/admin.js",
	"/js/impact.js"
];

self.addEventListener("install", event => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
	);
});

self.addEventListener("fetch", event => {
	event.respondWith(
		caches.match(event.request).then(response =>
		response || fetch(event.request)
		)
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches.keys().then(keys =>
			Promise.all(
				keys
					.filter(key => key !== CACHE_NAME)
					.map(key => caches.delete(key))
			)
		)
	);
});