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
  StartScanner();
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


var scannerDrive = path.join(__dirname, 'public/scanner');

var imgSrvDrive = path.join(__dirname, 'public/imgsrv');


function StartScanner(){
    fs.watch(scannerDrive, function (event, dateFolder) {
        if (event == "change"){
            console.log("Change detected, 5 seconds till scan starts")
            setTimeout(function(){ ScanAction(dateFolder); }, 5000);
        }
    });
}

function ScanAction(dateFolder){
    fs.readdir(scannerDrive + "/" + dateFolder, function (err, pidFolders){
        pidFolders.forEach(pidFolder => {
                var pid_DIR = scannerDrive + "/" + dateFolder + "/" +  pidFolder;
                fs.readFile(pid_DIR + "/" + 'patient.inf', 'utf8', function(err, data) {
                if (err){console.log(err)};
                if (data == null){console.log("NULL"); return}
                var lines = data.split("\n");
                var examStartTime = lines[5].slice(12,14) + lines[5].slice(15,17) + lines[5].slice(18,20);
                var procedureID = pidFolder + dateFolder + examStartTime
                var query = {
                    procedureID: procedureID
                }
                proceduresdb.collection('procedures').find(query).toArray (function(err,docs) {
                    if (docs[0] == null){
                        console.log("Creating new record for " + procedureID)
                        CreateProcedure(lines,procedureID,pidFolder, pid_DIR);
                    }
                    else{
                        console.log("Record already exists for " + procedureID);
                    }
                });
            });
        });
    });
}

function CreateProcedure(inf,procedureID,patientID, pid_DIR){
    var imgList = [];

    var createProcedureCheckDuplicateQuery = {
        procedureID: procedureID
    }

    proceduresdb.collection('procedures').find(createProcedureCheckDuplicateQuery).toArray (function(err,docs) {
        if (docs[0] != null){console.log("procedureID " + procedureID + " already exists, not creating new procedure")}
        else{
            fs.readdir(pid_DIR, function(err,files){
                    for (let index = 0; index < files.length; index++) {
                        const img = files[index];
                        var imgWithID_DIR = imgSrvDrive + '/' + procedureID;
                        fs.mkdir(imgWithID_DIR,(err) => {});
                        fs.copyFile(pid_DIR + '/' + img, imgWithID_DIR + '/' + 'IMG' + index + '.JPG', (err) => {
                            if (err) throw err;
                        });
                        imgList.push('IMG' + index + '.JPG');
                    }
                var procedureObject = {
                    procedureID: procedureID,
                    new: true,
                    patientID: patientID,
                    examDate: inf[4].slice(11,23),
                    examStart: inf[5].slice(12,20), //cuts off seconds
                    examEnd: inf[6].slice(10,18),
                    procedureDate: inf[4].slice(11,23) + " " + inf[5].slice(12,17),
                    patientName: inf[8].slice(3, -1),
                    patientDOB: inf[9].slice(6,-1),
                    patientAge: parseInt(inf[10].slice(6,-1)),
                    patientSex: inf[11].slice(7,-1),
                    clinic: inf[12].slice(3, -1),
                    proceduralist: inf[13].slice(4,-1),
                    reason: '',
                    findings: '',
                    completeColon: '',
                    haemorrhoids: '',
                    followUpRadio: '',
                    followUpDetails: '',
                    followUpDate: '',
                    imgs:imgList,
                    diagramImg: null,
                }
                proceduresdb.collection('procedures').insertOne(procedureObject, function(err,result) {
                    if(err){console.log(err)};
                });
            });
        }
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
app.get('/openprocedure/:procedureID', (req, res) => {
    //var theId = MongoDb.ObjectId(req.params.procedureid);
    var openProcedureQuery = {
        procedureID: req.params.procedureID
    }
    console.log(openProcedureQuery)
    proceduresdb.collection('procedures').find(openProcedureQuery).toArray (function(err,docs) {
        console.log(docs);
        res.render('openprocedure',{
            data: docs[0]
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

app.post('/updateprocedure', (req,res) =>{
    console.log(req.body);
    var updateProcedureQuery = {
        procedureID: req.body.procedureID
    }
    proceduresdb.collection('procedures').deleteOne(updateProcedureQuery).then (function(result) {
        console.log(result);
        proceduresdb.collection('procedures').insertOne(req.body, function(err,result) {
            console.log('record updated :' + req.body.procedureID);
            res.end();
        });
    });
})

app.get('/getprocedures', (req, res) => {
    proceduresdb.collection('procedures').find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});
app.post('/deleteprocedure', (req, res) => {
    proceduresdb.collection('procedures').deleteOne(req.body).then (function(err,docs) {
        var response = {
            msg: "Delete request for report ID " + req.body.procedureID + " recieved"
        }
        res.send(response);
    });
});


app.get('/imgsrv/:imagename', (req, res) => {
    res.sendFile(__dirname + '/public/imgsrv/' + req.params.imagename);
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