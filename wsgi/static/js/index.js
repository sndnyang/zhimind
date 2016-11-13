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

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

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
        $("body").animate({
            scrollTop: "0"
        }, 500);
    });

    if ($(window).scrollTop() > 100) {
        $("#top").fadeIn(500);
    } else {
        $("#top").fadeOut(500);
    }
}

function to_backend_create(type, json) {
    $.ajax({
        url: '/new'+type,
        method: 'POST',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(json),
        success: function (result) {
            if (result.error !== "success") {
                alert(result.error);
                return;
            }

            var ctype, div = $("#tutorials");
            if (type === 'practice') {
                ctype = '练习';
            }
            else if (type === 'tutorial') {
                ctype = '教程';
            }
            var entity = '<table> <tr valign="top"> <td> '+ctype+' </td> '+
                '<td>|</td> <td> <i> 您发布了:</i> <br> <a href="/'+type+'/'+
                result.uuid+'">'+json.title+'</a> </td></tr></table>';
            div.append(entity);
        },
        error: backendError
    });
}