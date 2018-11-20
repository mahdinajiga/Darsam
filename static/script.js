$(document).ready(function(){
	//$(".SecondCss").load("style.css");
	$(".HoverPanel").hover(function(){
		$(this).css("box-shadow","0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)");
	},
	function(){
		$(this).css("box-shadow","");
	});
    $("#LoginBtn").click(function(){
        $("#LoginModal").modal();
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
						location.reload();
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
							location.reload();
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
});





function onl() {
	//$("#MainDiv").fadeOut();
	$("#MainDiv").animate({opacity: '0'},500,function () {
		//$("#MainDiv").html("Data");
		$("#MainDiv").animate({opacity: '1'},500);
	});

	//$("#loader").animate({display: 'block'});
}