import {
  CHROME_SPECIFIC_STORAGE_KEYS,
  DEFAULT_ONYX_DOMAIN,
  ACTIONS,
} from "./constants.js";

// Create and append error modal HTML
const errorModalHTML = `
  <div id="error-modal">
    <div class="modal-content">
      <h2>Lokte Configuration Error</h2>
      <p>The Lokte configuration needs to be updated. Please check your settings or contact your Lokte administrator.</p>
      <p>Attempted to load: <span id="attempted-url"></span></p>
      <div class="button-container">
        <button id="open-options" class="button primary">Open Extension Options</button>
        <button id="disable-override" class="button secondary">Disable New Tab Override</button>
      </div>
      <p class="shortcut-info">Tip: Use <kbd><span id="shortcut-key"></span></kbd> to quickly toggle the New Tab Override.</p>
    </div>
  </div>
`;

// Add styles for the error modal
const style = document.createElement("style");
style.textContent = `
  #error-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    font-family: var(--font-hanken-grotesk), sans-serif;
  }
  #error-modal .modal-content {
    background-color: var(--card-background-color);
    padding: 25px;
    border-radius: 10px;
    max-width: 95%;
    width: 500px;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  #error-modal h2 {
    margin-top: 0;
    color: var(--text-color);
    font-size: 24px;
    font-weight: 600;
  }
  #error-modal p {
    color: var(--text-light-color);
    margin-bottom: 15px;
    font-weight: 400;
    font-size: 16px;
  }
  #error-modal #attempted-url {
    word-break: break-all;
  }
  #error-modal .button-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  #error-modal .button {
    padding: 10px 20px;
    border-radius: 5px;
    border: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: background-color 0.3s;
  }
  #error-modal .button.primary {
    background-color: var(--primary-color);
    color: #fff;
  }
  #error-modal .button.primary:hover {
    background-color: var(--primary-hover-color);
  }
  #error-modal .button.secondary {
    background-color: var(--secondary-color);
    color: var(--text-color);
  }
  #error-modal .button.secondary:hover {
    background-color: var(--secondary-hover-color);
  }
  #error-modal .shortcut-info {
    margin-top: 15px;
    font-size: 14px;
    color: var(--text-light-color);
    font-weight: 400;
  }
  #error-modal kbd {
    background-color: var(--secondary-color);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 2px 5px;
    font-family: monospace;
    font-weight: 500;
  }
  @media (min-width: 768px) {
    #error-modal .button-container {
      flex-direction: row;
      justify-content: center;
    }
  }
`;

const authModalHTML = `
  <div id="error-modal">
    <div class="modal-content">
      <h2>Onyx Authentication Required</h2>
      <p>You need to log in to access Onyx. Click the button below to authenticate.</p>
      <div class="button-container">
        <button id="open-auth" class="button primary">Log In to Onyx</button>
      </div>
    </div>
  </div>
`;

let errorModal,
  attemptedUrlSpan,
  openOptionsButton,
  disableOverrideButton,
  shortcutKeySpan;

let authModal, openAuthButton;

export function initErrorModal() {
  if (!document.getElementById("error-modal")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../styles/shared.css";
    document.head.appendChild(link);

    document.body.insertAdjacentHTML("beforeend", errorModalHTML);
    document.head.appendChild(style);

    errorModal = document.getElementById("error-modal");
    authModal = document.getElementById("error-modal");
    attemptedUrlSpan = document.getElementById("attempted-url");
    openOptionsButton = document.getElementById("open-options");
    disableOverrideButton = document.getElementById("disable-override");
    shortcutKeySpan = document.getElementById("shortcut-key");

    openOptionsButton.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    disableOverrideButton.addEventListener("click", () => {
      chrome.storage.local.set({ useOnyxAsDefaultNewTab: false }, () => {
        chrome.tabs.update({ url: "chrome://new-tab-page" });
      });
    });

    shortcutKeySpan.textContent =
      navigator.platform.indexOf("Mac") === 0 ? "⌘+Shift+O" : "Ctrl+Shift+O";
  }
}

export function showErrorModal(url) {
  if (!errorModal) {
    initErrorModal();
  }
  if (errorModal) {
    errorModal.style.display = "flex";
    errorModal.style.zIndex = "9999";
    errorModal.style.opacity = "1";
    attemptedUrlSpan.textContent = url;
  }
}

export function hideErrorModal() {
  if (errorModal) {
    errorModal.style.display = "none";
  }
}

export function checkModalVisibility() {
  return errorModal
    ? window.getComputedStyle(errorModal).display !== "none"
    : false;
}

export function initAuthModal() {
  if (!document.getElementById("error-modal")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "../styles/shared.css";
    document.head.appendChild(link);

    document.body.insertAdjacentHTML("beforeend", authModalHTML);
    document.head.appendChild(style);

    authModal = document.getElementById("error-modal");
    openAuthButton = document.getElementById("open-auth");

    openAuthButton.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.storage.local.get(
        { [CHROME_SPECIFIC_STORAGE_KEYS.ONYX_DOMAIN]: DEFAULT_ONYX_DOMAIN },
        (result) => {
          const onyxDomain = result[CHROME_SPECIFIC_STORAGE_KEYS.ONYX_DOMAIN];
          chrome.runtime.sendMessage(
            { action: ACTIONS.CLOSE_SIDE_PANEL },
            () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Error closing side panel:",
                  chrome.runtime.lastError
                );
              }
              // Open the auth window after attempting to close the side panel
              chrome.tabs.create(
                {
                  url: `${onyxDomain}/auth/login`,
                  active: true,
                },
                (_) => {
                  if (chrome.runtime.lastError) {
                    console.error(
                      "Error opening auth tab:",
                      chrome.runtime.lastError
                    );
                  }
                }
              );
            }
          );
        }
      );
    });
  }
}

export function showAuthModal() {
  if (!authModal) {
    initAuthModal();
  }
  if (authModal) {
    authModal.style.display = "flex";
    authModal.style.zIndex = "9999";
    authModal.style.opacity = "1";

    document.body.style.overflow = "hidden";
    authModal.style.position = "fixed";
    authModal.style.top = "0";
    authModal.style.left = "0";
    authModal.style.width = "100%";
    authModal.style.height = "100%";
    authModal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  }
}

export function hideAuthModal() {
  if (authModal) {
    authModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
}
