Module.register("MMM-UKMetOfficeWarnings", {
  defaults: {
    feedUrl: "https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/", // Base URL for warnings
    region: "default-region", // Region code appended to the URL
    updateInterval: 60 * 60 * 1000, // 1 hour
    header: "Met Office Warnings",
  },

  start: function () {
    this.warnings = null;
    this.moduleHeader = this.config.header;
    const fullUrl = `${this.config.feedUrl}${this.config.region}`;
    this.sendSocketNotification("FETCH_WARNINGS", fullUrl);
    this.scheduleUpdate(fullUrl);
  },

  getStyles: function () {
    return ["MMM-UKMetOfficeWarnings.css", "font-awesome.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");

    const header = document.createElement("div");
    header.className = "module-header";
    header.innerHTML = this.moduleHeader;
    wrapper.appendChild(header);

    if (!this.warnings) {
      const loading = document.createElement("div");
      loading.innerHTML = "Loading...";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (this.warnings.length === 0) {
      const noWarnings = document.createElement("div");
      noWarnings.innerHTML = "No Current Warnings";
      wrapper.appendChild(noWarnings);
      return wrapper;
    }

    this.warnings.forEach((warning) => {
      const warningDiv = document.createElement("div");
      warningDiv.className = "warning";

      const icon = document.createElement("i");
      icon.className = `fa fa-triangle-exclamation ${warning.level.toLowerCase()}`;

      const text = document.createElement("span");
      text.className = "warning-text";
      text.innerHTML = `${warning.types.join(" & ")} (${warning.validPeriod})`;

      warningDiv.appendChild(icon);
      warningDiv.appendChild(text);
      wrapper.appendChild(warningDiv);
    });

    return wrapper;
  },

  scheduleUpdate: function (fullUrl) {
    setInterval(() => {
      this.sendSocketNotification("FETCH_WARNINGS", fullUrl);
    }, this.config.updateInterval);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "WARNINGS_DATA") {
      this.processWarnings(payload);
    }
  },

  processWarnings: function (data) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");
    const items = xmlDoc.getElementsByTagName("item");

    const warnings = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const title = item.getElementsByTagName("title")[0].textContent;
      const pubDate = item.getElementsByTagName("pubDate")[0].textContent;

      const levelMatch = title.match(/^(Yellow|Amber|Red)/i);
      const level = levelMatch ? levelMatch[0] : "Unknown";

      const typesMatch = title.match(/of (.+?) affecting/i);
      const types = typesMatch ? typesMatch[1].split(",").map(type => type.trim()) : ["Unknown"];

      const validPeriodMatch = pubDate.match(/(\w{3} \d{2}:\d{2} - \w{3} \d{2}:\d{2})/i);
      const validPeriod = validPeriodMatch ? validPeriodMatch[0] : "Unknown Period";

      warnings.push({
        level: level,
        types: types,
        validPeriod: validPeriod,
      });
    }

    this.warnings = warnings;
    this.moduleHeader = xmlDoc.getElementsByTagName("title")[0]?.textContent || this.config.header;
    this.updateDom();
  },
});
