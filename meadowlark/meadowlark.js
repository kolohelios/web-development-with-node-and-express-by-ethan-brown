// app file for Meadowlark Travel
/* eslint no-process-exit: 0, no-catch-shadow: 0, no-unused-expressions: 0 */
'use strict';

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var formidable = require('formidable');
var mongoose = require('mongoose');
var Vacation = require('./models/vacation.js');
var Attraction = require('./models/attraction.js');
var VacationInSeasonListener = require('./models/vacationInSeasonListener');
var fortune = require('./lib/fortune.js');
var credentials = require('./lib/credentials.js');
var emailService = require('./lib/email.js')(credentials);
var Path = require('path');
var session = require('express-session');

var server;
var saveContestEntry, convertFromUSD;
var app = express();

var opts = {
  server: {
    socketOptions: {keepAlive: 1}
  }
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/api', require('cors')());

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({url: credentials.mongoose.connectionString});

// app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(session({
  secret: credentials.cookieSecret,
  resave: false,
  saveUninitialized: true,
  store: sessionStore
}));

switch(app.get('env')){
  case 'development':
    // compact, colorful dev logging
    app.use(require('morgan')('dev'));
    mongoose.connect(credentials.mongoose.development.connectionString, opts);
    break;
  case 'production':
    // module 'express-logger' supports daily log rotation
    app.use(require('express-logger')({
      path: Path.join(__dirname, '/log/requests.log')
    }));
    mongoose.connect(credentials.mongoose.production.connectionString, opts);
    break;
  default:
    throw new Error('Unknown execution environment: ' + app.get('env'));
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

// make sure data directory exists
var dataDir = Path.join(__dirname, '/data');
var vacationPhotoDir = dataDir + '/vacation-photo';
fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

saveContestEntry = function(contestName, email, year, month, photoPath){
  console.log(photoPath);
  // to come...
};

// in Express, the order of these routes is important (kind of like 'switch')
app.use(function(req, res, next){
  var cluster = require('cluster');
  console.log('Worker %d received request.', cluster.worker.id);
  next();
});

// flash message middleware
app.use(function(req, res, next){
  // if there's a flash message, transfer it to the context, then clear it
  res.locals.flash = req.session.flash;
  delete req.session.flash;
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

app.post('/contest/vacation-photo/:year/:month', function(req, res){
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files){
    if(err){return res.redirect(303, '/error'); }
    if(err){
      res.session.flash = {
        type: 'danger',
        intro: 'Oops!',
        message: 'There was an error processing your submission. Please try again.'
      };
      return res.redirect(303, '/contest/vacation-photo');
    }
    var photo = files.photo;
    var dir = vacationPhotoDir + '/' + Date.now();
    var path = dir + '/' + photo.name;
    fs.mkdirSync(dir);
    fs.renameSync(photo.path, dir + '/' + photo.name);
    saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path);
    req.session.flash = {
      type: 'success',
      intro: 'Good luck!',
      message: 'You have been entered into the contest.'
    };
    return res.redirect(303, '/contest/vacation-photo/entries');
  });
});

app.get('/vacations', function(req, res){
  Vacation.find({available: true}, function(err, vacations){
    var currency = req.session.currency || 'USD';
    if(err){throw new Error(err); }
    var context = {
      currency: currency,
      vacations: vacations.map(function(vacation){
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: convertFromUSD(vacation.priceInCents / 100, currency).toFixed(2),
          inSeason: vacation.inSeason
        };
      })
    };
    switch(currency){
      case 'USD':
        context.currencyUSD = 'selected';
        break;
      case 'GBP':
        context.currencyGBP = 'selected';
        break;
      case 'BTC':
        context.currencyBTC = 'selected';
        break;
    }
    res.render('vacations', context);
  });
});

app.get('/notify-me-when-in-season', function(req, res){
  res.render('notify-me-when-in-season', {sku: req.query.sku});
});

app.post('/notify-me-when-in-season', function(req, res){
  console.log(req.body);
  VacationInSeasonListener.update(
    {email: req.body.email},
    {$push: {skus: req.body.sku}},
    {upsert: true},
    function(err){
      if(err){
        console.error(err.stack);
        req.session.flash = {
          type: 'danger',
          intro: 'Oops!',
          message: 'There was an error processing your request.'
        };
        return res.redirect(303, '/vacations');
      }
      req.session.flash = {
        type: 'success',
        intro: 'Thank you!',
        message: 'You will be notified when this vacation is in season.'
      };
      return res.redirect(303, '/vacations');
    }
  );
});

app.get('/set-currency/:currency', function(req, res){
  req.session.currency = req.params.currency;
  return res.redirect(303, '/vacations');
});

convertFromUSD = function(value, currency){
  switch(currency){
    case 'USD':
      return value * 1;
    case 'GBP':
      return value * 0.64;
    case 'BTC':
      return value * 0.0034;
    default:
      return NaN;
  }
};

var rest = require('connect-rest');

// API configuration
var apiOptions = {
  context: '/api',
  domain: require('domain').create()
};

// link API into pipeline
app.use(rest.rester(apiOptions));

// API routes should go after website routes but before the 404
rest.get('/attractions', function(req, content, cb){
  Attraction.find({approved: true}, function(err, attractions){
    if(err){return cb({error: 'Internal error.'}); }
    cb(null, attractions.map(function(a){
      return {
        name: a.name,
        id: a._id,
        description: a.description,
        location: a.location
      };
    }));
  });
});

rest.post('/attractions', function(req, content, cb){
  var a = new Attraction({
    name: req.body.name,
    description: req.body.description,
    location: {lat: req.body.lat, lng: req.body.lng},
    history: {
      event: 'created',
      email: req.body.email,
      date: new Date()
    },
    approved: false
  });
  a.save(function(err){
    if(err){return cb({error: 'Unable to add attraction.'}); }
    cb(null, {id: a._id});
  });
});

rest.get('/attractions/:id', function(req, content, cb){
  Attraction.findById(req.params.id, function(err, a){
    if(err){return cb({error: 'Unable to add attraction.'}); }
    cb(null, {
      name: a.name,
      id: a._id,
      description: a.description,
      location: a.location
    });
  });
});

apiOptions.domain.on('error', function(err){
  console.log('API domain error.\n', err.stack);
  setTimeout(function(){
    console.log('Server shutting down after API domain error.');
    process.exit(1);
  }, 5000);
  server.close();
  var worker = require('cluster').worker;
  if(worker){worker.disconnect; }
});

// routes ^^^^^^ above here

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

Vacation.find(function(err, vacations){
  if(err){throw new Error('Database error'); }
  if(vacations.length){return; }

  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku: 'HR199',
    description: 'Spend a day sailing on the Columbia and enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0
  }).save();

  new Vacation({
      name: 'Oregon Coast Getaway',
      slug: 'oregon-coast-getaway',
      category: 'Weekend Getaway',
      sku: 'OC39',
      description: 'Enjoy the ocean air and quaint coastal towns!',
      priceInCents: 269995,
      tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
      inSeason: false,
      maximumGuests: 8,
      available: true,
      packagesSold: 0
  }).save();

  new Vacation({
      name: 'Rock Climbing in Bend',
      slug: 'rock-climbing-in-bend',
      category: 'Adventure',
      sku: 'B99',
      description: 'Experience the thrill of rock climbing in the high desert.',
      priceInCents: 289995,
      tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing', 'hiking', 'skiing'],
      inSeason: true,
      requiresWaiver: true,
      maximumGuests: 4,
      available: false,
      packagesSold: 0,
      notes: 'The tour guide is currently recovering from a skiing accident.'
  }).save();
});
