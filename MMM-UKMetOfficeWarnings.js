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
    return ["font-awesome.css"];
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

    const toCamelCase = (message) => {
      return message
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    };

    const toWarningColor = (warningType) => {
      if (warningType == "amber")
      {
        return "orange";
      }
      else
      {
        return warningType;
      }
    };

    this.warnings.forEach((warning) => {
      const warningDiv = document.createElement("div");
      warningDiv.className = "warning";

      const warningColor = toWarningColor(warning.level.toLowerCase());

      const icon = document.createElement("i");
      icon.className = `fa fa-triangle-exclamation`;
      icon.style = `color:${warningColor}`;

      // Format warning types to camel case
      const formattedTypes = toCamelCase(warning.types.join(" & "));


      const text = document.createElement("span");
      text.className = "warning-text";
      text.innerHTML = `&nbsp;&nbsp;${formattedTypes} (${warning.validPeriod})`;

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
    console.log("Processing warnings data...");
  
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
  
      // Extract title
      const titleElement = item.getElementsByTagName("title")[0];
      const title = titleElement ? titleElement.textContent : null;
  
      if (!title) {
        console.warn(`Warning: <title> tag is missing or undefined for item ${i}`);
        continue; // Skip this item if title is missing
      }
  
      // Extract description
      const descriptionElement = item.getElementsByTagName("description")[0];
      const description = descriptionElement ? descriptionElement.textContent : "No description available";
  
      // Extract enclosure (image URL)
      const enclosureElement = item.getElementsByTagName("enclosure")[0];
      const imageUrl = enclosureElement ? enclosureElement.getAttribute("url") : null;
  
      // Extract link
      const linkElement = item.getElementsByTagName("link")[0];
      const link = linkElement ? linkElement.textContent : "#";
  
      // Parse title for warning type and weather conditions
      const levelMatch = title.match(/^(Yellow|Amber|Red)/i);
      const level = levelMatch ? levelMatch[0] : "Unknown";
  
      const typesMatch = title.match(/of (.+?) affecting/i);
      const types = typesMatch ? typesMatch[1].split(",").map(type => type.trim()) : ["Unknown"];
  
      function parseDate(dateString) 
      {
        const [time, day, month] = dateString.split(" "); // Split the input string
        const [hours, minutes] = [time.slice(0, 2), time.slice(2)]; // Extract hours and minutes
            
        // Parse the date string
        const parsedDate = `${day} ${month} ${hours}:${minutes}`;
      
        return parsedDate;
      }

      // Parse description for valid period
      const validPeriodMatch = description.match(/valid from (.+?) to (.+)/i);
      
      // Convert date to
      const starDate = parseDate(validPeriodMatch[1]);
      const endDate = parseDate(validPeriodMatch[2]);

      const validPeriod = validPeriodMatch ? `${starDate} - ${endDate}` : "Unknown Period";
  
      warnings.push({
        level: level,
        types: types,
        validPeriod: validPeriod,
        imageUrl: imageUrl,
        link: link,
      });
    }
  
    console.log("Parsed warnings:", warnings);
    this.warnings = warnings;
    this.updateDom();
  }
});
