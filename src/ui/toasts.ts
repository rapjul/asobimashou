/**
 * Displays a transient custom toast notification with an icon and message.
 *
 * @param {string} html - Inner HTML markup to render inside the toast body.
 * @param {string} [extraClass=""] - Optional CSS class identifier.
 * @param {number} [duration=4000] - Duration in milliseconds before dismissing.
 * @returns {HTMLElement | null} The created toast element or null if container missing.
 */
export function showToast(
	html: string,
	extraClass: string = "",
	duration: number = 4000,
): HTMLElement | null {
	const container = document.querySelector("#toast-container");
	if (!container) return null;

	const toast = document.createElement("div");
	toast.className = `custom-toast ${extraClass}`.trim();
	toast.innerHTML = html;
	container.appendChild(toast);

	// Trigger reflow to animate in
	void toast.offsetHeight;
	toast.classList.add("show");

	if (duration > 0) {
		setTimeout(() => {
			toast.classList.remove("show");
			setTimeout(() => {
				toast.remove();
			}, 300);
		}, duration);
	}

	return toast;
}

/**
 * Escapes text inserted into the small HTML templates used by toast messages.
 *
 * @param {string} text - Untrusted text to include in a toast.
 * @returns {string} HTML-safe text.
 */
function escapeHTML(text: string): string {
	return text.replace(/[&<>"']/g, (character) => {
		const replacements: Record<string, string> = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		};
		return replacements[character] ?? character;
	});
}

/**
 * Displays a toast reminding the player about the Romaji apostrophe rule.
 *
 * @param {string} romaji - Correct Romaji with apostrophe.
 * @param {string} kana - Corresponding Kana string.
 * @returns {void}
 */
export function showApostropheToast(romaji: string, kana: string): void {
	const html = `
    <i class="bi-info-circle text-info"></i>
		<span><strong>Tip:</strong> Type <code>'</code> for <strong>${escapeHTML(kana)}</strong> (e.g. <code>${escapeHTML(romaji)}</code>).</span>
  `;
	showToast(html, "toast-apostrophe");
}

/**
 * Displays a toast reminding the player how to write lengthened vowels.
 *
 * @returns {void}
 */
export function showVowelLengthToast(): void {
	const html = `
    <i class="bi-exclamation-circle text-warning"></i>
    <span><strong>Hint:</strong> Prolonged vowels (ー) are written by doubling the vowel (e.g. <code>oo</code> or <code>ii</code>), not with <code>-</code>.</span>
  `;
	showToast(html, "toast-vowel-length");
}

/**
 * Displays a toast notifying the user of offline font fallback.
 *
 * @param {string} fontName - Name of the selected font.
 * @returns {void}
 */
export function showFontOfflineToast(fontName: string): void {
	const html = `
    <i class="bi-fonts text-warning"></i>
		<span>Offline: <strong>${escapeHTML(fontName)}</strong> has not been cached yet. Choose a system font or reconnect.</span>
  `;
	showToast(html, "toast-font-fallback");
}

/**
 * Displays a toast notification informing the user they are offline.
 *
 * @returns {void}
 */
export function showOfflineToast(): void {
	const html = `
    <i class="bi-wifi-off text-danger"></i>
    <span>Offline. <br class="d-block d-sm-none">Running from cache.</span>
  `;
	showToast(html, "toast-offline");
}

/**
 * Displays a toast notification informing the user they are back online.
 *
 * @returns {void}
 */
export function showOnlineToast(): void {
	const html = `
    <i class="bi-wifi text-success"></i>
    <span>Back online! <br class="d-block d-sm-none">Connection restored.</span>
  `;
	showToast(html, "toast-online");
}

/**
 * Displays a toast notification when the content is first successfully cached.
 *
 * @returns {void}
 */
export function showCacheSuccessToast(): void {
	const html = `
    <i class="bi-cloud-check-fill text-success"></i>
    <span>Content cached! <br class="d-block d-sm-none">Ready for offline use.</span>
  `;
	showToast(html, "toast-cached");
}

/**
 * Displays a toast notification when a cache update is found and installed.
 *
 * @returns {void}
 */
export function showCacheUpdateToast(): void {
	const html = `
    <i class="bi-arrow-clockwise text-primary"></i>
    <span>Cache updated! <br class="d-block d-sm-none">Reload the page to see changes.</span>
  `;
	showToast(html, "toast-updated", 6000);
}

/**
 * Toggles the visibility of the persistent offline badge in the DOM.
 *
 * @param {boolean} isOffline - True to display the badge, false to hide it.
 * @returns {void}
 */
export function toggleOfflineBadge(isOffline: boolean): void {
	const badge = document.getElementById("offline-badge");
	if (!badge) return;

	if (isOffline) {
		badge.classList.remove("d-none");
		void badge.offsetHeight;
		badge.classList.add("show");
	} else {
		badge.classList.remove("show");
		setTimeout(() => {
			if (!badge.classList.contains("show")) {
				badge.classList.add("d-none");
			}
		}, 300);
	}
}
