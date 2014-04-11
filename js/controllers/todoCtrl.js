/*global todomvc, angular */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the vertx mongo library
 * - exposes the model to the template and provides event handlers
 */
todomvc.controller('TodoCtrl', function TodoCtrl($scope, $location, $filter) {
  var todos = $scope.todos = [];
  var todoStorage = new vertx.Mongo.Collection("todos");
  // Init the data
  todoStorage.find({}, function(err, data) {
    if (!err) {
      todos = $scope.todos = data;
      $scope.$apply();
    } else {
      console.log("Error retrieving todos: " + err);
    }
  });

  var indexOf = function(todo) {
    for (var i=0; i<todos.length; i++) {
      if (todos[i]._id == todo._id) return i;
    }
    return -1;
  };

  // Subscribe to server-side events
  todoStorage.subscribe(function(msg) {
    if (msg.action === 'save') {
      var index = indexOf(msg.document);
      if (index != -1) {
        todos[index] = msg.document;
      } else {
        todos.push(msg.document);
      }
    } else if (msg.action === 'delete') {
      if (msg._id) {
        todos.splice(indexOf({id: msg._id}), 1);
      } else { // No id means all documents were deleted. Server is setup to delete @ 25 todos.
        todos = $scope.todos = [];
      }
    }

    if (msg.action === 'save' || msg.action === 'delete') {
      $scope.remainingCount = $filter('filter')(todos, {completed: false}).length;
      $scope.$apply();
    }
  });

  $scope.newTodo = '';
  $scope.remainingCount = $filter('filter')(todos, {completed: false}).length;
  $scope.editedTodo = null;

  if ($location.path() === '') {
    $location.path('/');
  }

  $scope.location = $location;

  $scope.$watch('location.path()', function (path) {
    $scope.statusFilter = { '/active': {completed: false}, '/completed': {completed: true} }[path];
  });

  $scope.$watch('remainingCount == 0', function (val) {
    $scope.allChecked = val;
  });

  $scope.addTodo = function () {
    var newTodo = $scope.newTodo.trim();
    if (newTodo.length === 0) {
      return;
    }

    todoStorage.save({title: newTodo, completed: false});

    $scope.newTodo = '';
  };

  $scope.editTodo = function (todo) {
    $scope.editedTodo = todo;
    // Clone the original to restore it on demand.
    $scope.originalTodo = angular.extend({}, todo);
  };

  $scope.doneEditing = function (todo) {
    $scope.editedTodo = null;
    todo.title = todo.title.trim();

    if (todo.title) {
      todoStorage.save(todo);
    } else {
      $scope.removeTodo(todo);
    }
  };

  $scope.revertEditing = function (todo) {
    todos[todos.indexOf(todo)] = $scope.originalTodo;
    $scope.doneEditing($scope.originalTodo);
  };

  $scope.removeTodo = function (todo) {
    todoStorage.delete(todo);
  };

  $scope.todoCompleted = function (todo) {
    todoStorage.save(todo);
  };

  $scope.clearCompletedTodos = function () {
    todos.forEach(function (todo) {
      if (todo.completed) {
        todoStorage.delete(todo);
      }
    });
  };

  $scope.markAll = function (completed) {
    todos.forEach(function (todo) {
      todo.completed = !completed;
      todoStorage.save(todo);
    });
  };
});