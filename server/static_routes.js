
var sendFileHandler = function(req) {
  var file = req.path();
  if (req.path() === '/') {
    file = '/index.html';
  }
  req.response.sendFile('.' + file);
};

rm.get('/', sendFileHandler);
rm.get('/bower_components/.*', sendFileHandler);
rm.get('/js/.*', sendFileHandler);
rm.get('/css/.*', sendFileHandler);
rm.get('/img/.*', sendFileHandler);