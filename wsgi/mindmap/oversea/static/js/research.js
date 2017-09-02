var timerId;

function filterProfessorByPosition() {
    var value = $("#positionName").val();

    filterList = []
    for (var i in collegeList) {
        if (!value) {
            filterList.push(collegeList[i]);
            continue;
        }
        if (collegeList[i].position == true) {
            if (value == "always") {
                if (collegeList[i].term == "always")
                    filterList.push(collegeList[i]);
            } else {
                filterList.push(collegeList[i]);
            }
        }
    }
    pageIt(filterList, "research", 0);
}

function fillResearchInformation(item) {
    var temp, tr = $("<tr></tr>"),
        select = $("<select></select>"),
        option_tmp = "<option>{0}</option>";

    for (var j in item.tags) {
        select.append($(option_tmp.format(item.tags[j])));
    }
    temp = item.name.trim();
    if (temp.length > 16) {
        var parts = temp.split(/\W/g);
        temp = '';
        for (var i in parts) {
            if (i == 0 || i == parts.length-1) {
                if (parts[i].length > 10)
                    parts[i] = parts[i].substring(0, 5);
            } else if (parts[i].length > 4) {
                parts[i] = parts[i].substring(0, 2) + '.';
            }
            temp += parts[i] + ' ';
        }
    }
    tr.append($("<td>{0}</td>".format(temp)));
    temp = item.school;
    if (temp && temp.indexOf("(") > -1)
        temp = temp.substring(temp.indexOf('(')+1, temp.indexOf(')'));
    tr.append($("<td>{0}</td>".format(temp)));
    tr.append($("<td>{0}</td>".format(item.major)));
    tr.append($("<td><a href='{0}'>主页</a></td>".format(item.link)));
    if (item.website)
        tr.append($("<td><a href='{0}'>个人页</a></td>".format(item.website)));
    else {
        tr.append($("<td></td>"));
        
    }
    var td = $("<td></td>").append(select)
    tr.append(td);
    temp = item.position;
    if (temp) temp = "在招";
    else temp = "";
    tr.append($("<td>{0}</td>".format(temp)));
    tr.append($("<td>{0}</td>".format(item.term || "")));

    return tr;
}

function getProfessorByInterests() {
    var major = parseInt($("#majorName").val()),
        interests = $("#researchName").val();
    $.ajax({
        type: "get",//请求方式  
        url: "getProfessorByInterests/" + major + "/" + interests,//发送请求地址  
        timeout: 30000,//超时时间：30秒
        dataType: "json",//设置返回数据的格式
        success: function(data) {  
            var info = data.error;
            if (data.error) {
                alert(data.error);
                return;
            }
            collegeList = data.list;
            filterList = data.list;
            pageIt(data.list, "research", 0);
        }
    });
}

function getMajorInterestsList() {
    var major = parseInt($("#majorName").val());
    $.ajax({
        type: "get",//请求方式  
        url: "getMajorInterestsList/" + major,//发送请求地址  
        timeout: 30000,//超时时间：30秒
        dataType: "json",//设置返回数据的格式
        success: function(data) {  
            var info = data.error;
            if (data.error) {
                alert(data.error);
                return;
            }
            
            $("#researchName").html("<option value=''>不限</option>");
            for (var i in data.list) {
                if (data.list[i].zh) 
                    $("#researchName").append('<option value="{0}">{1}</option>'.format(
                        data.list[i].name, data.list[i].zh));
                else
                    $("#researchName").append('<option value="{0}">{1}</option>'.format(
                        data.list[i].name, data.list[i].name));
            }
        }
    })
}

function getProcess() {  
    //使用JQuery从后台获取JSON格式的数据  
    $.ajax({  
        type: "post",//请求方式  
        url: "getResearchProgress",//发送请求地址  
        timeout: 30000,//超时时间：30秒
        dataType: "json",//设置返回数据的格式  
        //请求成功后的回调函数 data为json格式  
        success:function(data){  
            var info = data.info, total = info.split(",")[0], now = info.split(',')[1];
            console.log(info);
            if (total == now) {
                window.clearInterval(timerId);
                $("#loadingDiv").remove();
                return;
            }
            $("#loadingDiv").remove();
            var loadingDiv = createLoadingDiv('总共{0}位可能学者，正在爬取第{0}位'.format(total, now))                    
            //呈现loading效果
            $(".container-fluid").append(loadingDiv);
        },  
        //请求出错的处理  
        error:function(){  
            window.clearInterval(timerId);  
            alert("请求出错");  
        }  
    });  
}  
