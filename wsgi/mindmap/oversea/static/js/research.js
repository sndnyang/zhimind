var timerId;

function filterProfessors(col, value) {
    var newList = [];
    for (var i in filterList) {
        if (!value) {
            newList.push(filterList[i]);
            continue;
        }
        if (col in filterList[i] && filterList[i][col].toLowerCase().indexOf(value) > -1) {
            newList.push(filterList[i]);
        }
    }
    pageIt(newList, "research", 0);
}

function filterProfessorByPosition() {
    var value = $("#positionName").val();

    var newList = [];
    for (var i in filterList) {
        if (!value) {
            newList.push(filterList[i]);
            continue;
        }
        if (filterList[i].position == true) {
            if (value == "always") {
                if (filterList[i].term == "always")
                    newList.push(filterList[i]);
            } else {
                newList.push(filterList[i]);
            }
        }
    }
    pageIt(newList, "research", 0);
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

function getProfessorsList(col) {
    var major = parseInt($("#majorName").val()),
        interest = $("#researchName").val(),
        college = $("#collegeName").val(),
        position = $("#positionName").val();
    if (col == 'position' && !position) {
        filterProfessorByPosition();
        return;
    }
    if (col == 'interest' && !interest) {
        filterProfessors('school', '');
        return;
    }
    if (major == '0') {
        alert("起码先选择专业");
        return;
    }
    if (!college) {
        college = 0;
    }
    var data = {'tag': interest, 'position': position};

    $.ajax({
        type: "post",//请求方式  
        url: "getProfessorsList/{0}/{1}".format(college, major),
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(data),
        success: function(data) {  
            var info = data.error;
            if (data.error) {
                alert(data.error);
                return;
            }
            filterList = data.list;
            pageIt(data.list, "research", 0);
        }
    });
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
            filterList = data.list;
            pageIt(data.list, "research", 0);
        }
    });
}

function interests_modify(obj, val) {
    var data = {}, tr = $(obj).parent().parent(),
            name = $(tr.children("td")[0]).html();
    if (val == 1) {
        // 删除
        data = {'name': name, 'type': 1};
    } else {
        var zh = $($(tr.children("td")[1]).children("input")).val(),
            category = $($(tr.children("td")[2]).children("input")).val();
        data = {'name': name, 'zh': zh, 'category': category, 'type': 0};
    }
    console.log(data);
    $.ajax({
        method: "post",
        url : 'modifyInterests',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(data),
        success : function (result){
            var data = result;
            if (data.error) {
                alert(data.error);
                return;
            }
            alert('success');
            if (val == 1) {
                tr.remove();
            }
        }
    });   
}
function getMajorInterestsList() {
    var major = parseInt($("#majorName").val());
    if (major == 0) {
        $("#researchName").html("<option value=''>不限</option>");
        return;
    }
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
            if (document.URL.indexOf("interests.html") > 0) {
                var category = [];
                for (var i in data.list) {
                    if (!data.list[i].category_name) {
                        category.push(data.list[i].name);
                    }
                }
                console.log(data.list);
                for (var i in data.list) {
                    var tr = $("<tr></tr>");

                    tr.append($("<td>{0}</td>".format(data.list[i].name)));
                    tr.append($("<td><input type='text' value='{0}' class='form-control'/></td>".format(data.list[i].zh || '')));
                    tr.append($("<td><input type='text' value='{0}' class='form-control'/></td>".format(data.list[i].category_name || '')));
                    var pass = $('<td><a href="javascript:void(0);" onclick="interests_modify(this, 0)" class="btn btn-success">更新</a></td>');
                    var del = $('<td><a href="javascript:void(0);" onclick="interests_modify(this, 1)" class="btn btn-danger">删除</a></td>');
                    tr.append(pass);
                    tr.append(del);
                    $("#collegeList").append(tr);
                }
            } else {
                for (var i in data.list) {
                
                    if (data.list[i].zh) 
                        $("#researchName").append('<option value="{0}">{1}</option>'.format(
                            data.list[i].name, data.list[i].zh));
                    else
                        $("#researchName").append('<option value="{0}">{1}</option>'.format(
                            data.list[i].name, data.list[i].name));
                }

            }
        }
    })
}

function getProcess() {
    var url = $("#directoryUrl").val()
    //使用JQuery从后台获取JSON格式的数据
    $.ajax({  
        type: "post",//请求方式  
        url: "getResearchProgress",//发送请求地址  
        timeout: 30000,//超时时间：30秒
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({"url": url}),
        //请求成功后的回调函数 data为json格式  
        success:function(data){
            if (data.error) {
                window.clearInterval(timerId);
                alert(data.error);
                return;
            }
            var info = data.info, total = info.split(",")[0], now = info.split(',')[1];
            console.log(info);
            if (total == now) {
                window.clearInterval(timerId);
                // $("#loadingDiv").remove();
                return;
            }
            $("#loadingDiv").remove();
            var loadingDiv = createLoadingDiv('总共{0}位可能学者，正在爬取第{0}位'.format(total, now))                    
            //呈现loading效果
            $(".container-fluid").append(loadingDiv);
        },  
        //请求出错的处理  
        error: function(){  
            window.clearInterval(timerId);
            alert("请求出错");  
        }
    });  
}

function showKeyWords() {
    
}

function showCrawlerResult(data, step) {
    var list = data.list, table = $("<table class='table table-striped'></table>");
    console.log(data.list);
    if (step == "1") {
        var show_tags = ['该URL不可能是教员', '该名字可能是教授个人主页', '该URL可能是教员']
        $("keyWords").html("<p>爬虫抽取信息关键词(以逗号,隔开， 正则表达式匹配):</p>");
        console.log(data.keywords);
        var json = data.keywords;
        for (var e in json) {
            var flag = false;
            if (e == "frameset_pass") continue;
            for (var i in show_tags) {
                if (show_tags[i] == e) {
                    flag = true;
                    break;
                }
            }
            if (flag == false) continue;
            var group = $('<div class="input-group input-group-sm"></div>');
            var span = $("<span class='input-group-addon'>{0}: </span>".format(e));
            var input = '<input type="url" name="{0}" value="{1}" class="form-control">'.format(e, json[e]);
            group.append(span);
            group.append(input);
            $("#keyWords").append(group);
        }
    }
    for (var i in list) {
        var tr = $("<tr></tr>"), td = $("<td></td>"), toggle = null;
        if (step == "1") {
            var url = list[i].split("|")[0], name = list[i].split("|")[1];
            td.append("<span>链接URL为：</span>");
            td.append('<a href="{0}" target="_blank">{1}</a>'.format(url, url));
            tr.append(td);
            tr.append("<td>链接名字显示为：{0}</td>".format(name));
        } else if (step == '2') {
            tr = fillResearchInformation(list[i]);
            var expand = $('<a data-toggle="collapse" aria-expanded="false" class="False collapsed btn btn-success" href="#collapse{0}" aria-controls="collapse{1}">展开</a>'.format(i, i));
            tr.append(expand);
            toggle = $('<div class="panel-collapse collapse" data-expanded="false" role="tabpanel" id="collapse{0}" aria-labelledby="heading{1}" aria-expanded="false" style="height: 0px;"></div>'.format(i, i));
            toggle = fillItemInfo(toggle, item)
        }
        table.append(tr);
        if (toggle) {
            table.append(toggle);
        }
    }
    $("#crawlResult").append(table);
}

