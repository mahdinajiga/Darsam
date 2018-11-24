var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
const fs = require('fs');
var dateTime = require('node-datetime');
var upload = multer();
var session = require('express-session');
var cookieParser = require('cookie-parser');
var MemcachedStore = require('connect-memcached')(session);
var nodemailer = require('nodemailer');
var RandomizedId = require("randomstring");
var RandomSetupId = RandomizedId.generate(64);

var RootAddressLink = "http://localhost/";
var AuthJsonContent = JSON.parse(fs.readFileSync('Auth.json'))
var MailTransporter = nodemailer.createTransport(AuthJsonContent);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());
app.use(cookieParser());
app.use(session({
    secret: '4EV6S1CSV61G37G8DF9T3D8DE46EV5FSX79TSG',
    key: 'ssid',
    store: new MemcachedStore({
        hosts: ['198.143.181.151:11211'], //this should be where your Memcached server is running
        secret: '793E6STG1GS9DDX1CEG468V37V4FS5ST' // Optionally use transparent encryption for memcache session data 
    })
}));
app.use(express.static('./public'));

app.set('view engine', 'ejs');
app.set('views', './views');

var VERSION = "001";
var NodesDir = './Nodes';
if (!fs.existsSync(NodesDir)){
    fs.mkdirSync(NodesDir);
}

// MongoDB queries
var MongoClient = require('mongodb').MongoClient;
var DBurl = "mongodb://ostadyarAdmin:93Ddl8p16@198.143.181.151:16937/ostadyar";

