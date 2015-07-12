// app file for Meadowlark Travel
'use strict';

var express = require('express');
var fortune = require('./lib/fortune.js');
var Path = require('path');

var app = express();

// set up handlebars view engine
var handlebars = require('express-handlebars')
  .create({defaultLayout: 'main'});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.port || 3000);
// in Express, the order of these routes is important (kind of like 'switch')

app.use(express.static(Path.join(__dirname, '/public')));

app.use(function(req, res, next){
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
  next();
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
app.use(function(err, req, res){
  console.log(err.stack);
  res.status(500);
  res.render('500');
});

app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
