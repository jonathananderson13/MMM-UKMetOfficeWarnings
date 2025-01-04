const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
  start: function () {
    console.log("Starting node helper for: " + this.name);
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "FETCH_WARNINGS") {
      this.fetchWarnings(payload);
    }
  },

  fetchWarnings: function (url) {
    fetch(url)
      .then((response) => response.text())
      .then((data) => {
        this.sendSocketNotification("WARNINGS_DATA", data);
      })
      .catch((error) => {
        console.error("Error fetching warnings:", error);
      });
  },
});
