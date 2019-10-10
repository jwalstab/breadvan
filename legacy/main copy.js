const express = require('express')
const app = express()
const port = 3000
var expressLayouts = require('express-ejs-layouts');
const path = require('path');
var fs = require('fs');
var MongoDb = require('mongodb');

var directoryPath = path.join(__dirname, 'public/imgsrv');



bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));

// Parse URL-encoded bodies (as sent by HTML forms)
//app.use(express.urlencoded());

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
  patientsdb = database.db('patients');
  proceduralistsdb = database.db('proceduralists');
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


 var scannerDrive = path.join(__dirname, 'public/scanner');

fs.readdir(scannerDrive, function(err,datefolders){
    var highestNumber = 0;
    datefolders.forEach(datefolder => {
        var dateFolderNum = Number(datefolder);
        if (dateFolderNum > highestNumber){
            highestNumber = dateFolderNum;
        }
    });
    if (highestNumber != 0){
        var datefolder = path.join(scannerDrive + "/" + highestNumber);
        console.log(datefolder);
        StartScanner(datefolder);
    }
    else{
        console.log("No Folders to watch..!");
    }
});


function StartScanner(dateFolder){
    console.log("Watching folder " + dateFolder);
    fs.watch(dateFolder, function (event, pidFolder) {
        console.log(event);
        console.log(pidFolder);
        if (event != "rename"){return;}
        //console.log(pidFolder);
        var procedureObject = {
            procedureID : null,
            imgFiles: null,
            examDate: null,
            examStart: null,
            examEnd: null,
            patientID: null,
            patientName: null,
            patientDOB: null,
            patientSex: null,
            clinic: null,
            proceduralist: null,
            procedure: null,
        }
        fs.readdir(dateFolder + "/" + pidFolder, function (err, files) {
            if (err) {return console.log('Unable to scan directory: ' + err);} 
            files.forEach(function (file) {
                //console.log(file);
                var fileExtension = file.substr(file.length - 3);
                //console.log(fileExtension);
                if (fileExtension == "inf"){
                    fs.readFile(dateFolder + "/" +  pidFolder + "/" + file, 'utf8', function(err, data) {
                    if (err){console.log(err)};
                    console.log('OK: ' + file);
                    //console.log(data)
                    var lines = data.split("\n");
                    console.log(lines[5]);
                    var str = lines[5];
                    console.log(str);
                    });
                }
            });
        });
    });
}










  
//WEB SERVER START //////////////////////////////
app.get('/', (req, res) => res.render('home'));

app.get('/newprocedure', (req, res) => {
    res.render('newprocedure');
});
app.get('/viewprocedure', (req, res) => {
    res.render('viewprocedure');
});
app.get('/openprocedure/:procedureid', (req, res) => {
    var theId = MongoDb.ObjectId(req.params.procedureid);
    proceduresdb.collection('procedures').find({_id: theId}).toArray (function(err,docs) {
        console.log(docs);
        res.render('openprocedure',{
            data: docs[0],
            reportID: req.params.procedureid
        });
    });
});
app.get('/viewprocedures', (req, res) => {
    res.render('viewprocedures');
});
app.get('/gallery', (req, res) => {
    res.render('gallery');
});
app.get('/canvas', (req, res) => {
    res.render('canvas');
});

app.get('/newpatient', (req, res) => {
    res.render('newpatient');
});
app.get('/viewpatients', (req, res) => {
    res.render('viewpatients');
});

app.get('/newproceduralist', (req, res) => {
    res.render('newproceduralist');
});
app.get('/viewproceduralists', (req, res) => {
    res.render('viewproceduralists');
});

//API SERVER START //////////////////////////////
app.post('/submitnewprocedure', (req, res) => {
    var base64Data = req.body.imgdata.replace(/^data:image\/png;base64,/, "");
    delete req.body.imgdata;
    proceduresdb.collection('procedures').insertOne(req.body, function(err,result) {
        console.log();
        require("fs").writeFile( directoryPath + "/"+ result.ops[0]._id + ".png", base64Data, 'base64', function(err) {
        if(err){console.log(err)};
        });
    });
    res.render('newprocedure');
});
app.get('/getprocedures', (req, res) => {
    proceduresdb.collection('procedures').find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});
app.post('/deleteprocedure', (req, res) => {
    var theId = MongoDb.ObjectId(req.body._id);
    proceduresdb.collection('procedures').deleteOne({_id: theId}).then (function(err,docs) {
        var response = {
            msg: "Delete request for report ID " + req.body._id + " recieved"
        }
        res.send(response);
    });
});


app.get('/listimages', (req, res) => {
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            res.send("read directory error: " + err);
            return console.log('Unable to scan directory: ' + err);
        } 
/*         files.forEach(function (file) {
            console.log(file); 
        }); */
        res.send(files);
    });
});

app.get('/imgsrv/:imagename', (req, res) => {
    res.sendFile(__dirname + '/public/imgsrv/' + req.params.imagename);
});

app.post('/submitnewpatient', (req, res) => {
    console.log(req.body);
    patientsdb.collection('patients').insertOne(req.body).then (function() {
        console.log('ok')
    });
    res.render('newpatient');
});
app.get('/getpatients', (req, res) => {
    patientsdb.collection('patients').find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});
app.post('/deletepatient', (req, res) => {
    var theId = MongoDb.ObjectId(req.body._id);
    patientsdb.collection('patients').deleteOne({_id: theId}).then (function(err,docs) {
        var response = {
            msg: "Delete request for report ID " + req.body._id + " recieved"
        }
        res.send(response);
    });
});

app.post('/submitnewproceduralist', (req, res) => {
    console.log(req.body);
    proceduralistsdb.collection('proceduralists').insertOne(req.body).then (function() {
        console.log('ok')
    });
    res.render('newproceduralist');
});
app.get('/getproceduralists', (req, res) => {
    proceduralistsdb.collection('proceduralists').find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});
app.post('/deleteproceduralist', (req, res) => {
    var theId = MongoDb.ObjectId(req.body._id);
    proceduralistsdb.collection('proceduralists').deleteOne({_id: theId}).then (function(err,docs) {
        var response = {
            msg: "Delete request for report ID " + req.body._id + " recieved"
        }
        res.send(response);
    });
});


















/* app.post('/sendimagedata', (req,res) =>{
    console.log(req.body.data);
    var response = {
        msg: "OK"
    }
    //var base64Data = req.body.data;
    res.send(response);
}); */

/* fs.readdir(directoryPath, function (err, files) {
    //handling error
    if (err) {
        return console.log('Unable to scan directory: ' + err);
    } 
    //listing all files using forEach
    files.forEach(function (file) {
        // Do whatever you want to do with the file
        console.log(file); 
    });
}); */