// MongoDB Settup
var MainDB;
MongoClient.connect(DBurl, function (MongoConErr, db) 
{
    if (MongoConErr) throw MongoConErr;
    MainDB = db.db("ostadyar");

    app.get('/', function (req, res) {
        if (req.session.user) {
            //console.log(req.session.user.userShow);
            if(req.session.user.userType == 0)
            {
                res.render('index', { loggedIn: 1 , userType: 0, Admin: 1, userShow: req.session.user.userShow});
            }else if(req.session.user.userType == 1)
            {

                res.render('index', { loggedIn: 1 , userType: 1, userShow: req.session.user.userShow});   
            }else if(req.session.user.userType == 2)
            {
                res.render('index', { loggedIn: 1 , userType: 2, userShow: req.session.user.userShow});
            }
        }
        else {
            res.render('index');
        }
    });

    app.get('/style.css', function (req, res) {
        res.sendFile(__dirname + "/static/style.css");
    });

    app.get('/script.js', function (req, res) {
        res.sendFile(__dirname + "/static/script.js");
    });


    app.post('/signup', function (req, res) {
        if (req.session.user) {
            res.send(JSON.stringify({ status : 400 , message: "you've already logged in, please logout to signup again!" }));
        }
        else {
            var IncomingData = JSON.parse(req.body.UserData); // parsing incoming data in JSON
            if (!IncomingData['username'] || !IncomingData['password'] || !IncomingData['userShow'] || !IncomingData['email']) 
            {
                console.log("\n\nuesrname:\t\t"+IncomingData['username']+ "\npassword:\t\t"+IncomingData['password'] + "\nusershow:\t\t"+IncomingData['userShow']+ "\nemail:\t\t"+IncomingData['email']);
                res.send(JSON.stringify({ status : 401 , message: "Invalid details!" }));
            }
            else 
            {
                var QueryToFindSameUser = { $or: [{ username: IncomingData['username'] }, { userShow: IncomingData['userShow'] }, { email: IncomingData['email'] }] };
                MainDB.collection("users").find(QueryToFindSameUser).toArray(function (err1, result) {
                    if (err1) {
                        throw err1;
                    }
                    if (result.length == 0) {
                        var dt = dateTime.create();
                        var formatted = dt.format('Y-m-d H:M:S');
                        var UserToSave = {
                            UserId:1000,
                            username: IncomingData['username'],
                            userShow: IncomingData['userShow'],
                            email: IncomingData['email'],
                            password: IncomingData['password'],
                            regTime: formatted,
                            lastLogTime : formatted,
                            userType: IncomingData['userType'],
                            CSU: 0,
                            confirmId: RandomizedId.generate(64),
                            confirmAns: formatted,
                            DirCount: 0,
                            DirNodes: [],
                            NotifCount: 0,
                            NotifNodes: [],
                            VER: VERSION
                        }
                        if(IncomingData['userType']==1)
                        {
                            UserToSave.CSU = 0;
                            UserToSave.SetdirCount = 0;
                            UserToSave.SetdirNodes = [];
                            UserToSave.SignupDesc = IncomingData['SignupDesc'];
                        }
                        MainDB.collection("LastId").find({IdType:1}).toArray(function (LIDErr,LastIdRes) {
                            if(LIDErr) { throw LIDErr; }
                            if(LastIdRes.length != 0)
                            {
                                UserToSave.UserId = LastIdRes[0].value;
                                MainDB.collection("LastId").updateOne({IdType:1},{$inc:{value:1}});
                            }
                            else
                            {
                                MainDB.collection("LastId").insertOne({IdType:1,value:1000,VER:VERSION});
                            }
                            MainDB.collection("users").insertOne(UserToSave, function (err, resu) {
                                if (err) throw err;
                                res.end(JSON.stringify({ status : 200 , message: "signed up successfully :D" }));
                            });
                            var mail = {
                                from: AuthJsonContent.auth.user,
                                to: UserToSave.email,
                                subject: 'درخواست عضویت سایت درسام',
                                text: "<html><body><p>"+UserToSave.userShow+" عزیز!</p><p>از عضویت سما در این سایت متشکریم.جهت تکمیل عضویت کافیست روی لینک زیر کلیک کنید...</p><p><a href='"+RootAddressLink+"conf?id="+UserToSave.confirmId+"'>تکمیل عضویت</a></p><p>با تشکر<br>سایت درسام</p></body></html>"
                            };
                            MailTransporter.sendMail(mail, function(error, info){
                                if (error) {
                                  console.log(error);
                                } else {
                                  console.log('Email sent: ' + info.response);
                                }
                            }); 
                        });
                    }
                    else {
                        res.end(JSON.stringify({ status : 500 , message: "Something went wrong!!!" }));
                    }
                });
            }
        }
    });


    app.post('/login', function (req, res) {
        if (req.session.user) {
            res.send(JSON.stringify({ status : 400 , message: "You've already logged in" }));
        }
        else {
            var IncomingData = JSON.parse(req.body.UserData); // parsing incoming data in JSON
            if (!IncomingData['username'] || !IncomingData['password']) 
            {
                console.log("\n\nuesrname:\t\t"+IncomingData['username']+ "\npassword:\t\t"+IncomingData['password']);
                res.send(JSON.stringify({ status : 401 , message: "Invalid details!" }));
            } else {
                var QueryToFindUser = {  username: IncomingData['username'] };
                MainDB.collection("users").find(QueryToFindUser).toArray(function (err, result) {
                    if (err) {
                        throw err;
                    }
                    if (result.length == 0) {
                        res.send(JSON.stringify({ status : 403 , message: "Invalid credentials!" }));
                    }
                    else {
                        if(result[0].password == IncomingData['password'] && result[0].confirmId==1)
                        {
                            var dt = dateTime.create();
                            var formatted = dt.format('Y-m-d H:M:S');
                            req.session.user = {username : IncomingData['username'] , UserId : result[0].UserId , userShow : result[0].userShow , userType : result[0].userType , CSU : result[0].CSU, lastLogTime : formatted};
                            req.session.save(function (SaveErr) {
                                res.end(JSON.stringify({ status : 200 , message: "logged in successfully :D" }));
                            });
                        }
                        else
                        {
                            res.send(JSON.stringify({ status : 403 , message: "Invalid credentials!" }));
                        }
                    }
                });
            }
        }
    });

    app.get('/logout', function (req, res) {
        if (req.session.user) {
            MainDB.collection("users").updateOne({ username: req.session.user.username }, { $set: { "lastLogTime": req.session.user.lastLogTime } });
            req.session.destroy();
        }
        res.redirect('/');
    });


    app.get('/direcList', function (req, res) {
        if (req.session.user) {
            if(req.session.user.userType == 0)
            {
                res.render('MainDiv', { loggedIn: 1 , userType: 0, Admin: 1, userShow: req.session.user.userShow});
            }else if(req.session.user.userType == 1)//Master
            {
                var QueryToFindUser = {  username: req.session.user.username };
                MainDB.collection("users").find(QueryToFindUser).toArray(function (err, result) {
                    if (err) {
                        throw err;
                    }
                    if (result.length == 0) {
                        res.render('MainDiv', { Error: 1, Status: 403});
                    }
                    else {
                        var SetdirCoun = result[0].SetdirCount;
                        if(SetdirCoun==0)
                        {
                            res.render('MainDiv', { loggedIn: 1 , userType: 1, SetdirCount:0 , userShow: req.session.user.userShow});   
                        }
                        else
                        {
                            var Response = { loggedIn: 1 , userType: 1, userShow: req.session.user.userShow };
                            Response['SetdirCount'] = SetdirCoun; 
                            var DirecsList=[];
                            QueryToFindDirec = [];
                            for(var inde=0;inde<SetdirCoun;inde++)
                            {
                                QueryToFindDirec[inde] = { dirId : result[0].SetdirNodes[inde] };
                            }
                            MainDB.collection("dircs").find({$or: QueryToFindDirec}).toArray(function (errOnDire, DirecResult) {
                                if (errOnDire) {
                                    throw errOnDire;
                                }
                                if (DirecResult.length == 0) {
                                    //res.render('MainDiv', { Error: 1, Status: 403});
                                }
                                else 
                                {
                                    for(var ind=0;ind<DirecResult.length;ind++)
                                    {
                                        DirecsList.push({dirName:DirecResult[ind].dirName, dirDesc:DirecResult[ind].dirDesc, dirPrivacy:DirecResult[ind].dirPrivacy});
                                    }
                                }
                                Response['SetdirNodes'] = DirecsList; 
                                res.render('MainDiv', Response);
                            });   
                        }
                    }
                });
            }else if(req.session.user.userType == 2)
            {
                res.render('MainDiv', { loggedIn: 1 , userType: 2, userShow: req.session.user.userShow});
            }
        }
        else {
            res.render('MainDiv');
        }
    });



    app.post('/NewDirec', function (req, res) {
        if (req.session.user && req.session.user.userType==1) {
            var IncomingData = JSON.parse(req.body.DirecData); // parsing incoming data in JSON
            if (!IncomingData['dirName'] || !IncomingData['dirDesc']) 
            {
                res.send(JSON.stringify({ status : 401 , message: "Invalid details!" }));
            }
            else 
            {
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                var ThisDirecId=1000;
                MainDB.collection("LastId").find({IdType:2}).toArray(function (LIDErr,LastIdRes) {
                    if(LIDErr) { throw LIDErr; }
                    if(LastIdRes.length != 0)
                    {
                        ThisDirecId = LastIdRes[0].value;
                        MainDB.collection("LastId").updateOne({IdType:2},{$inc:{value:1}});
                    }
                    else
                    {
                        MainDB.collection("LastId").insertOne({IdType:2,value:1000,VER:VERSION});
                        ThisDirecId=1000;
                    }
                    fs.mkdirSync(NodesDir+"/"+ThisDirecId);
                    var DirecToSave = {
                        dirId:          ThisDirecId,
                        dirName:        IncomingData['dirName'],
                        dirDesc:        IncomingData['dirDesc'],
                        dirPrivacy:     IncomingData['dirPrivacy'],
                        createdTime:    formatted,
                        creatorUserId:  req.session.user.UserId,
                        dbNodes:        NodesDir+"/"+ThisDirecId,
                        postNodesCount: 0,
                        pinnedNode:     0,
                        LastPostId:     10,
                        LastAssignId:   10,
                        subsCount:      0,
                        subsNode:       [],
                        ASMNTSCount:    0,
                        ASMNTS:         [],
                        VER:            VERSION
                    }
                    
                    MainDB.collection("dircs").insertOne(DirecToSave, function (err, resu) {
                        if (err) throw err;
                        MainDB.collection("users").updateOne({ username: req.session.user.username }, { $push: { SetdirNodes: ThisDirecId}, $inc: {SetdirCount:1} } );
                        res.end(JSON.stringify({ status : 200 , message: "direc saved successfully :D" }));
                    });
                });
            }
        }
        else {
            res.send(JSON.stringify({ status : 400 , message: "برای ثبت دوره باید وارد شوید!!!" }));
        }
    });



    app.get('/data', function (req, res) {
        if (req.session.user) 
        {
            res.send(JSON.stringify({reqSessionUser:req.session.user,Reqq:req.session}));
        }
        else
        {
            res.redirect('/');
        }
    });

    app.get('/conf', function (req, res) {
        if(!req.query.id)
            res.send("<html><head><title>Darsam</title></head><body>requested link expired!!!<br>for more information contact <a href='"+RootAddressLink+"'>darsam.mail@gmail.com</a></body></html>");
        MainDB.collection("users").find({confirmId:req.query.id}).toArray(function (LIDErr,LastIdRes) {
            if(LIDErr) { throw LIDErr; }
            if(LastIdRes.length != 0)
            {
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M:S');
                var SCSU = 1;
                if(LastIdRes[0].userType==1)
                    SCSU=LastIdRes[0].CSU;
                MainDB.collection("users").updateOne({UserId:LastIdRes[0].UserId},{$set:{confirmAns:formatted,confirmId:1,CSU:SCSU}});
                res.redirect("/");
            }
            else
            {
                res.send("<html><head><title>Darsam</title></head><body>requested link expired!!!<br>for more information contact <a href='"+RootAddressLink+"'>darsam.mail@gmail.com</a></body></html>");
            }
        });
    });




    app.listen(80,function () {
        console.log("service started...");
    });

});// End of MongoClient.connect