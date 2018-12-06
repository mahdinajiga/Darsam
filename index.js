var express = require('express');
var EJS = require('ejs');
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
var postEncoder = require('./post-encoder');
var RandomSetupId = RandomizedId.generate(64);

var RootAddressLink = "http://localhost/";
var AuthJsonContent = JSON.parse(fs.readFileSync('Auth.json'));
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
var viewsPath = './views';
app.set('views', viewsPath);

var VERSION = "002";
var hostAddress = "";
const MaximumPostCountPerPage = 10;
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
        if(req.query.reqid)
        {
            if (req.session.user) {
                //console.log(req.session.user.userShow);
                if(req.session.user.userType == 0)
                {
                    res.render('index', { serverAddress: hostAddress, loggedIn: 1 , userType: 0, Admin: 1, userShow: req.session.user.userShow});
                }else if(req.session.user.userType == 1)
                {

                    res.render('index', { serverAddress: hostAddress, loggedIn: 1 , userType: 1, userShow: req.session.user.userShow});   
                }else if(req.session.user.userType == 2)
                {
                    res.render('index', { serverAddress: hostAddress, loggedIn: 1 , userType: 2, userShow: req.session.user.userShow});
                }
            }
            else {
                res.render('index', { serverAddress: hostAddress });
            }
        }
        else
        {
            res.redirect("/?reqid="+RandomizedId.generate(32));
        }
    });


    app.get('/style.css', function (req, res) {
        if(req.query.reqid)
        {
            res.sendFile(__dirname + "/static/style.css");
        }
        else
        {
            res.redirect('/style.css?reqid='+RandomizedId.generate(32));
        }
    });


    app.get('/script.js', function (req, res) {
        if(req.query.reqid)
        {
            res.sendFile(__dirname + "/static/script.js");
        }
        else
        {
            res.redirect('/script.js?reqid='+RandomizedId.generate(32));
        }
        
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
                                text: "<html><body><p>"+UserToSave.userShow+" عزیز!</p><p>از عضویت شما در این سایت متشکریم.جهت تکمیل عضویت کافیست روی لینک زیر کلیک کنید...</p><p><a href='"+RootAddressLink+"conf?id="+UserToSave.confirmId+"'>تکمیل عضویت</a></p><p>با تشکر<br>سایت درسام</p></body></html>"
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
        res.redirect("/?reqid="+RandomizedId.generate(32));
    });


    app.all('/direcList', function (req, res) {
        if (req.session.user) {
            if(req.session.user.userType == 0)
            {
                res.render('MainDiv-direcs', { loggedIn: 1 , userType: 0, Admin: 1, userShow: req.session.user.userShow});
            }else if(req.session.user.userType == 1)//Master
            {
                var QueryToFindUser = {  username: req.session.user.username };
                MainDB.collection("users").find(QueryToFindUser).toArray(function (err, result) {
                    if (err) {
                        throw err;
                    }
                    if (result.length == 0) {
                        res.render('MainDiv-direcs', { Error: 1, Status: 403});
                    }
                    else {
                        var SetdirCoun = result[0].SetdirCount;
                        if(SetdirCoun==0)
                        {
                            GetLatestDircs(1, 12, function (conFund, Fund) {
                                var DirNodeAdds = [];
                                for(var i=0; i<result[0].DirCount; i++)
                                {
                                    DirNodeAdds.push(result[0].DirNodes[i].dirId);
                                }
                                MainDB.collection("dircs").find({dirId : { $in : DirNodeAdds}}).toArray(function (ErrOny, ResOny) {
                                    if(ErrOny) throw ErrOny;
                                    res.render('MainDiv-direcs', { loggedIn: 1 , userType: 1, SetdirCount:0 , userShow: req.session.user.userShow , countFound : conFund , Found : Fund , DirCount : result[0].DirCount , DirNodes : ResOny });
                                });
                            });
                        }
                        else
                        {
                            var Response = { loggedIn: 1 , userType: 1, userShow: req.session.user.userShow };
                            Response['SetdirCount'] = SetdirCoun; 
                            var DirecsList=[];
                            MainDB.collection("dircs").find({dirId : { $in : result[0].SetdirNodes}}).toArray(function (errOnDire, DirecResult) {
                                if (errOnDire) {
                                    throw errOnDire;
                                }
                                if (DirecResult.length == 0) {
                                }
                                else 
                                {
                                    for(var ind=0;ind<DirecResult.length;ind++)
                                    {
                                        DirecsList.push({dirId:DirecResult[ind].dirId, dirName:DirecResult[ind].dirName, dirDesc:DirecResult[ind].dirDesc, dirPrivacy:DirecResult[ind].dirPrivacy});
                                    }
                                }
                                Response['SetdirNodes'] = DirecsList; 
                                GetLatestDircs(1, 12, function (conFund, Fund) {
                                    Response['countFound'] = conFund;
                                    Response['Found'] = Fund;
                                    var DirNodeAdds = [];
                                    for(var i=0; i<result[0].DirCount; i++)
                                    {
                                        DirNodeAdds.push(result[0].DirNodes[i].dirId);
                                    }
                                    MainDB.collection("dircs").find({dirId : { $in : DirNodeAdds}}).toArray(function (ErrOny, ResOny) {
                                        if(ErrOny) throw ErrOny;
                                        Response['DirCount'] = result[0].DirCount;
                                        Response['DirNodes'] = ResOny;
                                        res.render('MainDiv-direcs', Response);
                                    });
                                });
                            });   
                        }
                    }
                });
            }else if(req.session.user.userType == 2)
            {
                MainDB.collection("users").find({UserId: req.session.user.UserId}).toArray(function (errOpi, resOpi) {
                    if(errOpi) throw errOpi;
                    var DirNodeAdds = [];
                    for(var i=0; i<resOpi[0].DirCount; i++)
                    {
                        DirNodeAdds.push(resOpi[0].DirNodes[i].dirId);
                    }
                    GetLatestDircs(1, 12, function (conFund, Fund) {
                        MainDB.collection("dircs").find({dirId : { $in : DirNodeAdds}}).toArray(function (ErrOny, ResOny) {
                            if(ErrOny) throw ErrOny;
                            res.render('MainDiv-direcs', { loggedIn: 1 , userType: 2, userShow: req.session.user.userShow , countFound : conFund , Found : Fund , DirCount : resOpi[0].DirCount , DirNodes : ResOny });
                        });
                    });
                });
            }
        }
        else {
            GetLatestDircs(1, 12, function (conFund, Fund) {
                res.render('MainDiv-direcs', { countFound : conFund , Found : Fund});
            });
        }
    
    });


    function GetLatestDircs(pageNum, pageLen, callback) 
    {
        var FoundArray = [];
        MainDB.collection("dircs").find().sort({createdTime: 1}).skip(pageNum>0?((pageNum-1)*pageLen):0).limit(pageLen).toArray(function (err, result) {
            if (err) {
                throw err;
            }
            if (result.length == 0) {
                callback(0,[]);
            }
            else 
            {
                for (var i = 0; i < result.length; i++) 
                {
                    FoundArray.push({
                        dirId : result[i].dirId , dirName : result[i].dirName , dirDesc : result[i].dirDesc,
                        dirPrivacy : result[i].dirPrivacy , createdTime : result[i].createdTime,
                        creatorUserShow : result[i].creatorUserShow , creatorUserId : result[i].creatorUserId,
                        subsCount : result[i].subsCount
                    });
                }
                callback(result.length, FoundArray);
            }
        });
    }

    
    app.all('/sendRegReq', function (req, res) {
        if(req.session.user)
        {
            var ReqJs = JSON.parse(req.body.ReqData);
            MainDB.collection("dircs").find({dirId: ReqJs.dirId}).toArray(function (errOSRR, RFRD) {
                if(errOSRR) throw errOSRR;
                if(RFRD.length==0)
                {
                    res.send("");
                }
                else
                {
                    var dt = dateTime.create();
                    var formatted = dt.format('Y-m-d H:M:S');
                    var RTRD = RFRD[0];
                    if(RTRD.dirPrivacy == 0)
                    {
                        res.send("");
                    }
                    else if(RTRD.dirPrivacy == 1)
                    {
                        MainDB.collection("users").updateOne({UserId : req.session.user.UserId}, { $push: { DirNodes: {dirId: RTRD.dirId , dateJoined : formatted}}, $inc: {DirCount:1} });
                        MainDB.collection("dircs").updateOne({dirId: RTRD.dirId}, { $push: { subsNode: req.session.user.UserId}, $inc: {subsCount:1} });
                        res.send("شما با موفقیت عضو این دوره شدید !!!");
                    }
                    else if(RTRD.dirPrivacy == 2)
                    {
                        var RequestedBefore = -1, RSS = [];
                        for(var i=0; i<RTRD.ReqsCount; i++)// save all latest request and search if user requested befor an get the index on user's request
                        {
                            RSS.push(RTRD.Reqs[i]);
                            if(RTRD.Reqs[i].UserId == req.session.user.UserId)
                            {
                                RequestedBefore = i;// user found. user have requested before and it's index is 'i'
                            }
                        }
                        var RC = RTRD.ReqsCount;
                        if(RequestedBefore==-1)// user requests for the first time
                        {
                            RC = RC+1;
                            RSS.push({UserId : req.session.user.UserId, userShow : req.session.user.userShow,  Status:0, ReqCount:1, ReqDesc: [{Msg: ReqJs.Message, Date: formatted}]});
                        }
                        else                   // user requested before and his request is RSS[RequestedBefore]
                        {
                            if(RSS[RequestedBefore].Status==0)
                            {
                                RSS[RequestedBefore].ReqDesc[RC-1].Msg = ReqJs.Message;
                                RSS[RequestedBefore].ReqDesc[RC-1].Date = formatted;
                            }else if(RSS[RequestedBefore].Status==1)
                            {
                                RSS[RequestedBefore].Status = 0;
                                RSS[RequestedBefore].ReqDesc.push({Msg: ReqJs.Message, Date: formatted});
                                RSS[RequestedBefore].ReqCount = RSS[RequestedBefore].ReqCount + 1;
                            }else if(RSS[RequestedBefore].Status==2)
                            {
                                res.send("مدرس عضویت شما را در این دوره رد میکند، لطفا با مدرس تماس بگیرید.");
                            }
                        }
                        MainDB.collection("dircs").updateOne({dirId: RTRD.dirId},{$set:{ReqsCount: RC, Reqs:RSS}});
                        res.send("درخواست عضویت ثبت شد، پس از تایید میتوانید مطالب را مشاهده کنید.");
                    }
                }
            });
        }
        else
        {
            res.send("");
        }
    });


    app.all('/sendCanReq', function (req, res) {
        if(req.session.user)
        {
            var ReqJs = JSON.parse(req.body.ReqData);
            MainDB.collection("dircs").find({dirId: ReqJs.dirId}).toArray(function (errOSRR, RFRD) {
                if(errOSRR) throw errOSRR;
                if(RFRD.length==0)
                {
                    res.send("");
                }
                else
                {
                    MainDB.collection("users").find({UserId: req.session.user.UserId}).toArray(function (errOSUR, RFUR) {
                        if(errOSUR) throw errOSUR;
                        if(RFUR.length == 0)
                        {
                            res.send("");
                        }                
                        else
                        {
                            var FoundDRIU = 0;
                            for(var i=0; i< RFUR[0].DirCount && FoundDRIU==0; i++)
                            {
                                if(RFUR[0].DirNodes[i].dirId == ReqJs.dirId)
                                {
                                    FoundDRIU=1;
                                    MainDB.collection("users").updateOne({UserId: req.session.user.UserId}, { $inc : {DirCount:-1} , $pull:{DirNodes:{dirId:ReqJs.dirId}}});
                                    MainDB.collection("dircs").updateOne({dirId : ReqJs.dirId}, { $inc : {subsCount:-1} , $pull : {subsNode :  req.session.user.UserId }});
                                    //AnalyzeUserNotif(req.session.user.UserId);
                                    res.send("عضویت شما با موفقیت لغو شد.")
                                }
                            }
                        }        
                    });
                }
            });
        }
        else
        {
            res.send("");
        }
    });



    
    app.all('/sendConfReq', function (req, res) {
        if(req.session.user)
        {
            var ReqJs = JSON.parse(req.body.ReqData);
            MainDB.collection("dircs").find({dirId: ReqJs.dirId}).toArray(function (errOSRR, RFRD) {
                if(errOSRR) throw errOSRR;
                if(RFRD.length==0)
                {
                    res.send("");
                }
                else
                {
                    var RTRD = RFRD[0];
                    if(RTRD.dirPrivacy == 0 || RTRD.dirPrivacy == 1)
                    {
                        res.send("");
                    }
                    else if(RTRD.dirPrivacy == 2)
                    {
                        var dt = dateTime.create();
                        var formatted = dt.format('Y-m-d H:M:S');
                        var RequestedBefore = -1, RSS = [];
                        for(var i=0; i<RTRD.ReqsCount; i++)// save all latest request and search if user requested befor an get the index on user's request
                        {
                            RSS.push(RTRD.Reqs[i]);
                            if(RTRD.Reqs[i].UserId == ReqJs.userId)
                            {
                                RequestedBefore = i;// user found. user have requested before and it's index is 'i'
                            }
                        }
                        var RC = RTRD.ReqsCount;
                        if(RequestedBefore==-1)// user haven't request yet
                        {
                            res.send("");
                        }
                        else                   // user requested before and his request is RSS[RequestedBefore]
                        {
                            if(RSS[RequestedBefore].Status==0)
                            {
                                if(ReqJs.reqType == 0)
                                {
                                    if(req.session.user.UserId == RTRD.creatorUserId)
                                    {
                                        RSS[RequestedBefore].Status = 1;
                                        console.log(JSON.stringify(RSS));
                                        MainDB.collection("dircs").updateOne({dirId: RTRD.dirId}, { $set: { Reqs: RSS} });
                                        res.send(JSON.stringify({userId: ReqJs.userId, Message : "اطلاعات با موفقیت ثبت شد"}));
                                    }
                                    else
                                    {
                                        console.log("0");
                                        console.log(req.session.user.userId);
                                        console.log(RTRD.creatorUserId);
                                        console.log("///////");
                                    }
                                }
                                else if(ReqJs.reqType == 1)
                                {
                                    if(req.session.user.UserId == RTRD.creatorUserId)
                                    {
                                        RC--;// delete the request and accept it
                                        MainDB.collection("users").updateOne({UserId : Number(ReqJs.userId)}, { $push: { DirNodes: {dirId: RTRD.dirId , dateJoined : formatted}}, $inc: {DirCount:1} });
                                        MainDB.collection("dircs").updateOne({dirId: RTRD.dirId}, { $push: { subsNode: Number(ReqJs.userId)}, $inc: {subsCount:1} , $set: {ReqsCount: RC} , $pull : {Reqs : {UserId : RSS[RequestedBefore].UserId} } });
                                        res.send(JSON.stringify({userId: ReqJs.userId, Message : "اطلاعات با موفقیت ثبت شد"}));
                                    }
                                }
                            }else if(RSS[RequestedBefore].Status==2)
                            {
                                res.send("");
                            }
                        }
                    }
                }
            });
        }
        else
        {
            res.send("");
        }
    });


    app.all('/dir', function (req, res) { //        direc content
        var ReqJs = JSON.parse(req.body.ReqData);
        console.log(JSON.stringify(ReqJs));
        MainDB.collection("dircs").find({dirId : ReqJs.drId}).toArray(function (err, DirRes) {
            if (err) {
                throw err;
            }
            if (DirRes.length == 0) {
                EJS.renderFile(viewsPath + "/MainDiv-dir.ejs", { error: 404 }, function (err, str) {
                    if(err) throw err;
                    EJS.renderFile(viewsPath + "/navbar.ejs", { navsCount : 0 }, function (naverr, navstr) {
                        if(naverr) throw naverr;
                        res.send({htm: str, nav: navstr}); 
                    })
                });
            }
            else 
            {
                var dt = dateTime.create();
                var formatted = dt.format('Y-m-d H:M');
                if(req.session.user)
                {
                    if(req.session.user.UserId == DirRes[0].creatorUserId)  //  Master himself
                    {
                        var MasterReqForEJS = {
                            loggedIn : 1,
                            master:1,
                            dirId: DirRes[0].dirId,
                            dirName : DirRes[0].dirName,
                            dirDesc : DirRes[0].dirDesc,
                            createdTime : DirRes[0].createdTime,
                            creatorUserShow : DirRes[0].creatorUserShow,
                            subsCount : DirRes[0].subsCount,
                            dirPrivacy : DirRes[0].dirPrivacy,
                            CurrTime : formatted
                        };
                        var NodesToShow = [];
                        if(DirRes[0].postNodesCount != 0)
                        {
                            var DirPostsNode = DirRes[0].dbNodes, PinnedDir = DirRes[0].pinnedNode;
                            MasterReqForEJS['postNodesCount'] = 0;
                            if (!fs.existsSync(DirPostsNode+"/"+PinnedDir)){
                                MasterReqForEJS['pinned'] =0;
                            }
                            else
                            {
                                MasterReqForEJS['pinned'] = 1;
                                MasterReqForEJS['postNodesCount'] = MasterReqForEJS['postNodesCount']+1;
                                var PinnedPost = JSON.parse(fs.readFileSync(DirPostsNode+"/"+PinnedDir));
                                MasterReqForEJS['pinnedMsg'] = PinnedPost['Message'];
                                MasterReqForEJS['pinnedMsgCnt'] = PinnedPost['seenCount'];
                            }
                            var tempNodeId = DirRes[0].LastPostId;
                            console.log(tempNodeId);
                            for(var i=0; i<DirRes[0].postNodesCount; i++)
                            {
                                var PostJS = JSON.parse(fs.readFileSync(DirPostsNode+"/"+tempNodeId));
                                if(PinnedDir!=tempNodeId)
                                {
                                    MasterReqForEJS['postNodesCount'] = MasterReqForEJS['postNodesCount']+1;
                                    NodesToShow.push({
                                        postId      :   PostJS.postID,
                                        createdTime	:   PostJS.createdTime,
                                        seenCount	:	PostJS.seenCount,
                                        postTitle   :   PostJS.postTitle,
                                        Message     :   PostJS.Message
                                    });
                                }
                                tempNodeId = PostJS.PreviousPostId;
                            }
                        }
                        else
                        {
                            MasterReqForEJS['postNodesCount'] = 0;
                        }
                        MasterReqForEJS['dbNodes'] = NodesToShow;
                        MasterReqForEJS['ReqCountsForDir'] = 0;
                        var ReqsToJoin = [];
                        if(DirRes[0].dirPrivacy==2)
                        {
                            if(DirRes[0].ReqsCount != 0)
                            {
                                for(var i=0; i<DirRes[0].ReqsCount; i++)
                                {
                                    if(DirRes[0].Reqs[i].Status == 0)
                                    {
                                        MasterReqForEJS['ReqCountsForDir'] = MasterReqForEJS['ReqCountsForDir']+1;
                                        ReqsToJoin.push({
                                            UserId: DirRes[0].Reqs[i].UserId, Status:0,
                                            userShow: DirRes[0].Reqs[i].userShow,
                                            ReqCount: DirRes[0].Reqs[i].ReqCount,
                                            Msg: DirRes[0].Reqs[i].ReqDesc[DirRes[0].Reqs[i].ReqCount-1].Msg,
                                            Date: DirRes[0].Reqs[i].ReqDesc[DirRes[0].Reqs[i].ReqCount-1].Date});
                                    }
                                    
                                }
                            }
                        }
                        MasterReqForEJS['ReqsToJoin'] = ReqsToJoin;




                        EJS.renderFile(viewsPath + "/MainDiv-dir.ejs", MasterReqForEJS, function (err, str) {
                            if(err) throw err;
                            EJS.renderFile(viewsPath + "/navbar.ejs", { navsCount : 1 , navs: [ {name: DirRes[0].dirName, onclick: "LdDir("+DirRes[0].dirId+")"} ]}, function (naverr, navstr) {
                                if(naverr) throw naverr;
                                res.send({htm: str, nav: navstr}); 
                            })
                        });
                    }
                    else // Not the master
                    {
                        var ReqForEJS = {
                            loggedIn : 1,
                            dirName : DirRes[0].dirName,
                            dirDesc : DirRes[0].dirDesc,
                            createdTime : DirRes[0].createdTime,
                            creatorUserShow : DirRes[0].creatorUserShow,
                            subsCount : DirRes[0].subsCount,
                            dirPrivacy : DirRes[0].dirPrivacy,
                            CurrTime : formatted
                        };
                        var RegisteredOnDir = 1; // be able to see the content, either registered on dirc or the dirc is public
                        ReqForEJS['submitted'] = 0; // registered and submited on dirc, private or public doesn't mastter
                        ReqForEJS['dirId'] = DirRes[0].dirId;
                        if(DirRes[0].dirPrivacy!=0)
                        {
                            if(DirRes[0].dirPrivacy==2)
                                RegisteredOnDir = 0;
                            for(var i = 0; i<DirRes[0].subsNode.length && ReqForEJS['submitted'] == 0 ; i++)
                            {
                                if(DirRes[0].subsNode[i] == req.session.user.UserId)
                                {
                                    RegisteredOnDir = 1;
                                    ReqForEJS['submitted'] = 1;
                                }
                            }
                        }
                        if(RegisteredOnDir==1)
                        {
                            ReqForEJS['RegisteredOnDir'] = 1;
                            var NodesToShow = [];
                            if(DirRes[0].postNodesCount != 0)
                            {
                                var DirPostsNode = DirRes[0].dbNodes, PinnedDir = DirRes[0].pinnedNode;
                                ReqForEJS['postNodesCount'] = 0;
                                if (!fs.existsSync(DirPostsNode+"/"+PinnedDir)){
                                    ReqForEJS['pinned'] =0;
                                }
                                else
                                {
                                    ReqForEJS['pinned'] = 1;
                                    ReqForEJS['postNodesCount'] = ReqForEJS['postNodesCount']+1;
                                    var PinnedPost = JSON.parse(fs.readFileSync(DirPostsNode+"/"+PinnedDir));
                                    ReqForEJS['pinnedMsg'] = PinnedPost['Message'];
                                    ReqForEJS['pinnedMsgCnt'] = PinnedPost['seenCount'];
                                }
                                var ShowNodeCount = 0, tempNodeId = DirRes[0].LastPostId;
                                while(ShowNodeCount < 12)
                                {
                                    if (tempNodeId != 10){
                                        var PostJS = JSON.parse(fs.readFileSync(DirPostsNode+"/"+tempNodeId));

                                        if(PinnedDir!=tempNodeId)
                                        {
                                            ReqForEJS['postNodesCount'] = ReqForEJS['postNodesCount']+1;
                                            NodesToShow.push({
                                                postId      :   PostJS.postID,
                                                createdTime	:   PostJS.createdTime,
                                                seenCount	:	PostJS.seenCount,
                                                postTitle   :   PostJS.postTitle,
                                                Message     :   PostJS.Message
                                            });
                                            ShowNodeCount++;
                                        }
                                        tempNodeId = PostJS.PreviousPostId;
                                    }
                                    else
                                    {
                                        ShowNodeCount=12;
                                    }
                                }
                            }
                            else
                            {
                                ReqForEJS['postNodesCount'] = 0;
                            }
                            ReqForEJS['dbNodes'] = NodesToShow;
                        }
                        else
                        {
                            var Reqed = 3, InfoOfReq = {};
                            var RequestsArray = DirRes[0].Reqs;
                            for(var i = 0; i < DirRes[0].ReqsCount && Reqed==3; i++)
                            {
                                if(RequestsArray[i].UserId == req.session.user.UserId)
                                {
                                    Reqed = RequestsArray[i].Status;
                                    InfoOfReq = RequestsArray[i].ReqDesc[RequestsArray[i].ReqCount-1];
                                }
                            }
                            ReqForEJS['Reqed'] = Reqed;
                            ReqForEJS['InfoOfReq'] = InfoOfReq;
                        }
                        EJS.renderFile(viewsPath + "/MainDiv-dir.ejs", ReqForEJS, function (err, str) {
                            if(err) throw err;
                            EJS.renderFile(viewsPath + "/navbar.ejs", { navsCount : 1 , navs: [ {name: DirRes[0].dirName, onclick: "LdDir("+DirRes[0].dirId+")"} ]}, function (naverr, navstr) {
                                if(naverr) throw naverr;
                                res.send({htm: str, nav: navstr}); 
                            })
                        });
                    }
                }
                else // not logged in
                {
                    var ReqForEJS = {
                        dirName : DirRes[0].dirName,
                        dirDesc : DirRes[0].dirDesc,
                        createdTime : DirRes[0].createdTime,
                        creatorUserShow : DirRes[0].creatorUserShow,
                        subsCount : DirRes[0].subsCount,
                        dirPrivacy : DirRes[0].dirPrivacy,
                        CurrTime : formatted
                    };
                    if(DirRes[0].dirPrivacy==1)
                    {
                        var NodesToShow = [];
                        if(DirRes[0].postNodesCount != 0)
                        {
                            var DirPostsNode = DirRes[0].dbNodes, PinnedDir = DirRes[0].pinnedNode;
                            ReqForEJS['postNodesCount'] = 0;
                            if (!fs.existsSync(DirPostsNode+"/"+PinnedDir)){
                                ReqForEJS['pinned'] =0;
                            }
                            else
                            {
                                ReqForEJS['pinned'] = 1;
                                ReqForEJS['postNodesCount'] = ReqForEJS['postNodesCount']+1;
                                var PinnedPost = JSON.parse(fs.readFileSync(DirPostsNode+"/"+PinnedDir));
                                ReqForEJS['pinnedMsg'] = PinnedPost['Message'];
                                ReqForEJS['pinnedMsgCnt'] = PinnedPost['seenCount'];
                            }
                            var ShowNodeCount = 0, tempNodeId = DirRes[0].LastPostId;
                            while(ShowNodeCount < 12)
                            {
                                if (tempNodeId != 10)
                                {
                                    var PostJS = JSON.parse(fs.readFileSync(DirPostsNode+"/"+tempNodeId));
                                    if(PinnedDir!=tempNodeId)
                                    {
                                        ReqForEJS['postNodesCount'] = ReqForEJS['postNodesCount']+1;
                                        NodesToShow.push({
                                            postId      :   PostJS.postID,
                                            createdTime	:   PostJS.createdTime,
                                            seenCount	:	PostJS.seenCount,
                                            postTitle   :   PostJS.postTitle,
                                            Message     :   PostJS.Message
                                        });
                                        ShowNodeCount++;
                                    }
                                    tempNodeId = PostJS.PreviousPostId;
                                }
                                else
                                {
                                    ShowNodeCount=12;
                                }
                            }
                        }
                        else
                        {
                            ReqForEJS['postNodesCount'] = 0;
                        }
                        ReqForEJS['dbNodes'] = NodesToShow;
                    }
                    EJS.renderFile(viewsPath + "/MainDiv-dir.ejs", ReqForEJS, function (err, str) {
                        if(err) throw err;
                        EJS.renderFile(viewsPath + "/navbar.ejs", { navsCount : 1 , navs: [ {name: DirRes[0].dirName, onclick: "LdDir("+DirRes[0].dirId+")"} ]}, function (naverr, navstr) {
                            if(naverr) throw naverr;
                            res.send({htm: str, nav: navstr}); 
                        })
                    });
                }
            }
        });
    });




    app.all('/newDirPost', function (req, res) {
        if(req.session.user)
        {
            var postDataToSave = JSON.parse(req.body.ReqData);
            MainDB.collection("dircs").find({dirId: postDataToSave.dirId}).toArray(function (errOSRR, RFRD) {
                if(errOSRR) throw errOSRR;
                if(RFRD.length==0)
                {
                    res.send("");
                }
                else
                {
                    var RFTSP = RFRD[0];
                    console.log(JSON.stringify(RFTSP));
                    if(req.session.user.UserId == RFTSP.creatorUserId)
                    {
                        var DirPostsNode = RFTSP.dbNodes, LstPstId = RFTSP.LastPostId, pstNdsCnt = RFTSP.postNodesCount;
                        LstPstId++;
                        pstNdsCnt++;
                        fs.exists(DirPostsNode+"/"+LstPstId.toString(), function(exists){
                            if(exists){
                                // error handling
                            } else {
                                var dt = dateTime.create();
                                var formatted = dt.format('Y-m-d H:M:S');
                                var PostMessage = postEncoder.encode(postDataToSave.postContent),
                                    PostTitle = postEncoder.encode(postDataToSave.postTitle);
                                var postToSave = { 
                                    postID : LstPstId, dirId: postDataToSave.dirId,
                                    UserIdofCreator: RFTSP.creatorUserId,
                                    createdTime:formatted, seenCount:0, seenNodes: [],
                                    postTitle : PostTitle,
                                    Message: PostMessage,
                                    PreviousPostId: LstPstId-1,
                                    NextPostId: 10,
                                    VER: VERSION
                                };
                                fs.writeFile(DirPostsNode+"/"+LstPstId.toString(), JSON.stringify(postToSave), function (ErrSPF) {
                                    if(ErrSPF) throw ErrSPF;
                                    if(postToSave.PreviousPostId != 10) // 10 means NULL
                                    {
                                        var PrevPost = JSON.parse(fs.readFileSync(DirPostsNode + "/" + postToSave.PreviousPostId));
                                        PrevPost.NextPostId = postToSave.postID;
                                        fs.writeFile(DirPostsNode + "/" + postToSave.PreviousPostId, JSON.stringify(PrevPost), function (ErrSPF) {
                                            if(ErrSPF) throw ErrSPF;
                                        });
                                    }
                                    MainDB.collection("dircs").updateOne({dirId: RFTSP.dirId}, { $set: {LastPostId : LstPstId, postNodesCount:pstNdsCnt}});
                                    res.send(JSON.stringify({message: "پست با موفقیت ثبت شد"}));
                                });
                            }
                        });
                    }
                }
            });
        }
        else
        {
            res.send("");
        }
    });






    app.all('/removePost', function (req, res) {
        if(req.session.user)
        {
            var postDataToRemove = JSON.parse(req.body.ReqData);
            MainDB.collection("dircs").find({dirId: postDataToRemove.dirId}).toArray(function (errOSRR, RFRD) {
                if(errOSRR) throw errOSRR;
                if(RFRD.length==0)
                {
                    res.send("");
                }
                else
                {
                    var RFTSP = RFRD[0];
                    if(req.session.user.UserId == RFTSP.creatorUserId)
                    {
                        var DirPostsNode = RFTSP.dbNodes;
                        fs.exists(DirPostsNode + "/" + postDataToRemove.postId, function(exists){
                            if(exists){
                                var CurrPost = JSON.parse(fs.readFileSync(DirPostsNode + "/" + postDataToRemove.postId));
                                if(CurrPost.PreviousPostId != 10) // 10 means NULL
                                {
                                    var PrevPost = JSON.parse(fs.readFileSync(DirPostsNode + "/" + CurrPost.PreviousPostId));
                                    PrevPost.NextPostId = CurrPost.NextPostId;
                                    fs.writeFile(DirPostsNode + "/" + CurrPost.PreviousPostId, JSON.stringify(PrevPost), function (ErrSPF) {
                                        if(ErrSPF) throw ErrSPF;
                                    });
                                }
                                if(CurrPost.NextPostId != 10) // 10 means NULL
                                {
                                    var NextPost = JSON.parse(fs.readFileSync(DirPostsNode + "/" + CurrPost.NextPostId));
                                    NextPost.PreviousPostId = CurrPost.PreviousPostId;
                                    fs.writeFile(DirPostsNode + "/" + CurrPost.NextPostId, JSON.stringify(NextPost), function (ErrSPF) {
                                        if(ErrSPF) throw ErrSPF;
                                    });
                                }
                                if(CurrPost.postID == RFTSP.LastPostId)
                                {
                                    RFTSP.LastPostId = CurrPost.PreviousPostId;
                                }
                                fs.unlinkSync(DirPostsNode + "/" + postDataToRemove.postId);
                                MainDB.collection("dircs").updateOne({dirId: RFTSP.dirId}, { $set: {LastPostId : RFTSP.LastPostId, postNodesCount:RFTSP.postNodesCount-1}});
                                res.send(JSON.stringify({message: "پست با موفقیت حذف شد"}));
                            } else {
                                res.send(JSON.stringify({message: "پستی با این مشخصات پیدا نشد!!!"}));
                            }
                        });
                    }
                }
            });
        }
        else
        {
            res.send("");
        }
    });






    app.post('/NewDirec', function (req, res) {
        if (req.session.user && req.session.user.userType==1) {
            if(req.session.user.CSU == 1)
            {
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
                            creatorUserShow:req.session.user.userShow,
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
                        if(IncomingData['dirPrivacy']==2)
                        {
                            DirecToSave['ReqsCount'] = 0;
                            DirecToSave['Reqs'] = [];
                        }
                        
                        MainDB.collection("dircs").insertOne(DirecToSave, function (err, resu) {
                            if (err) throw err;
                            MainDB.collection("users").updateOne({ username: req.session.user.username }, { $push: { SetdirNodes: ThisDirecId}, $inc: {SetdirCount:1} } );
                            res.end(JSON.stringify({ status : 200 , message: "direc saved successfully :D" }));
                        });
                    });
                }
            }
            else
            {
                res.send(JSON.stringify({ status : 400 , message: "عضویت شما هنوز تایید نشده است." }));
            }
        }
        else {
            res.send(JSON.stringify({ status : 400 , message: "برای ثبت دوره باید وارد شوید!!!" }));
        }
    });


    app.get('/data', function (req, res) {
        console.log(postEncoder.func("this is a test"))
        if (req.session.user) 
        {
            res.send(JSON.stringify({reqSessionUser:req.session.user,Reqq:req.session}));
        }
        else
        {
            res.redirect("/?reqid="+RandomizedId.generate(32));
        }
    });


    app.get('/conf', function (req, res) {
        if(!req.query.id)
        {
            res.send("<html><head><title>Darsam</title></head><body>requested link expired!!!<br>for more information contact <a href='"+RootAddressLink+"'>darsam.mail@gmail.com</a></body></html>");
        }
        else
        {
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
                    res.redirect("/?reqid="+RandomizedId.generate(32));
                }
                else
                {
                    res.send("<html><head><title>Darsam</title></head><body>requested link expired!!!<br>for more information contact <a href='"+RootAddressLink+"'>darsam.mail@gmail.com</a></body></html>");
                }
            });
        }
    });


    async function AnalyzeUserNotif(UserIdForNA) 
    {
        
    }

    var serverNode = app.listen(80,function () {
        hostAddress = serverNode.address().address;
        if(hostAddress=="::")// resolve hostAddress if it's on localhost
            hostAddress = "http://localhost"
        console.log("service started on: " + hostAddress+":"+ serverNode.address().port);
    });

});// End of MongoClient.connect