// app file for Meadowlark Travel
/* eslint no-process-exit: 0, no-catch-shadow: 0 */
'use strict';

var http = require('http');
var express = require('express');
var fortune = require('./lib/fortune.js');
var credentials = require('./lib/credentials.js');
var emailService = require('./lib/email.js')(credentials);
var Path = require('path');

var server;
var app = express();

switch(app.get('env')){
  case 'development':
    // compact, colorful dev logging
    app.use(require('morgan')('dev'));
    break;
  case 'production':
    // module 'express-logger' supports daily log rotation
    app.use(require('express-logger')({
      path: Path.join(__dirname, '/log/requests.log')
    }));
}

// set up handlebars view engine
var handlebars = require('express-handlebars')
// by default Express will look in /views/layouts for layouts
  .create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.disable('x-powered-by');
app.set('view cache', true);

app.set('port', process.env.port || 3000);
// in Express, the order of these routes is important (kind of like 'switch')

app.use(function(req, res, next){
  var cluster = require('cluster');
  console.log('Worker %d received request.', cluster.worker.id);
  next();
});

app.use(express.static(Path.join(__dirname, '/public')));

app.use(function(req, res, next){
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
});

app.use(function(req, res, next){
  // create a domain for this request
  var domain = require('domain').create();
  // handle errors on this domain
  domain.on('error', function(err){
    console.log('DOMAIN ERROR CAUGHT\n', err.stack);
    try{
      // failsafe shutdown in 5 seconds
      setTimeout(function(){
        console.log('Failsafe shutdown.');
        process.exit(1);
      }, 5000);

      // disconnect from the cluster
      var worker = require('cluster').worker;
      if(worker){worker.disconnect(); }

      // stop taking any new requests
      server.close();

      try{
        // attempt to use Express error routes
        next(err);
      }catch(error){
        // if Express error route failed, try plain Node response
        console.log('Express error mechanism failed.\n', err.stack);
        res.statusCode = 500;
        res.setHeader('content-type', 'text/plain');
        res.end('Server error.');
        emailService.sendError('the widget broke down!', __filename);
      }
    }catch(error){
      console.log('Unable to send 500 response.\n', err.stack);
    }
  });
  domain.add(req);
  domain.add(res);

  domain.run(next);
});

app.get('/', function(req, res){
  res.render('home');
});

app.get('/about', function(req, res){
  res.render('about', {fortune: fortune.getFortune(),
  pageTestScript: '/qa/tests-about.js'
  });
});

app.get('/tours/hood-river', function(req, res){
  emailService.emailError('the widget broke down!');
  res.render('tours/hood-river');
});

app.get('/tours/oregon-coast', function(req, res){
  res.render('tours/oregon-coast');
});

app.get('/tours/request-group-rate', function(req, res){
  res.render('tours/request-group-rate');
});

// custom 404 page
app.use(function(req, res){
  res.status(404);
  res.render('404');
});

// custom 500 page
app.use(function(err, req, res, next){
  console.log(err.stack, next);
  res.status(500);
  res.render('500');
});

function startServer(){
  server = http.createServer(app).listen(app.get('port'), function(){
    console.log('Express started in ' + app.get('env') + ' mode on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
  });
}

if(require.main === module){
  // application run directly; start app startServer
  startServer();
}else{
  // application imported as a module via "require": export function to create server
  module.exports = startServer;
}
