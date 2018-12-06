function LoadMainDiv() 
{
	var xp = new XMLHttpRequest();
	xp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			$("#MainDiv").html(this.responseText);
			$("#loader").css("display","none");
			$("#loader").css("opacity","0");
			$("#MainDiv").css("opacity","0");
			$("#MainDiv").css("display","block");
			$("#MainDiv").animate({opacity: '1'},500);
			$(".HoverPanel").hover(function(){
				$(this).css("box-shadow","0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)");
			},
			function(){
				$(this).css("box-shadow","");
			});
		}
	};
	xp.open("POST", "/direcList");
	xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	var d = new Date();
	xp.send({Time:d.getTime});
	
	//$(".SecondCss").load("style.css");
    $("#LoginBtn").click(function(){
        $("#LoginModal").modal();
	});

	$("#NewDircBtn").click(function(){
        $("#NewDircModal").modal();
	});

	$("#SignupBtn").click(function(){
		$("#MasterDesDiv").css("display","none");
		$('#MasterCheck').prop('checked', false);
		$("#MasterDesDiv").css("opacity","0");
        $("#SignupModal").modal();
	});

	$("#SignupFromLogin").click(function(){
		$("#MasterDesDiv").css("display","none");
		$('#MasterCheck').prop('checked', false);
		$("#MasterDesDiv").css("opacity","0");
		$('#LoginModal').modal('toggle'); 
		$("#SignupModal").modal();
	});

	$("#SubmitLogin").click(function(){
		$("#SubmitLogin").prop("disabled",true);
		$("#LogLoad").html('<div class="container little-loader"></div>');
		if($("#usrnameForLogin").val()=="" || $("#pswForLogin").val()=="")
		{
			$("#LogLoad").html("");
			alert("لطفا همه فیلد ها را با دقت پر کنید!!!");
		}
		else
		{
			var DataTS = "UserData=" + JSON.stringify({
				username: $("#usrnameForLogin").val(),
				password: $("#pswForLogin").val()
			});
			var xp = new XMLHttpRequest();
			xp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					$("#LogLoad").html("");
					var oob = JSON.parse(this.responseText);
					if(oob.status == 200)
					{
						window.location.replace("/?reqid=7489");
					}
					else if(oob.status == 400)
					{
						alert(oob.message);
						$('#LoginModal').modal('toggle');
						$('#LoginModal').remove();
					}
					else if(oob.status == 403)
					{
						$("#SubmitLogin").prop("disabled",false);
						alert("نام کاربری یا رمز عبور اشتباه است!!!");
						$("#usrnameForLogin").val("");
						$("#pswForLogin").val("");
					}
				}
			};
			xp.open("POST", "/login");
			xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xp.send(DataTS);
		}
	});

	$("#SubmitSign").click(function(){
		$("#SubmitSign").prop("disabled",true);
		$("#signLoad").html('<div class="container little-loader"></div>');
		if($("#usrnameForSign").val()=="" || $("#pswForSign").val()=="" || $("#usrShwForSign").val()=="" || $("#emailForSign").val()=="" || $("#pswForSign").val()!=$("#RepswForSign").val())
		{
			$("#signLoad").html("");
			alert("لطفا همه فیلد ها را با دقت پر کنید!!!");
		}
		else
		{
			var DataTSO = {
				username: $("#usrnameForSign").val(),
				password: $("#pswForSign").val(),
				userShow: $("#usrShwForSign").val(),
				email: $("#emailForSign").val(),
				userType: 2
			};
			if($("#MasterCheck").is(':checked'))
			{
				DataTSO.SignupDesc = $("#MasterDes").val();
				DataTSO.userType = 1;
			}
			var DataTS = "UserData=" + JSON.stringify(DataTSO);
			var xp = new XMLHttpRequest();
			xp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					$("#signLoad").html("");
					var oob = JSON.parse(this.responseText);
					if(oob.status == 200)
					{
						alert("اطلاعات با موفقیت ثبت شد");
						$('#SignupModal').modal('toggle');
						setTimeout(function () {
							window.location.replace("/?reqid=7489");
						},2500);
					}
					else if(oob.status == 400)
					{
						alert(oob.message);
						window.location.replace("/logout");
					}
					else if(oob.status == 500)
					{
						alert("نام کاربری یا نام مستعار یا ایمیل تکراری است!!!");
						$("#SubmitSign").prop("disabled",false);
					}
				}
			};
			xp.open("POST", "/signup");
			xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xp.send(DataTS);
		}
	});
	
	$("#MasterCheck").change(function() {
		if(this.checked) {
			$("#MasterDesDiv").css("display","block");
			$("#MasterDesDiv").animate({opacity: '1'},400);
		}
		else
		{
			$("#MasterDesDiv").animate({opacity: '0'},400,function () {
				$("#MasterDesDiv").css("display","none");
			});
		}
	});


	$("#SubmitNewD").click(function(){
		$("#SubmitNewD").prop("disabled",true);
		$("#NDLoad").html('<div class="container little-loader"></div>');
		if($("#direcNameInp").val()=="" || $("#direcDescInp").val()=="")
		{
			$("#NDLoad").html("");
			alert("لطفا همه فیلد ها را با دقت پر کنید!!!");
		}
		else
		{
			var DataTSO = {
				dirName: $("#direcNameInp").val(),
				dirDesc: $("#direcDescInp").val(),
				dirPrivacy: 1
			};
			if($("#DirecPrivacy").is(':checked'))
			{
				DataTSO.dirPrivacy = 2;
			}
			var DataTS = "DirecData=" + JSON.stringify(DataTSO);
			var xp = new XMLHttpRequest();
			xp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					$("#NDLoad").html("");
					var oob = JSON.parse(this.responseText);
					if(oob.status == 200)
					{
						alert("اطلاعات با موفقیت ثبت شد");
						$('#NewDircModal').modal('toggle');
						setTimeout(function () {
							window.location.replace("/?reqid=7489");
						},1800);
					}
					else if(oob.status == 400)
					{
						alert(oob.message);
					}
				}
			};
			xp.open("POST", "/NewDirec");
			xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xp.send(DataTS);
		}
	});
}







