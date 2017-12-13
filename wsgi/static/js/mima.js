
function mimaCheck() {

    var appname = $("#appname").val(), username = $("#username").val(),
        password = $("#password").val();
    var data = {'appname': appname, 'username': username, 'password': password};
    
    $.ajax({  
        type: "post", //请求方式  
        url: "check", //发送请求地址  
        timeout: 30000,//超时时间：30秒
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(data),
        //请求成功后的回调函数 data为json格式  
        success:function(data){
            if (data.error) {
                if (data.error != "密码不正确") {
                    alert(data.error);
                } else {
                    $("#apm").html(data.hint);
                }
                return;
            }
            alert("正确！");
        },  
        //请求出错的处理  
        error: function(){  
            alert("请求出错");  
        }
    });
}
