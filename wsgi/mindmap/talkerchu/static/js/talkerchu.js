var serverData = [];
var limit = localStorage.getItem("limit") || 20;
var currentBook = localStorage.getItem("talkbook");
var currentName = localStorage.getItem("bookname");
var currentChapter = localStorage.getItem("chapter");
var myBooks = JSON.parse(localStorage.getItem("talkBooks")) || {};

function showBook(bookname, book, isChapter) {
    var num = book.num, link = book.link, name = book.name,
        newBook = $("<div class='col-xs-12 col-sm-4 col-md-3'></div>"),
        a = $("<a onclick=chooseChapter(this,'{0}','{1}')></a>".format(bookname, book.link)),
        img = $("<img alt='{0}'>".format(name)),
        bookinfo = $("<div></div>");

    if (!isChapter) {
        a = $("<a onclick=chooseBook(this,'{0}','{1}','{2}')></a>".format(name, book.link, book.num));
    }
    a.attr("id", name);
    a.attr("href", 'javascript:void(0)'); 
    a.attr("class", 'thumbnail storedBook'); 
    img.attr("class" , "bookcover");
    bookinfo.attr("class" , "bookinfo");

    a.append(img);

    if (isChapter) {
        bookinfo.append($("<p>{0}</p>".format(bookname)));
        bookinfo.append($("<p>{0}</p>".format(name)));
    }
    bookinfo.append($("<p>{0}</p>".format(link)));
    bookinfo.append($("<p>{0}</p>".format("行数" + num)));

    a.append(bookinfo);
    newBook.append(a)

    return newBook;
}

function chooseBook(obj, name, link, num) {
    currentBook = name;
    localStorage.setItem("talkbook", name);
    $.ajax({
        method: "get",
        url : "/talkerchu/catalog/"+link,
        contentType: 'application/json',
        dataType: "json",
        success : function (data){
            $("#myBooks2").html("");
            myBooks[name] = {'num': num, 'link': link, 'name': name};
            localStorage.setItem('talkBooks', JSON.stringify(myBooks));
            
            for (var i in data) {
                $("#myBooks2").append(showBook(link, data[i], true));
            }
            switchTab("#myBooks");
            $("#myTab").children('li').children('a[href=#myBooks]').show();
        }
    });
}

function chooseChapter(obj, name, no) {
    currentChapter = no;
    currentName = name;
    localStorage.setItem("chapter", no);
    localStorage.setItem("bookname", name);
    $("#currentBook").html("当前选择书: " + currentBook);
    $("#currentChapter").html("当前章节: " + no);
    switchTab("#recite");
}

function downloadChapter(name, no) {
    var xhr = new XMLHttpRequest();
    name = "http://7xt8es.com1.z0.glb.clouddn.com/naodong/talkerchu/{0}/{1}.txt".format(name, no);
    xhr.open('GET', name+"?v="+Math.round(Math.random()*10000), true);

    xhr.onload = function(e) {
        var text = xhr.response;
        if (!text || typeof(text) == "undefined") return;
        generateContent(text);
    };
    xhr.send();
}

function keepUp() {
    $.ajax({
        method: "get",
        url : "/talkerchu/getEpisode/{0}/{1}".format(currentName, currentChapter),
        contentType: 'application/json',
        dataType: "json",
        success : function (data){
            serverData = data;
            // console.log(serverData);
            start();
        }
    });
}

function sortNumber(a,b) {
    return a - b;
}

function masterSentence(obj, no) {
    if (serverData.indexOf(no) == -1)
        serverData.push(no);
    serverData.sort(sortNumber);
    $.ajax({
        method: "post",
        url : "/talkerchu/putEpisode",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'data': serverData, 'book': currentName,
            'no': currentChapter}),
        success : function (data){
            if ('error' in data) {
                alert(data.error);
            }
            $(obj).parent().hide();
        }
    });
}
function start() {
    downloadChapter(currentName, currentChapter);
    $("#recite").attr("class", "tab-pane fade");
    $("#learning").attr("class", "tab-pane fade in active");
}

