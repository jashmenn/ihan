"use strict";

const app = require("npm-register/server");
const configureRoutes = require("./routes/configure");

app.name = "ihan";
configureRoutes(app);

module.exports = app;
