// This defines which messages the server will allow clients to send
inbound = [
  {
    address : 'vertx.mongo.proxy',
    match: {
      collection: 'todos',
      action: 'find'
    }
  },
  {
    address : 'vertx.mongo.proxy',
    match: {
      collection: 'todos',
      action: 'count'
    }
  },
  {
    address : 'vertx.mongo.proxy',
    match: {
      collection: 'todos',
      action: 'save'
    }
  },
  {
    address : 'vertx.mongo.proxy',
    match: {
      collection: 'todos',
      action: 'delete'
    }
  }
];

// This defines which messages from the server we will let through to the client
outbound = [
  {
    address: 'vertx.mongo.broadcast'
  }
];

var sockJSServer = vertx.createSockJSServer(server);
sockJSServer.bridge({prefix : '/eventbus'}, inbound, outbound);