function LdDir(dId) { // goto selected direc(dId)
	$("#MainDiv").animate({opacity: '0'},250,function () {
		$("#MainDiv").css("display","none");
		$("#loader").css("opacity","0");
		$("#loader").css("display","block");
		$("#loader").animate({opacity: '1'},250,function () {
			var xp = new XMLHttpRequest();
			var DataTS = "ReqData=" + JSON.stringify({
				drId : dId
			});
			xp.onreadystatechange = function () {
				if (this.readyState == 4 && this.status == 200) {
					var Resp = JSON.parse(this.responseText);
					$("#MainDiv").html(Resp.htm);
					$("#navbarPaths").html(Resp.nav);
					$("#loader").css("display","none");
					$("#loader").css("opacity","0");
					$("#MainDiv").css("opacity","0");
					$("#MainDiv").css("display","block");
					$("#MainDiv").animate({opacity: '1'},500);
					$(".HoverPanel").hover(function(){
						$(this).css("box-shadow","0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)");
					},
					function(){
						$(this).css("box-shadow","");
					});
				}
			};
			xp.open("POST", "/dir");
			xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xp.send(DataTS);
		});
	});
}


function newDircPost()
{
    var currentBtn = document.getElementById("submitPostCont");
    currentBtn.onclick="";
	currentBtn.innerHTML="لطفا کمی صبر کنید...";
	var dirIdToSavePost = arguments[0];
	var DataTS = { postContent : document.getElementById("postContent").value , postTitle : document.getElementById("postTitle").value , dirId : dirIdToSavePost};
    var xp = new XMLHttpRequest();
    xp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
			var Resp = JSON.parse(this.responseText);
			if(Resp.message)
			{
				alert(Resp.message);
			}
			LdDir(dirIdToSavePost);
        }
    };
    xp.open("POST", "/newDirPost");
    xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xp.send("ReqData="+JSON.stringify(DataTS));
}



function removePost()
{
	var dirIdToRemovePost = arguments[0];
	var DataTS = { postId : arguments[1] , dirId : dirIdToRemovePost};
    var xp = new XMLHttpRequest();
    xp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
			var Resp = JSON.parse(this.responseText);
			if(Resp.message)
			{
				alert(Resp.message);
			}
			LdDir(dirIdToRemovePost);
        }
    };
    xp.open("POST", "/removePost");
    xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xp.send("ReqData="+JSON.stringify(DataTS));
}



function confirmusertojoin()
{
    var NextBtnId = "ConfUsrToJoin1";
    if(arguments[0]==1) { NextBtnId = "ConfUsrToJoin0"; }
    document.getElementById(NextBtnId).innerHTML = "";
    var currentBtn = document.getElementById("ConfUsr"+arguments[1]);
    currentBtn.onclick="";
    currentBtn.innerHTML="لطفا کمی صبر کنید...";
    var xp = new XMLHttpRequest();
    xp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            var Resp = JSON.parse(this.responseText);
            document.getElementById("userdiv"+Resp.userId).innerHTML = "";
            alert(Resp.Message);
        }
    };
    xp.open("POST", "/sendConfReq");
    xp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    xp.send("ReqData="+JSON.stringify({ "reqType": arguments[0] , "dirId" : Number(arguments[2]) , "userId" : arguments[1] }));
}