const express = require('express')
const app = express()
const port = 3000
var expressLayouts = require('express-ejs-layouts');
const path = require('path');
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.use(express.static(path.join(__dirname,'public')));

app.set('view engine', 'ejs');
app.use(expressLayouts);






/* app.listen(port, () => console.log(`Bread Van app is starting up on port ${port}!`));
 */
var MongoClient = require('mongodb').MongoClient;

var outsideDatabase;
  MongoClient.connect("mongodb://157.245.56.30:27017", {useNewUrlParser: true, useUnifiedTopology: true}, function(err, database) {
  if(err)
  throw err;
  proceduresdb = database.db('procedures');
  outsideDatabase = database;
  
  //db = database;
  app.listen(port);
  console.log(`Bread Van has sucessfully started on ${port} and connected to the DB ` + new Date().toLocaleDateString() + `  ` + new Date().toLocaleTimeString());
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });



app.get('/', (req, res) => res.render('index'));

app.get('/newprocedure', (req, res) => {
    res.render('newprocedure');
});
app.get('/viewprocedures', (req, res) => {
    res.render('viewprocedures');
});

app.post('/submitnewprocedure', (req, res) => {
    console.log(req.body);
    proceduresdb.collection('procedures').insertOne(req.body).then (function() {
        console.log('ok')
    });
    res.render('newprocedure');
});

app.get('/getprocedures', (req, res) => {
    proceduresdb.collection('procedures').find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});