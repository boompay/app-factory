/**
 * WireMock admin UI (mappings list, editor modals, request log).
 * @param {{ showToast: (msg: string, type?: string) => void }} deps
 */
export function initWiremockUI({ showToast }) {
  const $ = (sel) => document.querySelector(sel);
  const tabRunner = $("#tabRunner");
  const tabWiremock = $("#tabWiremock");
  const runnerView = $("#runnerView");
  const wiremockView = $("#wiremockView");
  const wmList = $("#wmList");
  const wmDetailMethod = $("#wmDetailMethod");
  const wmDetailUrl = $("#wmDetailUrl");
  const wmDetailBody = $("#wmDetailBody");
  const wmEditMock = $("#wmEditMock");
  const wmEditResponseFile = $("#wmEditResponseFile");
  const wmDuplicateMock = $("#wmDuplicateMock");
  const wmDeleteMock = $("#wmDeleteMock");
  const wmAddMock = $("#wmAddMock");
  const wmOwnerSelect = $("#wmOwnerSelect");
  const wmLogList = $("#wmLogList");
  const wmRefreshLog = $("#wmRefreshLog");
  const wmModalOverlay = $("#wmModalOverlay");
  const wmModalTitle = $("#wmModalTitle");
  const wmModalBody = $("#wmModalBody");
  const wmModalSplitWrap = $("#wmModalSplitWrap");
  const wmModalSplitLabel = $("#wmModalSplitLabel");
  const wmModalSplitBody = $("#wmModalSplitBody");
  const wmModalEditSplit = $("#wmModalEditSplit");
  const wmModalTopPane = $("#wmModalTopPane");
  const wmModalEditResizeHandle = $("#wmModalEditResizeHandle");
  const wmModalMappingLabel = $("#wmModalMappingLabel");
  const wmEditMockModal = $("#wmEditMockModal");
  const wmModalClose = $("#wmModalClose");
  const wmModalCancel = $("#wmModalCancel");
  const wmModalSave = $("#wmModalSave");

  let wmMappings = [];
  let wmSelectedId = null;
  let wmAllRequests = [];
  let wmCurrentBodyFileName = null;

  function showView(name) {
    const isRunner = name === "runner";
    runnerView.classList.toggle("active", isRunner);
    wiremockView.classList.toggle("active", !isRunner);
    tabRunner.classList.toggle("active", isRunner);
    tabWiremock.classList.toggle("active", !isRunner);
    if (!isRunner) {
      if (wmOwnerSelect.value) {
        loadWmMappings();
        loadWmRequests();
      } else {
        wmMappings = [];
        wmSelectedId = null;
        renderWmList();
        renderWmDetailEmpty();
        renderWmLogList();
      }
    }
  }

  function syncWmAddMockEnabled() {
    wmAddMock.disabled = !wmOwnerSelect.value;
    wmAddMock.title = wmOwnerSelect.value ? "" : "Select an owner first";
  }

  function requestMatchesStub(reqEntry, stub) {
    const req = reqEntry.request || reqEntry;
    const stubReq = stub.request || {};
    const method = (req.method || "").toUpperCase();
    const stubMethod = (stubReq.method || "GET").toUpperCase();
    if (method !== stubMethod) return false;
    const reqUrl = req.url || req.absoluteUrl || "";
    const reqPath = reqUrl.replace(/^https?:\/\/[^/]+/, "") || "/";
    if (stubReq.urlPath)
      return reqPath === stubReq.urlPath || reqPath === stubReq.urlPath + "/";
    if (stubReq.url)
      return (
        reqPath === stubReq.url ||
        reqUrl === stubReq.url ||
        reqPath.startsWith(stubReq.url)
      );
    if (stubReq.urlPathPattern) {
      try {
        const re = new RegExp(stubReq.urlPathPattern);
        return re.test(reqPath);
      } catch (_) {
        return false;
      }
    }
    if (stubReq.urlPattern) {
      try {
        const re = new RegExp(stubReq.urlPattern);
        return re.test(reqPath) || re.test(reqUrl);
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  function requestsForStub(requests, stubId) {
    const stub = wmMappings.find((m) => m.id === stubId);
    if (!stub) return [];
    return requests.filter((r) => {
      if (
        r.stubMapping &&
        (r.stubMapping.id === stubId || r.stubMapping.uuid === stubId)
      )
        return true;
      return requestMatchesStub(r, stub);
    });
  }

  tabRunner.addEventListener("click", (e) => {
    e.preventDefault();
    showView("runner");
  });
  tabWiremock.addEventListener("click", (e) => {
    e.preventDefault();
    showView("wiremock");
  });

  wmOwnerSelect.addEventListener("change", () => {
    wmSelectedId = null;
    syncWmAddMockEnabled();
    if (wmOwnerSelect.value) {
      loadWmMappings();
      loadWmRequests();
    } else {
      wmMappings = [];
      renderWmList();
      renderWmDetailEmpty();
      renderWmLogList();
    }
  });
  syncWmAddMockEnabled();

  function formatJson(obj) {
    try {
      return typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    } catch (_) {
      return String(obj);
    }
  }

  async function apiWiremock(path, options = {}) {
    const opts = {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json" },
    };
    if (options.body !== undefined && opts.method !== "GET")
      opts.body = JSON.stringify(options.body);
    const res = await fetch("/api/wiremock" + path, opts);
    const text = await res.text();
    if (!res.ok) throw new Error(text || res.statusText);
    return text ? JSON.parse(text) : {};
  }

  async function loadWmMappings() {
    const owner = wmOwnerSelect.value;
    if (!owner) {
      wmMappings = [];
      wmSelectedId = null;
      renderWmList();
      renderWmDetailEmpty();
      return;
    }
    try {
      const body = {
        matchesJsonPath: {
          expression: "$.owner",
          equalTo: owner,
        },
      };
      const data = await apiWiremock("/find-by-metadata", {
        method: "POST",
        body,
      });
      wmMappings = data.mappings || [];
      renderWmList();
      if (wmSelectedId && !wmMappings.find((m) => m.id === wmSelectedId))
        wmSelectedId = null;
      if (wmSelectedId) renderWmDetail();
      else renderWmDetailEmpty();
    } catch (e) {
      wmList.innerHTML =
        '<div class="wm-empty">Failed to load: ' +
        escapeHtml(e.message || e) +
        "</div>";
    }
  }

  function wmStubRouteParts(m) {
    const method = (m.request && m.request.method) || "GET";
    const path =
      (m.request &&
        (m.request.urlPath || m.request.url || m.request.urlPattern)) ||
      "/";
    return { method: method, path: path };
  }

  function renderWmList() {
    wmList.innerHTML = "";
    wmMappings.forEach((m) => {
      const { method, path } = wmStubRouteParts(m);
      const name =
        m.name != null && String(m.name).trim() !== ""
          ? String(m.name).trim()
          : null;
      const el = document.createElement("div");
      el.className =
        "wm-list-item" + (m.id === wmSelectedId ? " selected" : "");
      el.dataset.id = m.id;
      const routeLine =
        '<div class="wm-mock-route"><span class="method">' +
        escapeHtml(method) +
        "</span>" +
        '<span class="url">' +
        escapeHtml(path) +
        "</span></div>";
      if (name) {
        el.innerHTML =
          '<div class="wm-mock-name">' +
          escapeHtml(name) +
          "</div>" +
          routeLine;
      } else {
        el.innerHTML = routeLine;
      }
      el.addEventListener("click", () => {
        wmSelectedId = m.id;
        renderWmList();
        renderWmDetail();
        renderWmLogList();
      });
      wmList.appendChild(el);
    });
    if (wmMappings.length === 0) {
      const msg = wmOwnerSelect.value
        ? "No mocks for this owner. Add one to get started."
        : "Select an owner to load mocks from WireMock.";
      wmList.innerHTML = '<div class="wm-empty">' + msg + "</div>";
    }
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function looksLikeXmlString(s) {
    if (typeof s !== "string" || s.length < 9) return false;
    const t = s.trim();
    if (t.startsWith("{") || t.startsWith("[")) return false;
    return t.startsWith("<?xml") || (t.startsWith("<") && t.includes(">"));
  }

  const WM_LARGE_JSON_MIN_CHARS = 500;

  function jsonBodyIsLarge(jsonBody) {
    if (jsonBody == null) return false;
    try {
      return JSON.stringify(jsonBody).length > WM_LARGE_JSON_MIN_CHARS;
    } catch (_) {
      return false;
    }
  }

  function prettyPrintXml(xml) {
    try {
      const reg = /(>)(<)(\/*)/g;
      let xml2 = xml.trim().replace(reg, "$1\r\n$2$3");
      let pad = 0;
      const lines = [];
      xml2.split("\r\n").forEach(function (node) {
        let indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) indent = 0;
        else if (node.match(/^<\/\w/) && pad !== 0) pad -= 1;
        else if (node.match(/^<\w[^>]*[^/]>.*$/)) indent = 1;
        else indent = 0;
        let padding = "";
        for (let i = 0; i < pad; i += 1) padding += "  ";
        lines.push(padding + node.trim());
        if (indent) pad += 1;
      });
      return lines.filter(Boolean).join("\n");
    } catch (_) {
      return xml;
    }
  }

  function renderWmDetail() {
    const m = wmMappings.find((x) => x.id === wmSelectedId);
    if (!m) return renderWmDetailEmpty();
    const { method, path } = wmStubRouteParts(m);
    wmDetailMethod.textContent = method || "—";
    const stubName =
      m.name != null && String(m.name).trim() !== ""
        ? String(m.name).trim()
        : null;
    wmDetailUrl.textContent = stubName ? stubName + " · " + path : path;
    wmDetailBody.innerHTML = "";
    const resp = m.response || {};
    const hasLargeJson =
      resp.jsonBody !== undefined &&
      resp.jsonBody !== null &&
      jsonBodyIsLarge(resp.jsonBody);
    const hasInlineXml =
      typeof resp.body === "string" &&
      looksLikeXmlString(resp.body) &&
      resp.jsonBody === undefined;
    let forJson = JSON.parse(JSON.stringify(m));
    if (hasLargeJson) {
      forJson.response = {
        ...(forJson.response || {}),
        jsonBody: "[JSON response — see below]",
      };
    }
    if (hasInlineXml) {
      forJson.response = {
        ...(forJson.response || {}),
        body: "[XML response — see below]",
      };
    }
    const xmlPretty = hasInlineXml ? prettyPrintXml(resp.body) : null;
    const jsonPretty = hasLargeJson ? formatJson(resp.jsonBody) : null;
    const pre = document.createElement("pre");
    pre.className = "json-block";
    pre.style.margin = "0";
    pre.textContent = formatJson(forJson);
    wmDetailBody.appendChild(pre);
    if (jsonPretty) {
      const jtitle = document.createElement("div");
      jtitle.className = "wm-xml-section-title";
      jtitle.textContent = "Response body (JSON)";
      wmDetailBody.appendChild(jtitle);
      const jsonPre = document.createElement("pre");
      jsonPre.className = "json-block wm-json-block";
      jsonPre.style.margin = "0";
      jsonPre.textContent = jsonPretty;
      wmDetailBody.appendChild(jsonPre);
    }
    if (xmlPretty) {
      const title = document.createElement("div");
      title.className = "wm-xml-section-title";
      title.textContent = "Response body (XML)";
      wmDetailBody.appendChild(title);
      const xmlPre = document.createElement("pre");
      xmlPre.className = "json-block wm-xml-block";
      xmlPre.style.margin = "0";
      xmlPre.textContent = xmlPretty;
      wmDetailBody.appendChild(xmlPre);
    }
    wmEditMock.disabled = false;
    wmDuplicateMock.disabled = false;
    wmDeleteMock.disabled = false;
    const bodyFileName = m.response && m.response.bodyFileName;
    wmCurrentBodyFileName = bodyFileName || null;
    wmEditResponseFile.style.display = bodyFileName ? "" : "none";
  }

  function renderWmDetailEmpty() {
    wmDetailMethod.textContent = "—";
    wmDetailUrl.textContent = "Select a mock";
    wmDetailBody.innerHTML =
      '<span class="wm-empty">Select a mock from the list</span>';
    wmEditMock.disabled = true;
    wmDuplicateMock.disabled = true;
    wmDeleteMock.disabled = true;
    wmCurrentBodyFileName = null;
    wmEditResponseFile.style.display = "none";
  }

  const WM_MODAL_SPLIT_RATIO_KEY = "appFactory_wmModalSplitTopRatio";

  function resetWmModalSplitLayout() {
    wmModalTopPane.style.flex = "";
    wmModalSplitWrap.style.flex = "";
    wmModalSplitWrap.style.minHeight = "";
    wmModalMappingLabel.classList.add("hidden");
    wmModalEditResizeHandle.classList.add("hidden");
    wmModalEditResizeHandle.setAttribute("aria-hidden", "true");
  }

  function applyWmModalSplitLayout() {
    if (!wmEditMockModal.classList.contains("modal-xml-split")) return;
    const total = wmModalEditSplit.getBoundingClientRect().height;
    const handleH = wmModalEditResizeHandle.offsetHeight || 7;
    const min = 80;
    const usable = Math.max(0, total - handleH);
    if (usable < min * 2) return;
    const raw = localStorage.getItem(WM_MODAL_SPLIT_RATIO_KEY);
    let ratio = raw != null ? parseFloat(raw) : 0.5;
    if (!Number.isFinite(ratio)) ratio = 0.5;
    ratio = Math.min(0.88, Math.max(0.12, ratio));
    let topPx = Math.round(usable * ratio);
    topPx = Math.min(usable - min, Math.max(min, topPx));
    wmModalTopPane.style.flex = `0 0 ${topPx}px`;
    wmModalSplitWrap.style.flex = "1 1 auto";
    wmModalSplitWrap.style.minHeight = "0";
  }

  function initWmModalSplitResizer() {
    wmModalEditResizeHandle.addEventListener("mousedown", (e) => {
      if (wmModalEditResizeHandle.classList.contains("hidden")) return;
      e.preventDefault();
      const startY = e.clientY;
      const startTopH = wmModalTopPane.getBoundingClientRect().height;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev) => {
        const splitH = wmModalEditSplit.getBoundingClientRect().height;
        const handleH = wmModalEditResizeHandle.offsetHeight || 7;
        const min = 80;
        const max = Math.max(min + 1, splitH - handleH - min);
        let next = startTopH + (ev.clientY - startY);
        next = Math.min(max, Math.max(min, next));
        wmModalTopPane.style.flex = `0 0 ${Math.round(next)}px`;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        const splitH = wmModalEditSplit.getBoundingClientRect().height;
        const handleH = wmModalEditResizeHandle.offsetHeight || 7;
        const usable = Math.max(1, splitH - handleH);
        const topH = wmModalTopPane.getBoundingClientRect().height;
        const ratio = Math.min(0.95, Math.max(0.05, topH / usable));
        localStorage.setItem(WM_MODAL_SPLIT_RATIO_KEY, String(ratio));
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  initWmModalSplitResizer();

  function openEditModal(title, body, onSave) {
    wmModalTitle.textContent = title;
    resetWmModalSplitLayout();
    wmEditMockModal.classList.remove("modal-xml-split");
    wmModalSplitWrap.classList.add("hidden");
    wmModalSplitBody.value = "";

    let jsonPart = body;
    let splitKind = null;
    if (
      body &&
      typeof body === "object" &&
      body.response &&
      body.response.jsonBody != null &&
      jsonBodyIsLarge(body.response.jsonBody)
    ) {
      splitKind = "json";
      wmEditMockModal.classList.add("modal-xml-split");
      wmModalSplitWrap.classList.remove("hidden");
      wmModalSplitLabel.textContent = "Response body (JSON)";
      wmModalSplitBody.placeholder = "JSON response body";
      wmModalSplitBody.value = formatJson(body.response.jsonBody);
      jsonPart = JSON.parse(JSON.stringify(body));
      jsonPart.response = { ...(jsonPart.response || {}) };
      delete jsonPart.response.jsonBody;
    } else if (
      body &&
      typeof body === "object" &&
      body.response &&
      typeof body.response.body === "string" &&
      looksLikeXmlString(body.response.body) &&
      body.response.jsonBody === undefined
    ) {
      splitKind = "xml";
      wmEditMockModal.classList.add("modal-xml-split");
      wmModalSplitWrap.classList.remove("hidden");
      wmModalSplitLabel.textContent = "Response body (XML)";
      wmModalSplitBody.placeholder = "XML response body";
      wmModalSplitBody.value = prettyPrintXml(body.response.body);
      jsonPart = JSON.parse(JSON.stringify(body));
      jsonPart.response = { ...(jsonPart.response || {}) };
      delete jsonPart.response.body;
    }

    if (splitKind) {
      wmModalMappingLabel.classList.remove("hidden");
      wmModalEditResizeHandle.classList.remove("hidden");
      wmModalEditResizeHandle.setAttribute("aria-hidden", "false");
    }

    wmModalBody.value =
      typeof jsonPart === "string" ? jsonPart : formatJson(jsonPart);
    wmModalOverlay.classList.remove("hidden");
    wmModalBody.focus();

    if (splitKind) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => applyWmModalSplitLayout());
      });
    }

    const save = async () => {
      let json;
      try {
        json = JSON.parse(wmModalBody.value);
      } catch (e) {
        showToast("Invalid JSON");
        return;
      }
      if (splitKind === "xml") {
        json.response = json.response || {};
        json.response.body = wmModalSplitBody.value.trim();
      } else if (splitKind === "json") {
        json.response = json.response || {};
        try {
          json.response.jsonBody = JSON.parse(wmModalSplitBody.value);
        } catch (e) {
          showToast("Invalid JSON in response body");
          return;
        }
      }
      try {
        await onSave(json);
        wmModalOverlay.classList.add("hidden");
        wmEditMockModal.classList.remove("modal-xml-split");
        wmModalSplitWrap.classList.add("hidden");
        resetWmModalSplitLayout();
        loadWmMappings();
        showToast("Saved", "success");
      } catch (e) {
        showToast(e.message || "Failed to save");
      }
    };

    const off = () => {
      wmModalSave.removeEventListener("click", save);
      wmModalClose.removeEventListener("click", close);
      wmModalCancel.removeEventListener("click", close);
      wmModalOverlay.removeEventListener("click", overlayClick);
    };
    const close = () => {
      wmModalOverlay.classList.add("hidden");
      wmEditMockModal.classList.remove("modal-xml-split");
      wmModalSplitWrap.classList.add("hidden");
      resetWmModalSplitLayout();
      off();
    };

    wmModalSave.onclick = save;
    wmModalClose.onclick = close;
    wmModalCancel.onclick = close;
    wmModalOverlay.onclick = function (e) {
      if (e.target === wmModalOverlay) close();
    };
  }

  wmEditMock.addEventListener("click", () => {
    const m = wmMappings.find((x) => x.id === wmSelectedId);
    if (!m) return;
    openEditModal("Edit mock", m, (json) =>
      apiWiremock("/mappings/" + m.id, { method: "PUT", body: json }),
    );
  });

  wmDuplicateMock.addEventListener("click", async () => {
    const m = wmMappings.find((x) => x.id === wmSelectedId);
    if (!m) return;
    const copy = JSON.parse(JSON.stringify(m));
    delete copy.id;
    delete copy.uuid;
    openEditModal("Duplicate mock", copy, (json) =>
      apiWiremock("/mappings", { method: "POST", body: json }),
    );
  });

  wmDeleteMock.addEventListener("click", async () => {
    if (!wmSelectedId) return;
    if (!confirm("Delete this mock?")) return;
    try {
      await apiWiremock("/mappings/" + wmSelectedId, { method: "DELETE" });
      wmSelectedId = null;
      loadWmMappings();
      renderWmDetailEmpty();
      renderWmLogList();
      showToast("Mock deleted", "success");
    } catch (e) {
      showToast(e.message || "Delete failed");
    }
  });

  wmAddMock.addEventListener("click", () => {
    const owner = wmOwnerSelect.value;
    if (!owner) {
      showToast("Select an owner first");
      return;
    }
    const stub = {
      metadata: { owner: owner },
      request: { method: "GET", urlPath: "/example" },
      response: { status: 200, body: "{}" },
      persistent: true,
    };
    openEditModal("Add mock", stub, (json) =>
      apiWiremock("/mappings", { method: "POST", body: json }),
    );
  });

  async function loadWmRequests() {
    try {
      const data = await apiWiremock("/requests");
      wmAllRequests = data.requests || [];
      renderWmLogList();
    } catch (e) {
      wmAllRequests = [];
      wmLogList.innerHTML =
        '<div class="wm-empty">Failed to load log: ' +
        escapeHtml(e.message || e) +
        "</div>";
    }
  }

  const wmLogSectionTitle = $("#wmLogSectionTitle");
  const wmLogResizeHandle = $("#wmLogResizeHandle");
  const wmLogPanel = $("#wmLogPanel");
  const wmDetailSplitArea = $("#wmDetailSplitArea");
  const WM_LOG_HEIGHT_KEY = "appFactory_wmLogPanelHeightPx";

  function applyWmLogPanelHeight(px) {
    const n = Number(px);
    if (!Number.isFinite(n) || n < 48) return;
    wmLogPanel.style.flex = `0 0 ${Math.round(n)}px`;
  }

  function loadWmLogPanelHeight() {
    const raw = localStorage.getItem(WM_LOG_HEIGHT_KEY);
    if (raw) applyWmLogPanelHeight(parseFloat(raw));
  }

  function initWmLogPanelResizer() {
    let startY = 0;
    let startH = 0;

    wmLogResizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startY = e.clientY;
      startH = wmLogPanel.getBoundingClientRect().height;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev) => {
        const splitH = wmDetailSplitArea.getBoundingClientRect().height;
        const handleH = wmLogResizeHandle.offsetHeight;
        const minTop = 100;
        const minLog = 64;
        const maxLog = Math.max(minLog, splitH - minTop - handleH);
        let next = startH - (ev.clientY - startY);
        next = Math.min(maxLog, Math.max(minLog, next));
        wmLogPanel.style.flex = `0 0 ${next}px`;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        const h = wmLogPanel.getBoundingClientRect().height;
        localStorage.setItem(WM_LOG_HEIGHT_KEY, String(Math.round(h)));
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  loadWmLogPanelHeight();
  initWmLogPanelResizer();

  function renderWmLogList() {
    const list = wmSelectedId
      ? requestsForStub(wmAllRequests, wmSelectedId).slice().reverse()
      : [];
    wmLogSectionTitle.textContent = wmSelectedId
      ? "Request log for this mock"
      : "Request log";
    wmLogList.innerHTML = "";
    if (!wmSelectedId) {
      wmLogList.innerHTML =
        '<div class="wm-empty">Select a mock to see its request log.</div>';
      return;
    }
    if (list.length === 0) {
      wmLogList.innerHTML =
        '<div class="wm-empty">No requests matched this mock yet.</div>';
      return;
    }
    list.forEach((r) => {
      const req = r.request || r;
      const el = document.createElement("div");
      el.className = "wm-log-entry";
      const url = req.url || r.url || req.absoluteUrl || r.absoluteUrl || "—";
      const method = req.method || r.method || "—";
      const ts = r.loggedDate ? new Date(r.loggedDate).toLocaleString() : "—";
      const body = req.body || r.body || req.requestBody || r.requestBody || "";
      el.innerHTML =
        '<div class="head"><span class="method">' +
        escapeHtml(method) +
        "</span>" +
        '<span class="url">' +
        escapeHtml(url) +
        "</span>" +
        '<span class="ts">' +
        escapeHtml(ts) +
        "</span></div>" +
        (body
          ? '<div class="body">' +
            escapeHtml(typeof body === "string" ? body : formatJson(body)) +
            "</div>"
          : "");
      if (body) el.addEventListener("click", () => el.classList.toggle("open"));
      wmLogList.appendChild(el);
    });
  }

  wmRefreshLog.addEventListener("click", loadWmRequests);

  $("#wmResetLog").addEventListener("click", async () => {
    try {
      await apiWiremock("/requests/reset", { method: "POST" });
      loadWmRequests();
      showToast("Log reset", "success");
    } catch (e) {
      showToast(e.message || "Reset failed");
    }
  });

  const wmFileModalOverlay = $("#wmFileModalOverlay");
  const wmFileModalTitle = $("#wmFileModalTitle");
  const wmFileModalBody = $("#wmFileModalBody");
  const wmFileModalClose = $("#wmFileModalClose");
  const wmFileModalCancel = $("#wmFileModalCancel");
  const wmFileModalSave = $("#wmFileModalSave");
  const wmFileFormatJson = $("#wmFileFormatJson");

  function closeFileModal() {
    wmFileModalOverlay.classList.add("hidden");
  }

  wmEditResponseFile.addEventListener("click", async () => {
    if (!wmCurrentBodyFileName) return;
    wmFileModalTitle.textContent = "Edit: " + wmCurrentBodyFileName;
    wmFileModalOverlay.classList.remove("hidden");
    wmFileModalBody.value = "";
    try {
      const res = await fetch(
        "/api/wiremock/files/" + encodeURIComponent(wmCurrentBodyFileName),
      );
      const text = await res.text();
      if (!res.ok) {
        let msg = text;
        try {
          const j = JSON.parse(text);
          if (j.error) msg = j.error;
        } catch (_) {}
        throw new Error(msg);
      }
      wmFileModalBody.value = text;
      wmFileModalBody.focus();
    } catch (e) {
      showToast(e.message || "Failed to load file");
      closeFileModal();
    }
  });

  wmFileModalSave.addEventListener("click", async () => {
    if (!wmCurrentBodyFileName) return;
    const content = wmFileModalBody.value;
    try {
      const res = await fetch(
        "/api/wiremock/files/" + encodeURIComponent(wmCurrentBodyFileName),
        {
          method: "PUT",
          headers: { "Content-Type": "text/plain" },
          body: content,
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      closeFileModal();
      showToast(
        "File saved. WireMock will use new content on next request.",
        "success",
      );
    } catch (e) {
      showToast(e.message || "Save failed");
    }
  });

  wmFileFormatJson.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(wmFileModalBody.value);
      wmFileModalBody.value = JSON.stringify(parsed, null, 2);
      showToast("Formatted", "success");
    } catch (_) {
      showToast("Invalid JSON");
    }
  });

  wmFileModalClose.addEventListener("click", closeFileModal);
  wmFileModalCancel.addEventListener("click", closeFileModal);
  wmFileModalOverlay.addEventListener("click", (e) => {
    if (e.target === wmFileModalOverlay) closeFileModal();
  });
}
