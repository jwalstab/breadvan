const express = require('express')
const app = express()
const port = 3000
var expressLayouts = require('express-ejs-layouts');
const path = require('path');
var fs = require('fs');
var MongoDb = require('mongodb');

var os = require('os');
var ifaces = os.networkInterfaces();
console.log(ifaces);
var localAddress = "http://" + ifaces.wlan0[0].address + ":3000"
//var localAddress = "http://" + ifaces.WLAN[0].address + ":3000"
//var localAddress = 'http://192.168.0.135:3000'
console.log(localAddress);

//var mongoServer = "mongodb://157.245.56.30:27017"
var mongoServer = "mongodb://127.0.0.1:27017"

//SESSIONS//////
var session = require('express-session')
var MongoDBStore = require('connect-mongodb-session')(session);

var store = new MongoDBStore({
  uri: mongoServer,
  databaseName: 'sessions',
  collection: 'usersessions'
});

app.use(session({
    secret: 'adgaigdj3wakg23o2323_3311fasa',
    resave: false,
    saveUninitialized: false,
    store: store
  }));  

  var auth = function(req, res, next) {
    if (req.session.user)
      return next();
    else
      return res.redirect('/');
  };

/* 
function AuthObj(user,name,tag) {
    this.loggedInUser = user;
    this.loggedInName = name;
    this.loggedInTag = tag;
}
 */



bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json({limit: '50mb'}));


// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.use(express.static(path.join(__dirname,'public')));

app.set('view engine', 'ejs');
app.use(expressLayouts);






/* app.listen(port, () => console.log(`Bread Van app is starting up on port ${port}!`));
 */
var MongoClient = require('mongodb').MongoClient;
var outsideDatabase;
//157.245.56.30:27017
//MongoClient.connect("mongodb://192.168.0.135:27017", {useNewUrlParser: true, useUnifiedTopology: true}, function(err, database) {
  //MongoClient.connect("mongodb://127.0.0.1:27017", {useNewUrlParser: true, useUnifiedTopology: true}, function(err, database) {
