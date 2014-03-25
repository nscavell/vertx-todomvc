var Mongo = {};
(function() {

  Mongo.Collection = function(name, options) {
    var self = this;
    self.name = name;
    self.queue = [];
    self.address = (options && options.address) ? options.address : "vertx.mongo.proxy";
    self.broadcast = (options && options.broadcast) ? options.broadcast : "vertx.mongo.broadcast";
    // Hack to know if we're running on openshift so websockets work
    var port = window.location.port;
    if (window.location.hostname.indexOf("rhcloud.com") != -1) {
      port = 8000;
    }
    self.bus = new vertx.EventBus(window.location.protocol + '//' + window.location.hostname + ':' + port + '/eventbus');
    self.bus.onopen = function() {
      for (var i=0; i<self.queue.length; i++) {
        self.queue[i].call();
      }
    }
    self.bus.onclose = function() {
      self.queue = [];
    }
  };

  Mongo.Collection.prototype.count = function(criteria, callback) {
    var name = this.name;
    this._send({action: 'count', collection: name, matcher: criteria}, function(reply) {
      if (reply.status === 'ok') {
          callback(null, reply.count);
        } else {
          callback(reply.message);
        }
    });
  };

  Mongo.Collection.prototype.find = function(criteria, callback) {
    var name = this.name;
    this._send({action: 'find', collection: name, matcher: criteria}, function(reply) {
      if (reply.status === 'ok') {
          callback(null, reply.results);
        } else {
          callback(reply.message);
        }
    });
  };

  Mongo.Collection.prototype.save = function(document, callback) {
    var name = this.name;
    this._send({action: 'save', collection: name, document: document}, function(reply) {
      if (callback) {
        if (reply.status === 'ok') {
          callback(null, reply.document);
        } else {
          callback(reply.message);
        }
      }
    });
  };

  Mongo.Collection.prototype.delete = function(criteria, callback) {
    var name = this.name;
    this._send({action: 'delete', collection: name, matcher: criteria}, function(reply) {
      if (callback) {
        if (reply.status === 'ok') {
          callback(null, reply.number);
        } else {
          callback(reply.message);
        }
      }
    });
  };

  Mongo.Collection.prototype.subscribe = function(callback) {
    var bus = this.bus;
    var addr = this.broadcast;
    var f = function() {
      bus.registerHandler(addr, function(reply) {
        // Uncomment for debug
        //console.log('Received subscribe event ' + JSON.stringify(reply));
        callback(reply);
      });
    }
    this._call(f);
  };

  Mongo.Collection.prototype._send = function(msg, callback) {
    var bus = this.bus;
    var address = this.address;
    //Uncomment for debug
    //console.log("Sending: " + JSON.stringify(msg));
    var send = function() {
      bus.send(address, msg, callback);
    };
    this._call(send);
  };

  Mongo.Collection.prototype._call = function(func) {
    switch (this.bus.readyState()) {
      case vertx.EventBus.OPEN:
        func.call();
        break
      case vertx.EventBus.CONNECTING:
        this.queue.push(func);
        break;
      case vertx.EventBus.CLOSING:
      case vertx.EventBus.CLOSED:
        throw new Error("Cannot send messages because the event bus is either closing or closed");
      default:
        throw new Error("Unknown event bus readyState " + this.bus.readyState());
    }
  };

})(Mongo);