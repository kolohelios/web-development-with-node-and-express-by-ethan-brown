var http = require('http');

http.createServer(function(req, res){
  // normalize url by removing querysting, optional trailing slash, and making it lowercase
  var path = req.url.replace(/\/?(?:\?.*)?$/, '').toLowerCase();
  switch(path){
    case '':
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Homepage');
      console.log('Displayed home page.');
      break;
    case '/about':
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('About');
      console.log('Displayed about page.');
      break;
    default:
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('Not Found');
      console.log('Displayed 404.');
      break;
  }

  res.end('<h1>Hello world!</h1>');
}).listen(3000);

console.log('Server started on localhost:3000; press Ctrl-C to terminate....');
