import { showErrorModal, showAuthModal } from "../utils/error-modal.js";
import {
  ACTIONS,
  CHROME_MESSAGE,
  WEB_MESSAGE,
  CHROME_SPECIFIC_STORAGE_KEYS,
} from "../utils/constants.js";
(function () {
  const iframe = document.getElementById("onyx-panel-iframe");
  const loadingScreen = document.getElementById("loading-screen");

  let currentUrl = "";
  let iframeLoaded = false;
  let iframeLoadTimeout;
  let authRequired = false;

  function initializePanel() {
    loadingScreen.style.display = "flex";
    loadingScreen.style.opacity = "1";
    iframe.style.opacity = "0";
    loadOnyxDomain();
  }

  function setIframeSrc(url, pageUrl) {
    iframe.src = url;
    currentUrl = pageUrl;
  }

  function sendWebsiteToIframe(pageUrl) {
    if (iframe.contentWindow && pageUrl !== currentUrl) {
      iframe.contentWindow.postMessage(
        {
          type: WEB_MESSAGE.PAGE_CHANGE,
          url: pageUrl,
        },
        "*"
      );
      currentUrl = pageUrl;
    }
  }

  function startIframeLoadTimeout() {
    iframeLoadTimeout = setTimeout(() => {
      if (!iframeLoaded) {
        if (authRequired) {
          showAuthModal();
        } else {
          console.log('long loading error')
          //showErrorModal(iframe.src);
        }
      }
    }, 2500);
  }

  function handleMessage(event) {
    if (event.data.type === CHROME_MESSAGE.ONYX_APP_LOADED) {
      clearTimeout(iframeLoadTimeout);
      iframeLoaded = true;
      showIframe();
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "PANEL_READY" }, "*");
      }
    } else if (event.data.type === CHROME_MESSAGE.AUTH_REQUIRED) {
      authRequired = true;
    }
  }

  function showIframe() {
    iframe.style.opacity = "1";
    loadingScreen.style.opacity = "0";
    setTimeout(() => {
      loadingScreen.style.display = "none";
    }, 500);
  }

  async function loadOnyxDomain() {
    const response = await chrome.runtime.sendMessage({
      action: ACTIONS.GET_CURRENT_ONYX_DOMAIN,
    });
    if (response && response[CHROME_SPECIFIC_STORAGE_KEYS.ONYX_DOMAIN]) {
      setIframeSrc(
        response[CHROME_SPECIFIC_STORAGE_KEYS.ONYX_DOMAIN] +
          "/chat?assistantId=13",
        ""
      );
    } else {
      console.warn("Lokte domain not found, using default");
      const domain = await getOnyxDomain();
      setIframeSrc(domain + "/chat?assistantId=13", "");
    }
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openOnyxWithInput") {
      setIframeSrc(request.url, request.pageUrl);
    } else if (request.action === ACTIONS.UPDATE_PAGE_URL) {
      sendWebsiteToIframe(request.pageUrl);
    }
  });

  window.addEventListener("message", handleMessage);

  initializePanel();
  startIframeLoadTimeout();
})();
