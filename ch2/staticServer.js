var http = require('http');
var fs = require('fs');

function serveStaticFile(res, path, contentType, responseCode){
  if(!responseCode) responseCode = 200;
  fs.readFile(__dirname + path, function(err, data){
    if(err){
      res.writeHead(500, {'Content-Type': 'text/plain'});
      res.end('500 - Internal Error');
    }else{
      res.writeHead(responseCode, {'Content-Type': contentType});
      res.end(data);
    }
  });
}

http.createServer(function(req, res){
  // normalize url by removing querysting, optional trailing slash, and making it lowercase
  var path = req.url.replace(/\/?(?:\?.*)?$/, '').toLowerCase();
  console.log('Request: ', path);
  switch(path){
    case '':
      serveStaticFile(res, '/public/home.html', 'text/html');
      console.log('Served home page.');
      break;
    case '/about':
      serveStaticFile(res, '/public/about.html', 'text/html');
      console.log('Served about page.');
      break;
    case '/nodelogo.svg':
      serveStaticFile(res, '/public/nodeLogo.svg', 'image/svg+xml');
      console.log('Served image.');
      break;
    default:
      serveStaticFile(res, '/public/notfound.html', 'text/html');
      console.log('Served 404.');
      break;
  }
}).listen(3000);

console.log('Server started on localhost:3000; press Ctrl-C to terminate....');
