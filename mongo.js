// Mongo config for local & openshift deployments
var mongoConfig = {
  host: container.env['OPENSHIFT_MONGODB_DB_HOST'] || '127.0.0.1',
  port: parseInt(container.env['OPENSHIFT_MONGODB_DB_PORT'] || '27017'),
  db_name:   container.env["OPENSHIFT_APP_NAME"] || "todomvc",
  username: container.env['OPENSHIFT_MONGODB_DB_USERNAME'] || null,
  password: container.env['OPENSHIFT_MONGODB_DB_PASSWORD'] || null
}

var max_documents = 25;

// Deploy the mongo-persistor module
container.deployModule('io.vertx~mod-mongo-persistor~2.1.0', mongoConfig, function() {
  // Delete all todo's when app starts
  //deleteAll();
});

function deleteAll() {
  bus.send(mongo_proxy, {action: 'delete', collection: 'todos', matcher: {}});
}