MongoClient.connect(mongoServer, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, database) {
  if(err)
  throw err;
  proceduresdb = database.db('procedures');
  setupdb = database.db('setup');
  usersdb = database.db('users');
  outsideDatabase = database;

  //db = database;
  app.listen(port);
  console.log(`Bread Van has sucessfully started on ${port} and connected to the DB ` + new Date().toLocaleDateString() + `  ` + new Date().toLocaleTimeString());
  ScanForExtDrives();
    var newUser = {
    user: "Sussex",
    pass: "Sussex3688",
    name: "Sussex Clinic",
    tag: "Proceduralist"
    }

    usersdb.collection('users').insertOne(newUser, function(err,result) {
        if(err){console.log(err)};
        console.log("Creating Sussex user account if none...");
    });
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


//FILE SCANER /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//var directoryPath = path.join(__dirname, 'public/imgsrv');
//var hardDrivePath = 'media/medscan/HDD'

//var mediaDrive = path.join(__dirname, 'public/scanner');
var mediaDrive = '/media/medscan';
var imgSrvDrive = path.join(__dirname, 'public/imgsrv');

var extDrives = [];
function ScanForExtDrives(){
    var tempExtDrives = [];
    fs.readdir(mediaDrive, function (err,extDriveFolders){
        if (extDriveFolders != null){
            extDriveFolders.forEach(extDriveFolder => {
                tempExtDrives.push(extDriveFolder);
            });
        }
        //console.log(extDrives.length + "   " + tempExtDrives.length);
        if (extDrives.length != tempExtDrives.length){
            extDrives = tempExtDrives;
            console.log("Changed Detected!");
            extDrives.forEach(extDriveFolder => {
                fs.readdir(mediaDrive + "/" + extDriveFolder + "/DCIM", function(err,dateFolders){
                    if (err){console.log("ERROR AT DATE FOLDER LEVELS");}
                    if (dateFolders != null){
                        dateFolders.forEach(dateFolder => {
                            var dateFolderWithExtDrivePath = path.join(mediaDrive, extDriveFolder, "DCIM", dateFolder);
                            console.log(dateFolderWithExtDrivePath);
                            ScanAction(dateFolderWithExtDrivePath,dateFolder);
                        });
                    }
                });
            });
        }
    });
    setTimeout(function(){ScanForExtDrives();}, 10000);
}
function ScanAction(dateFolder, dateText){
    console.log('Starting scan');
    fs.readdir(dateFolder, function (err, pidFolders){
        if (pidFolders == null){console.log("SCAN ERROR ON PID LOOP"); return;}
        pidFolders.forEach(pidFolder => {
                var pid_DIR = dateFolder + "/" + pidFolder;
                console.log(pid_DIR);
                fs.readFile(pid_DIR + "/" + 'patient.inf', 'utf8', function(err, data) {
                if (data == null){console.log("no inf file @ " + pid_DIR); return}
                var lines = data.split("\n");
                if (lines[5] == null){console.log("cannot read inf file @ " + pid_DIR); return}
                var examStartTime = lines[5].slice(12,14) + lines[5].slice(15,17) + lines[5].slice(18,20);
                var procedureID = pidFolder + dateText + examStartTime
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
    console.log("creating procedure for " + patientID);
    var createProcedureCheckDuplicateQuery = {
        procedureID: procedureID
    }

    proceduresdb.collection('procedures').find(createProcedureCheckDuplicateQuery).toArray (function(err,docs) {
        if (docs[0] != null){console.log("procedureID " + procedureID + " already exists, not creating new procedure")}
        else{
            var imgWithID_DIR = imgSrvDrive + '/' + procedureID;
            var imageCount = 0;
            fs.mkdir(imgWithID_DIR,(err) => {if(err){console.log(err)};});
            fs.readdir(pid_DIR, function(err,files){
                    console.log(patientID + "folder has " + files.length + " files in it");
                    for (let index = 0; index < files.length; index++) {
                        const img = files[index];
                        var strJPGCheck = files[index].substr(files[index].length - 3);
                        if (strJPGCheck == "JPG"){
                            console.log("is a jpg, the file is " + files[index]);
                            fs.copyFile(pid_DIR + '/' + img, imgWithID_DIR + '/' + 'IMG' + imageCount + '.JPG', (err) => {
                                if (err) {console.log(err)};
                            });
                            imgList.push('IMG' + imageCount + '.JPG');
                            imageCount++;
                        }
                        else{
                            console.log("not a jpg, the file is " + files[index]);
                        }
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
                    patientAge: inf[10].slice(6,-1),
                    patientSex: inf[11].slice(7,-1),
                    clinic: inf[12].slice(3, -1),
                    proceduralist: inf[13].slice(4,-1),
                    reason: '',
                    findings: '',
                    bowelPreparation: '',
                    polyps: '',
                    completeColon: '',
                    haemorrhoids: '',
                    followUpRadio: '',
                    followUpDetails: '',
                    followUpDiscuss: '',
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

  
//WEB SERVER START //////////////////////////////////////////////////////////////////////////////////////////

app.get('/home', auth, function (req, res) {
    res.render('home',{
        loggedInName:req.session.name,
        loggedInTag:req.session.tag,
        localAddress:localAddress
    });
});

app.get("/", function(req, res) {
      if (req.session.user){
        res.redirect('home');
      }
      else{
        res.render('sign_in', { 
            layout: 'emptylayout',
            status: "",
            localAddress:localAddress 
        });
      }
});

app.get('/editprocedure/:procedureID', (req, res) => {
    //var theId = MongoDb.ObjectId(req.params.procedureid);
    var openProcedureQuery = {
        procedureID: req.params.procedureID
    }
    console.log(openProcedureQuery)
    proceduresdb.collection('procedures').find(openProcedureQuery).toArray (function(err,docs) {
        console.log(docs);
        res.render('editprocedure',{
            loggedInName:req.session.name,
            loggedInTag:req.session.tag,
            localAddress: localAddress,
            data: docs[0]
        });
    });
});

app.get('/printprocedure/:procedureID', (req, res) => {
    //var theId = MongoDb.ObjectId(req.params.procedureid);
    var openProcedureQuery = {
        procedureID: req.params.procedureID
    }
    console.log(openProcedureQuery)
    proceduresdb.collection('procedures').find(openProcedureQuery).toArray (function(err,docs) {
        console.log(docs);
        res.render('printprocedure',{
            loggedInName:req.session.name,
            loggedInTag:req.session.tag,
            localAddress: localAddress,
            data: docs[0]
        });
    });
});

app.get('/viewprocedures', (req, res) => {
    res.render('viewprocedures',{
        loggedInName:req.session.name,
        loggedInTag:req.session.tag,
        localAddress:localAddress
    });
});

app.get('/setup', (req, res) => {
    res.render('setup',{
        loggedInName:req.session.name,
        loggedInTag:req.session.tag,
        localAddress:localAddress
    });
});




//API SERVER START //////////////////////////////////////////////////////////////////////////////////////

//AUTHENTICATION



app.post('/logincheck', function (req, res) {
    usersdb.collection('users').find({}).toArray(function(err, docs){
      loggedIn = false;
      docs.forEach(element => {
        if (element.user === req.body.user){
          if (element.pass === req.body.pass){
            req.session.user = element.user;
            req.session.name = element.name;
            req.session.tag = element.tag;
            loggedIn = true;
          }
        }
      });
      if (loggedIn == true){
        res.redirect('home');
      }
      else{
        res.render('sign_in', { 
            layout: 'emptylayout',
            status: "Incorrect username or password.",
            localAddress:localAddress 
        });
      }
    });
});

app.get("/sign_out", function(req, res) {
    req.session.destroy();
    res.redirect('/');
  });


//PROCEDURES

app.post('/updateprocedure', (req,res) =>{
    req.body.new = false;
    var updateProcedureQuery = {
        procedureID: req.body.procedureID
    }
    if (req.body.bowelPreparation == null){ req.body.bowelPreparation = "No"}
    if (req.body.polyps == null){ req.body.polyps = "No";}
    if (req.body.completeColon == null){ req.body.completeColon = "No"}
    if (req.body.haemorrhoids == null){ req.body.haemorrhoids = "No"}
    if (req.body.diverticularDisease == null){ req.body.diverticularDisease = "No"}
    
    proceduresdb.collection('procedures').deleteOne(updateProcedureQuery).then (function(result) {
        if(result.deletedCount == 1){console.log("Record " + req.body.procedureID + " cleared")}
        else{console.log("Record: " + req.body.procedureID + " not cleared")}
        proceduresdb.collection('procedures').insertOne(req.body, function(err,result) {
            var base64Data = req.body.imgdata.replace(/^data:image\/png;base64,/, "");
            require("fs").writeFile( imgSrvDrive + "/"+ req.body.procedureID + "/" + "diagram.png", base64Data, 'base64', function(err) {
                if(err){console.log(err)};
                console.log('Record:' + req.body.procedureID + ' recreated.');
                res.redirect('viewprocedures');
            });
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
            msg: "Delete request for report ID " + req.body.procedureID + " recieved "
        }
        var procedureImageFolder = imgSrvDrive + "/" + req.body.procedureID;
        var deleteProcedureImageFilesCount = 0;
        fs.readdir(procedureImageFolder, function (err, files){
            if (files == null){console.log('delete folders returned nothing');return;}
            files.forEach(file => {
                deleteProcedureImageFilesCount++;
                var pathOfFileToDelete = imgSrvDrive + "/" + req.body.procedureID + "/" + file;
                fs.unlinkSync(pathOfFileToDelete);
                if (deleteProcedureImageFilesCount == files.length){
                    fs.rmdir(procedureImageFolder, (err) =>{
                        if (err){console.log(err);}
                    });
                }
            });
        });
        res.send(response);
    });
});

//IMAGES
app.get('/imgsrv/:imagename', (req, res) => {
    res.sendFile(__dirname + '/public/imgsrv/' + req.params.imagename);
});


//SETUP

app.post('/setupnew/:collection', (req, res) => {
    console.log(req.body);
    setupdb.collection(req.params.collection).insertOne(req.body).then (function() {
        console.log('ok')
    });
    res.render('setup',{
        localAddress:localAddress,
        loggedInName:req.session.name,
        loggedInTag:req.session.tag
    });
});

app.get('/setupget/:collection', (req, res) => {
    setupdb.collection(req.params.collection).find({}).toArray (function(err,docs) {
        res.send(docs);
    });
});

app.post('/setupdelete/:collection', (req, res) => {
    console.log(req.body);
    setupdb.collection(req.params.collection).deleteOne(req.body).then (function(err,docs) {
/*         var response = {
            msg: "Delete request for report ID " + req.body._id + " recieved"
        } */
        res.render('setup',{
            localAddress:localAddress,
            loggedInName:req.session.name,
            loggedInTag:req.session.tag
        });
    });
});