function pageTemplate(lines, pagination) {
    var list = [], base = pagination.pageSize * (pagination.pageNumber-1);
    for (var i = 0; i < lines.length/2; i++) {
        if (lines[2*i].trim() == "" || !lines[2*i].startsWith('LineNo:')) continue;
        var no = parseInt(i) + parseInt(base),
            parts = lines[2*i].split("\t"), lineNo = parseInt(parts[0].split(':')[1]),
            sentenceDiv = $("<div></div>"), p = $("<h4></h4>"),
            sentence = parts[1], segs = parts[2].split(" "),
            div = $("<div class='col-md-10 col-md-offset-1 form-group'></div>"),
            checkButton = $("<a type='button' onclick='compareSentence(this)'>验证</a>"),
            markButton = $("<a type='button' onclick='masterSentence(this,"+lineNo+")'>已掌握</a>");

        checkButton.attr("href", 'javascript:void(0)'); 
        checkButton.attr("class", 'btn btn-info'); 
        markButton.attr("href", 'javascript:void(0)'); 
        markButton.attr("class", 'btn btn-primary'); 

        p.append($("<span>"+sentence+"</span>"));
        for (var j in segs) {
            p.append("<span class='seg'>" + segs[j] + "</span>");
        }
        sentenceDiv.append(p);
        div.append(sentenceDiv);
        div.append($("<input type='text' class='form-control box' placeholder='输入英文，回车验证，tab跳转下一输入框' tabindex='{0}'>".format(i+1)));
        div.append(checkButton);
        div.append(markButton);
        div.append($("<div class='origin'>"+lines[2*i+1]+"</div>"));
        div.append($("<div class='compare'></div>"));
        list.push(div);
    }
    return list;
}

function generateContent(text) {
    var lines = text.split('\n'), filter_lines = [];
    for (var i = 0; i < lines.length/2; i++) {
        if (serverData.indexOf(i+1) > -1) {
            continue;
        }
        var line = lines[2*i+1].trim();
        if (!line.startsWith("LineNo:")) {
            filter_lines.push("LineNo:{0}\t{1}".format(i+1, line));
        }
        filter_lines.push(lines[2*i+2]);
    }
    
    $("#list").html("");
    $("#list").append("<p>{0}</p>".format(lines[0]));

    $('#pagination-container').pagination({
        dataSource: filter_lines,
        callback: function(data, pagination) {
            $("#list").html("");
            $("#list").append("<p>{0}</p>".format(lines[0]));
            var items = pageTemplate(data, pagination);
            for (var i in items) {
                $("#list").append(items[i]);
            }
        },
    });

}

function findCorrect(l1, l2) {
    // 先用求交集的方法，肯定有更好的
    // 但也不一定需要
    var parts = [];
    for (var i in l1) {
        var w1 = l1[i].toLowerCase();
        if (l2.indexOf(w1) > -1 || l2.indexOf(l1[i]) > -1) {
            parts.push(w1);
        }
    }
    return parts;
}

function compareSentence(obj) {
    var input = $(obj).parent().children("input"),
        origin = $(obj).parent().children("div.origin"),
        cmp_div = $(obj).parent().children("div.compare"),
        user_inputs = input.val().match(/(\w|')+/g),
        origin_sets = origin.html().match(/(\w|')+/g);
    cmp_div.html("");

    var origin_line = $("<h4>原版: </h4>"),
        user_line = $("<h4>输入: </h4>"),
        parts = findCorrect(origin_sets, user_inputs);
    // console.log(parts);

    if (parts.length * 2 < origin_sets.length) {
        // 肯定有更好的方法及别的提示
        cmp_div.html($("<span>用户输入错误太高， 请再试</span>"));
        return;
    }

    for (var i in origin_sets) {
        var span = $("<span>{0}</span>".format(origin_sets[i]));
        if (parts.indexOf(origin_sets[i].toLowerCase())>-1 ||
                parts.indexOf(origin_sets[i]) > -1) {
            span.attr("class", 'samePart'); 
        }
        origin_line.append(span);
        origin_line.append($("<span> </span>"));
    }
    for (var i in user_inputs) {
        var span = $("<span>{0}</span>".format(user_inputs[i]));
        if (parts.indexOf(user_inputs[i].toLowerCase())>-1 ||
                parts.indexOf(user_inputs[i]) > -1) {
            span.attr("class", 'samePart'); 
        }
        user_line.append(span);
        user_line.append($("<span> </span>"));
    }
    cmp_div.append(origin_line);
    cmp_div.append(user_line);
}

$(document).ready(function(){
    if (!currentBook || currentBook === "") {
        $("#currentBook").html('未选择学习章节，请先选择');
    } else {
        $("#currentBook").html("当前选择书: " + currentBook);
        $("#currentChapter").html("当前章节: " + currentChapter);
    }

    $(document).keydown(function (event) {
        if ($("input").is(":focus")) {
            if (event.keyCode == 13) {
                // 输入句子后回车
                compareSentence($("input:focus")[0]);
            }
        }
    });

    function updateSetting() {
     // limit = $("#unitNum").val() || 20;
     // mode = $("#unitMode").val() || "en-zh";
     // localStorage.setItem("limit", limit);
     // localStorage.setItem("mode", mode);
     // unit = [];
     // switchTab("#recite");
     // animate();
    }

    $(".unitNum").click(updateSetting);
});

function switchTab(next) {
    $("#myTab").children('li.active').removeClass('active');
    var temp = "#remember#recall".indexOf(next) > -1 ? "#recite":next;
    $("#myTab").children('li').children('a[href='+temp+']').parent().addClass('active');
    $("#myTabContent").children('div.active').removeClass('active');
    $(next).attr("class", "tab-pane fade in active");
}



