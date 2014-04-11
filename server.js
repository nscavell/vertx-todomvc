var vertx = require('vertx');
var http   = require('vertx/http');
var console = require('vertx/console');
var container = require('vertx/container');

// Reference to the vertx event bus
var bus = vertx.eventBus;
var mongo_address = 'vertx.mongopersistor';     // Address mongo persistor uses
var mongo_proxy = 'vertx.mongo.proxy';          // Our mongo 'proxy' which will broadcast changes if necessary
var mongo_broadcast = 'vertx.mongo.broadcast';  // Our client address to broadcast changes to
var max_documents = 25;

// Setup mongo
load('server/mongo.js');

// Setup our mongo_proxy event bus handler to broadcast changes real-time
bus.registerHandler(mongo_proxy, function(msg, replyTo) {
  var broadcast = {action: msg.action, collection: msg.collection};
  bus.send(mongo_address, msg, function(reply) {
    if (reply.status === 'ok') {
      if ("save" === msg.action) { // If we detect a save, we publish the new/updated document.
        broadcast.document = msg.document;
        if (reply._id) {
          broadcast.document._id = reply._id;
        }
        bus.publish(mongo_broadcast, broadcast);
      } else if ("delete" === msg.action) { // If we delete, we publish the id of the document deleted.
        broadcast._id = msg.matcher._id;
        bus.publish(mongo_broadcast, broadcast);
      }
    }
    replyTo(reply);
  })
});

bus.registerHandler(mongo_broadcast, function(msg) {
  if (msg.action === 'save') {
    bus.send(mongo_address, {action: 'count', collection: 'todos'}, function(reply) {
      if (reply.status === 'ok') {
        if (reply.count >= max_documents) {
          bus.send(mongo_proxy, {action: 'delete', collection: 'todos', matcher: {}});
        }
      }
    })
  }
});

// Handles sending message to mongo proxy, handling any errors when appropriate
var send = function(json, req, handler) {
  //console.log('--------> ' + stringify(json));
  bus.send(mongo_proxy, json, function(msg) {
    //console.log('<-------- ' + stringify(msg));
    if (msg.status === 'ok') {
      handler(req, msg);
    } else {
      req.response.statusCode(500);
      req.response.end(JSON.stringify(msg));
    }
  });
};

// Helper method to pretty print json
var stringify = function(json) {
  return JSON.stringify(json, undefined, 2) + '\n';
};

// Create our route matcher
var rm = new http.RouteMatcher();

// Load our static route handlers
load('server/static_routes.js');

// Handle anything that doesn't match our registered routes
rm.noMatch(function(req) {
  req.response.statusCode(404);
  req.response.end('Resource not found for path ' + req.path() + '\n');
});

// Create the http server
var host = container.env['OPENSHIFT_VERTX_IP'] || '127.0.0.1';
var port = parseInt(container.env['OPENSHIFT_VERTX_PORT'] || '8080');
var server = http.createHttpServer();

// Set our route matcher
server.requestHandler(rm);

// Create sockjs server from http server
load('server/sockjs_server.js');

// Finally start the server
server.listen(port, host, function(err) {
  if (!err) {
    console.log('Vert.x TodoMVC started !');
  } else {
    console.log("Vert.x TodoMVC failed to start: " + err);
  }
});
