"use strict";

const routes = require("./index");

/**
 * configureRoutes()
 * This code configures the router for this app.
 * 
 * Because we're building on the existing npm-register app, we need to do some route munging. 
 * Admittedly, the code below is a bit of a hack, but it's easier than doing a complete fork 
 * of npm-register.
 **/
function configureRoutes(app) {
  // find the router from the middleware
  let router = app.middleware.find(mw => mw.router).router;

  // remove the old root route
  router.stack = router.stack.filter(l => l.path !== "/");

  // add in our routes
  router.use(routes.routes());
  router.use(routes.allowedMethods());

  // now we need to move our /:name middleware _before the existing routes in npm-register
  // the easiest way to identify a koa Layer, at this level, is just to encode the route 
  // to a basic string.
  let routePaths = router.stack.map(l => `${l.methods.join("-")}|${l.path}`);

  // find the route we need to insert before and the index of our middleware
  let firstNameIdx = routePaths.indexOf("HEAD-GET|/:name");
  let ourMwIdx = routePaths.lastIndexOf("|/:name");

  // reorder the routes/middleware
  router.stack.splice(firstNameIdx, 0, router.stack[ourMwIdx]);
  router.stack.splice(ourMwIdx + 1, 1);

  return app;
}

module.exports = configureRoutes;
