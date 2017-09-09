String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g,
        function(m,i){
            return args[i];
        }
    );
}

String.prototype.trim = function() {
    return this.replace(/(^\s*)|(\s*$)/g, "");
}

String.prototype.startsWith = function(str){  
    var reg=new RegExp("^"+str);  
    return reg.test(this);  
}  

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
String.prototype.startWith = String.prototype.startsWith;
String.prototype.endWith = String.prototype.startsWith;

function backendError(e) {
    alert("系统bug " + e.status + ' ' + e.statusText);
}

function getRequest() {
   var url = location.search; //获取url中"?"符后的字串
   var theRequest = new Object();
   if (url.indexOf("?") != -1) {
      var str = url.substr(1);
      strs = str.split("&");
      for(var i = 0; i < strs.length; i ++) {
         theRequest[strs[i].split("=")[0]] = decodeURI(strs[i].split("=")[1]);
      }
   }
   else {
       return null;
   }
   return theRequest;
}

function getSharpParam() {
   var url = document.URL;
   var theRequest = new Object();
   if (url.indexOf("#") != -1) {
      var str = url.split("#")[1];
      strs = str.split("&");
      for(var i = 0; i < strs.length; i ++) {
          if (!strs[i].split("=")[0] || strs[i].split("=")[0] === '')
              continue
          theRequest[strs[i].split("=")[0]] = decodeURI(strs[i].split("=")[1]);
      }
   }
   else {
       return null;
   }
   return theRequest;
}

function jsonToSharpParam(json) {
    var temp = ""
    for (var e in json) {
        temp += "{0}={1}&".format(e, json[e]);
    }
    return temp;
}

/**
 * 回到顶部
 */
function backToTop() {
    //滚页面才显示返回顶部
    $(window).scroll(function() {
        if ($(window).scrollTop() > 100) {
            $("#top").fadeIn(500);
        } else {
            $("#top").fadeOut(500);
        }
    });

    //点击回到顶部
    $("#top").click(function() {
        $("html,body").animate({
            scrollTop: "0"
        }, 500);
    });

    if ($(window).scrollTop() > 100) {
        $("#top").fadeIn(500);
    } else {
        $("#top").fadeOut(500);
    }
}

function createLoadingDiv(prompt) {
    var _PageWidth = document.documentElement.clientWidth,
        _PageHeight = document.documentElement.clientHeight,
        _LoadingTop = _PageHeight / 2,
        _LoadingLeft = _PageWidth > 215 ? (_PageWidth - 215) / 2 : 0,
        _LoadingHtml = $('<div></div>');
    _LoadingHtml.attr("id", "loadingDiv");
    _LoadingHtml.html("<p>"+prompt+"</p>");
    return _LoadingHtml
}
