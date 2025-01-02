Module.register("MMM-UKMetOfficeWarnings", {
  defaults: {
    feedUrl: "https://www.metoffice.gov.uk/public/data/PWSCache/WarningsRSS/Region/ne", // Replace with actual RSS feed URL
    updateInterval: 60 * 60 * 1000, // 1 hour
  },

  start: function () {
    this.warnings = null;
    this.scheduleUpdate();
  },

  getStyles: function () {
    return ["MMM-UKMetOfficeWarnings.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");

    if (!this.warnings) {
      wrapper.innerHTML = "Loading...";
      return wrapper;
    }

    if (this.warnings.length === 0) {
      wrapper.innerHTML = "No Current Warnings";
      return wrapper;
    }

    this.warnings.forEach((warning) => {
      const warningDiv = document.createElement("div");
      warningDiv.className = "warning";

      const icon = document.createElement("span");
      icon.className = `icon ${warning.type.toLowerCase()}`;

      const text = document.createElement("span");
      text.className = "warning-text";
      text.innerHTML = `${warning.title} (${warning.time})`;

      warningDiv.appendChild(icon);
      warningDiv.appendChild(text);
      wrapper.appendChild(warningDiv);
    });

    return wrapper;
  },

  scheduleUpdate: function () {
    setInterval(() => {
      this.getWarnings();
    }, this.config.updateInterval);

    this.getWarnings();
  },

  getWarnings: function () {
    fetch(this.config.feedUrl)
      .then((response) => response.text())
      .then((data) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "text/xml");
        const items = xmlDoc.getElementsByTagName("item");

        const warnings = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const title = item.getElementsByTagName("title")[0].textContent;
          const description = item.getElementsByTagName("description")[0].textContent;
          const pubDate = item.getElementsByTagName("pubDate")[0].textContent;

          warnings.push({
            title: title,
            description: description,
            time: pubDate,
            type: this.getWarningType(title),
          });
        }

        this.warnings = warnings;
        this.updateDom();
      })
      .catch((error) => {
        console.error("Error fetching warnings:", error);
        this.warnings = [];
        this.updateDom();
      });
  },

  getWarningType: function (title) {
    if (title.toLowerCase().includes("wind")) return "wind";
    if (title.toLowerCase().includes("rain")) return "rain";
    if (title.toLowerCase().includes("snow")) return "snow";
    return "default";
  },
});