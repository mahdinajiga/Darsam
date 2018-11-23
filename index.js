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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());
app.use(cookieParser());
app.use(session({
    secret: '4EV6S1CSV61G37G8DF9T3D8DE46EV5FSX79TSG',
    key: 'ssid',
    proxy: 'true',
    store: new MemcachedStore({
        hosts: ['198.143.181.151:11211'], //this should be where your Memcached server is running
        secret: '793E6STG1GS9DDX1CEG468V37V4FS5ST' // Optionally use transparent encryption for memcache session data 
    })
}));
app.use(express.static('./public'));

app.set('view engine', 'ejs');
app.set('views', './views');

var VERSION = "001";

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
                res.render('index', { loggedIn: 1 , Admin: 1, userShow: req.session.user.userShow});
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
                MainDB.collection("users").find(QueryToFindSameUser).toArray(function (err, result) {
                    if (err) {
                        throw err;
                    }
                    if (result.length == 0) {
                        var dt = dateTime.create();
                        var formatted = dt.format('Y-m-d H:M:S');
                        //GetUserId
                        var UserToSave = {
                            UserId:0,
                            username: IncomingData['username'],
                            userShow: IncomingData['userShow'],
                            email: IncomingData['email'],
                            password: IncomingData['password'],
                            regTime: formatted,
                            lastLogTime : formatted,
                            userType: IncomingData['userType'],
                            CSU: 1,
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
                        MainDB.collection("users").insertOne(UserToSave, function (err, resu) {
                            if (err) throw err;
                            res.end(JSON.stringify({ status : 200 , message: "signed up successfully :D" }));
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
                        if(result[0].password == IncomingData['password'])
                        {
                            var dt = dateTime.create();
                            var formatted = dt.format('Y-m-d H:M:S');
                            req.session.user = {username : IncomingData['username'] , userShow : result[0].userShow , userType : result[0].userType , CSU : result[0].CSU, lastLogTime : formatted};
                            res.end(JSON.stringify({ status : 200 , message: "logged in successfully :D" }));
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

    app.listen(80);

});// End of MongoClient.connect