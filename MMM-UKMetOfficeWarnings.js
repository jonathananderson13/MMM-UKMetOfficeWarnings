Module.register("MMM-UKMetOfficeWarnings", {
  defaults: {
    feedUrl: "https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/", // Base URL for warnings
    region: "default-region", // Region code appended to the URL
    updateInterval: 60 * 60 * 1000, // 1 hour
    header: "Met Office Warnings",
  },

  start: function () {
    this.warnings = null;
    const fullUrl = `${this.config.feedUrl}${this.config.region}`;
    this.sendSocketNotification("FETCH_WARNINGS", fullUrl);
    this.scheduleUpdate(fullUrl);
  },

  getStyles: function () {
    return ["css/MMM-UKMetOfficeWarnings.css", "font-awesome.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");

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

      // Add color-coded icon
      const icon = document.createElement("i");
      icon.className = `fa fa-triangle-exclamation ${warning.level.toLowerCase()}`;
      warningDiv.appendChild(icon);

      // Format types to camel case
      const formattedTypes = warning.types
        .map((type) => type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        .join(" & ");

      // Format date
      const validPeriodFormatted = warning.validPeriod
        .replace(/(\d{2})(\d{2})/g, "$1:$2") // Insert colon for time
        .replace(/(\w{3})(\s\d{2}:\d{2})\s(.+?)\s(\w{3})/g, "$1$2 - $4"); // Format day and time

      const text = document.createElement("span");
      text.className = "warning-text";
      text.innerHTML = `${formattedTypes} (${validPeriodFormatted})`;

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
    if (notification === "FETCH_WARNINGS") {
      this.processWarnings(payload);
    }
  },

  processWarnings: function (data) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");

    // Fallback for title/header
    const channelTitleElement = xmlDoc.getElementsByTagName("title")[0];
    this.data.header = channelTitleElement ? channelTitleElement.textContent : this.config.header;

    const items = xmlDoc.getElementsByTagName("item");
    const warnings = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Safely get title
      const titleElement = item.getElementsByTagName("title")[0];
      if (!titleElement) {
        console.warn(`Skipping item ${i} due to missing <title>`);
        continue; // Skip this item if title is missing
      }
      const title = titleElement.textContent;

      // Safely get description
      const descriptionElement = item.getElementsByTagName("description")[0];
      const description = descriptionElement ? descriptionElement.textContent : "No description available";

      // Safely get enclosure (image URL)
      const enclosureElement = item.getElementsByTagName("enclosure")[0];
      const imageUrl = enclosureElement ? enclosureElement.getAttribute("url") : null;

      // Safely get link
      const linkElement = item.getElementsByTagName("link")[0];
      const link = linkElement ? linkElement.textContent : "#";

      // Parse title for warning type and weather conditions
      const levelMatch = title.match(/^(Yellow|Amber|Red)/i);
      const level = levelMatch ? levelMatch[0] : "Unknown";

      const typesMatch = title.match(/of (.+?) affecting/i);
      const types = typesMatch ? typesMatch[1].split(",").map(type => type.trim()) : ["Unknown"];

      // Parse description for valid period
      const validPeriodMatch = description.match(/valid from (.+?) to (.+)/i);
      const validPeriod = validPeriodMatch ? `${validPeriodMatch[1]} - ${validPeriodMatch[2]}` : "Unknown Period";

      warnings.push({
        level: level,
        types: types,
        validPeriod: validPeriod,
        imageUrl: imageUrl,
        link: link,
      });
    }

    this.warnings = warnings;
    this.updateDom();
  },
});
