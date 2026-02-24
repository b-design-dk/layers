const IMPACT_KEY = "layersImpactCount";

function getImpactCount() {
	return parseInt(localStorage.getItem(IMPACT_KEY) || "0", 10);
}

function incrementImpact() {
	const current = getImpactCount();
	localStorage.setItem(IMPACT_KEY, current + 1);
}

function updateImpactDisplay() {
	const el = document.getElementById("impactCount");
	if (!el) return;
	el.textContent = getImpactCount();
}